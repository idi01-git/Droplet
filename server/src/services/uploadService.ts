import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { storageService } from './storageService';
import { realtimeService } from './realtimeService';
import { DROPLET_LIMITS } from '../../../shared/limits';
import { AppError } from '../middleware/errorHandler';
import { sanitizeFilename } from '../utils/sanitizer';
import { Item, RoomSession, UploadReservation } from '../../../shared/types';

export class UploadService {
  /**
   * Phase 1: Atomically check room quotas and reserve upload capacity.
   * Spec Section 4.3: Reserve room capacity atomically before accepting concurrent uploads.
   */
  public static async initiateUpload(
    roomId: string,
    session: RoomSession,
    filename: string,
    expectedBytes: number,
    mimeType?: string
  ): Promise<{ uploadId: string; maxBytes: number; uploadUrl: string; isDirectS3?: boolean }> {
    if (!expectedBytes || expectedBytes <= 0) {
      throw new AppError('INVALID_PAYLOAD', 'File size must be greater than 0 bytes.', 400);
    }

    // Enforce 50 MiB per-file limit
    if (expectedBytes > DROPLET_LIMITS.MAX_FILE_SIZE_BYTES) {
      throw new AppError(
        'FILE_TOO_LARGE',
        `File exceeds maximum limit of 50 MiB (requested ${(expectedBytes / (1024 * 1024)).toFixed(1)} MiB).`,
        400
      );
    }

    const db = getDb();
    const now = Date.now();
    const uploadId = uuidv4();
    const reservationExpiry = now + DROPLET_LIMITS.UPLOAD_RESERVATION_TIMEOUT_MS;
    const cleanFilename = sanitizeFilename(filename || 'uploaded-file');

    // Generate opaque key and check if storage driver provides direct S3 pre-signed upload URL
    const objectKey = storageService.generateOpaqueKey(expectedBytes);
    const presignedUrl = await storageService.getPresignedUploadUrl(
      objectKey,
      mimeType,
      DROPLET_LIMITS.S3_PRESIGNED_UPLOAD_TTL_SECONDS
    );
    const isDirectS3 = Boolean(presignedUrl);

    await db.transaction(async (tx) => {
      // 1. Lock and read room state
      const room = await tx.get<{
        id: string;
        usedBytes: number;
        reservedBytes: number;
        fileCount: number;
        status: string;
        expiresAt: number;
      }>(
        `SELECT id, used_bytes as usedBytes, reserved_bytes as reservedBytes, file_count as fileCount, status, expires_at as expiresAt
         FROM rooms 
         WHERE id = ?`,
        [roomId]
      );

      if (!room || room.status !== 'active' || now > room.expiresAt) {
        throw new AppError('ROOM_EXPIRED', 'Room has expired or does not exist.', 410);
      }

      // 2. Enforce maximum 20 files per room
      if (room.fileCount >= DROPLET_LIMITS.MAX_FILES_PER_ROOM) {
        throw new AppError(
          'ROOM_QUOTA_EXCEEDED',
          `Room has reached maximum limit of ${DROPLET_LIMITS.MAX_FILES_PER_ROOM} files.`,
          400
        );
      }

      // 3. Enforce maximum 200 MiB total capacity per room
      const projectedBytes = room.usedBytes + room.reservedBytes + expectedBytes;
      if (projectedBytes > DROPLET_LIMITS.MAX_ROOM_BYTES) {
        const availableBytes = Math.max(0, DROPLET_LIMITS.MAX_ROOM_BYTES - (room.usedBytes + room.reservedBytes));
        throw new AppError(
          'ROOM_QUOTA_EXCEEDED',
          `Upload exceeds room capacity of 200 MiB. Available capacity: ${(availableBytes / (1024 * 1024)).toFixed(1)} MiB.`,
          400
        );
      }

      // 4. Enforce max 2 concurrent uploads per room
      const activeReservations = await tx.get<{ count: number }>(
        `SELECT COUNT(*) as count 
         FROM upload_reservations 
         WHERE room_id = ? AND status = 'pending' AND expires_at > ?`,
        [roomId, now]
      );

      if ((activeReservations?.count || 0) >= DROPLET_LIMITS.MAX_CONCURRENT_UPLOADS_PER_ROOM) {
        throw new AppError(
          'ROOM_QUOTA_EXCEEDED',
          `Maximum concurrent uploads (${DROPLET_LIMITS.MAX_CONCURRENT_UPLOADS_PER_ROOM}) active for this room. Please wait.`,
          429
        );
      }

      // 5. Enforce global storage circuit breaker
      const globalStorage = await tx.get<{ totalBytes: number }>(
        `SELECT COALESCE(SUM(used_bytes + reserved_bytes), 0) as totalBytes 
         FROM rooms 
         WHERE status = 'active'`
      );

      if ((globalStorage?.totalBytes || 0) + expectedBytes > DROPLET_LIMITS.GLOBAL_STORAGE_CIRCUIT_BREAKER_BYTES) {
        throw new AppError(
          'GLOBAL_CAPACITY_REACHED',
          'System-wide capacity threshold reached. Please try again later.',
          503
        );
      }

      // 6. Record reservation
      await tx.run(
        `INSERT INTO upload_reservations (
          id, room_id, session_id, expected_bytes, created_at, expires_at, status, object_key, filename, mime_type
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [uploadId, roomId, session.id, expectedBytes, now, reservationExpiry, objectKey, cleanFilename, mimeType || 'application/octet-stream']
      );

      // 7. Atomically allocate reserved capacity in room
      await tx.run(
        `UPDATE rooms 
         SET reserved_bytes = reserved_bytes + ?, last_activity_at = ? 
         WHERE id = ?`,
        [expectedBytes, now, roomId]
      );
    });

    return {
      uploadId,
      maxBytes: expectedBytes,
      uploadUrl: presignedUrl || `/api/rooms/${roomId}/uploads/${uploadId}/complete`,
      isDirectS3,
    };
  }

  /**
   * Phase 2: Verify uploaded bytes, store file privately, and commit capacity.
   */
  public static async completeUpload(
    roomId: string,
    uploadId: string,
    session: RoomSession,
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType?: string
  ): Promise<Item> {
    const db = getDb();
    const now = Date.now();
    const actualBytes = fileBuffer.length;

    // 1. Fetch pending reservation
    const reservation = await db.get<UploadReservation & { objectKey?: string }>(
      `SELECT id, room_id as roomId, session_id as sessionId, expected_bytes as expectedBytes, expires_at as expiresAt, status, object_key as objectKey
       FROM upload_reservations 
       WHERE id = ? AND room_id = ?`,
      [uploadId, roomId]
    );

    if (!reservation || reservation.status !== 'pending' || now > reservation.expiresAt) {
      throw new AppError(
        'UPLOAD_FAILED',
        'Upload reservation expired or not found. Please initiate a new upload.',
        400
      );
    }

    // 2. Verify bytes do not exceed reservation or max limits
    if (actualBytes > reservation.expectedBytes || actualBytes > DROPLET_LIMITS.MAX_FILE_SIZE_BYTES) {
      // Rollback reservation
      await this.cancelReservation(uploadId, roomId, reservation.expectedBytes);
      throw new AppError(
        'FILE_TOO_LARGE',
        `Uploaded file size (${(actualBytes / (1024 * 1024)).toFixed(1)} MiB) exceeded reserved budget.`,
        400
      );
    }

    // 3. Save file to storage driver under opaque key (tagged by size for hybrid storage)
    const objectKey = reservation.objectKey || storageService.generateOpaqueKey(actualBytes);
    try {
      await storageService.save(objectKey, fileBuffer);
    } catch (err) {
      await this.cancelReservation(uploadId, roomId, reservation.expectedBytes);
      throw new AppError('UPLOAD_FAILED', 'Failed to store file bytes. Storage error.', 500);
    }

    const cleanFilename = sanitizeFilename(originalFilename);
    const itemId = uuidv4();

    // 4. Commit actual usage to database atomically
    await db.transaction(async (tx) => {
      // Insert item
      await tx.run(
        `INSERT INTO items (
          id, room_id, session_id, type, text_content, 
          object_key, filename, size_bytes, mime_type, created_at
        ) VALUES (?, ?, ?, 'file', NULL, ?, ?, ?, ?, ?)`,
        [
          itemId,
          roomId,
          session.id,
          objectKey,
          cleanFilename,
          actualBytes,
          mimeType || 'application/octet-stream',
          now,
        ]
      );

      // Commit room usage: increase used, decrease reserved, increment file count
      await tx.run(
        `UPDATE rooms 
         SET used_bytes = used_bytes + ?, 
             reserved_bytes = MAX(0, reserved_bytes - ?), 
             file_count = file_count + 1, 
             last_activity_at = ? 
         WHERE id = ?`,
        [actualBytes, reservation.expectedBytes, now, roomId]
      );

      // Mark reservation completed
      await tx.run(`UPDATE upload_reservations SET status = 'completed' WHERE id = ?`, [uploadId]);
    });

    const createdItem: Item = {
      id: itemId,
      roomId,
      type: 'file',
      filename: cleanFilename,
      sizeBytes: actualBytes,
      mimeType: mimeType || 'application/octet-stream',
      createdAt: now,
      downloadUrl: `/api/rooms/${roomId}/items/${itemId}/download`,
    };

    // Broadcast new file to room in real time with author session ID
    realtimeService.broadcastToRoom(
      roomId,
      {
        type: 'ITEM_ADDED',
        roomId,
        timestamp: now,
        payload: { item: createdItem },
      },
      session.id
    );

    return { ...createdItem, canDelete: true };
  }

  /**
   * Phase 2 (Direct S3 Pre-signed): Confirm direct S3 upload, verify uploaded object in S3, and commit capacity.
   * Zero Node server RAM or bandwidth consumed!
   */
  public static async completeDirectUpload(
    roomId: string,
    uploadId: string,
    session: RoomSession,
    originalFilename?: string,
    mimeType?: string
  ): Promise<Item> {
    const db = getDb();
    const now = Date.now();

    // 1. Fetch pending reservation
    const reservation = await db.get<UploadReservation & { objectKey?: string; filename?: string; mimeType?: string }>(
      `SELECT id, room_id as roomId, session_id as sessionId, expected_bytes as expectedBytes, 
              expires_at as expiresAt, status, object_key as objectKey, filename, mime_type as mimeType
       FROM upload_reservations 
       WHERE id = ? AND room_id = ?`,
      [uploadId, roomId]
    );

    if (!reservation || reservation.status !== 'pending' || now > reservation.expiresAt) {
      throw new AppError(
        'UPLOAD_FAILED',
        'Upload reservation expired or not found. Please initiate a new upload.',
        400
      );
    }

    if (!reservation.objectKey) {
      throw new AppError('UPLOAD_FAILED', 'No storage key associated with this reservation.', 400);
    }

    // 2. Verify object exists in storage
    const exists = await storageService.exists(reservation.objectKey);
    if (!exists) {
      throw new AppError(
        'UPLOAD_FAILED',
        'Uploaded file not found in storage. Direct upload may have failed or timed out.',
        400
      );
    }

    // 3. Verify actual size from storage
    const actualBytes = await storageService.getSize(reservation.objectKey);
    if (actualBytes > reservation.expectedBytes || actualBytes > DROPLET_LIMITS.MAX_FILE_SIZE_BYTES) {
      await storageService.delete(reservation.objectKey);
      await this.cancelReservation(uploadId, roomId, reservation.expectedBytes);
      throw new AppError(
        'FILE_TOO_LARGE',
        `Uploaded file size (${(actualBytes / (1024 * 1024)).toFixed(1)} MiB) exceeded reserved budget.`,
        400
      );
    }

    const filename = sanitizeFilename(originalFilename || reservation.filename || 'uploaded-file');
    const finalMimeType = mimeType || reservation.mimeType || 'application/octet-stream';
    const itemId = uuidv4();

    // 4. Commit actual usage to database atomically
    await db.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO items (
          id, room_id, session_id, type, text_content, 
          object_key, filename, size_bytes, mime_type, created_at
        ) VALUES (?, ?, ?, 'file', NULL, ?, ?, ?, ?, ?)`,
        [
          itemId,
          roomId,
          session.id,
          reservation.objectKey,
          filename,
          actualBytes,
          finalMimeType,
          now,
        ]
      );

      await tx.run(
        `UPDATE rooms 
         SET used_bytes = used_bytes + ?, 
             reserved_bytes = MAX(0, reserved_bytes - ?), 
             file_count = file_count + 1, 
             last_activity_at = ? 
         WHERE id = ?`,
        [actualBytes, reservation.expectedBytes, now, roomId]
      );

      await tx.run(`UPDATE upload_reservations SET status = 'completed' WHERE id = ?`, [uploadId]);
    });

    const createdItem: Item = {
      id: itemId,
      roomId,
      type: 'file',
      filename,
      sizeBytes: actualBytes,
      mimeType: finalMimeType,
      createdAt: now,
      downloadUrl: `/api/rooms/${roomId}/items/${itemId}/download`,
    };

    realtimeService.broadcastToRoom(
      roomId,
      {
        type: 'ITEM_ADDED',
        roomId,
        timestamp: now,
        payload: { item: createdItem },
      },
      session.id
    );

    return { ...createdItem, canDelete: true };
  }

  /**
   * Cancel and release a pending reservation.
   */
  public static async cancelReservation(uploadId: string, roomId: string, expectedBytes: number): Promise<void> {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.run(`UPDATE upload_reservations SET status = 'cancelled' WHERE id = ?`, [uploadId]);
      await tx.run(
        `UPDATE rooms 
         SET reserved_bytes = MAX(0, reserved_bytes - ?) 
         WHERE id = ?`,
        [expectedBytes, roomId]
      );
    });
  }

  /**
   * Background cleanup of expired/timed-out reservations.
   */
  public static async cleanupStaleReservations(): Promise<number> {
    const db = getDb();
    const now = Date.now();

    const staleReservations = await db.all<{ id: string; roomId: string; expectedBytes: number }>(
      `SELECT id, room_id as roomId, expected_bytes as expectedBytes 
       FROM upload_reservations 
       WHERE status = 'pending' AND expires_at < ?`,
      [now]
    );

    if (staleReservations.length === 0) return 0;

    await db.transaction(async (tx) => {
      for (const res of staleReservations) {
        await tx.run(`UPDATE upload_reservations SET status = 'timed_out' WHERE id = ?`, [res.id]);
        await tx.run(
          `UPDATE rooms 
           SET reserved_bytes = MAX(0, reserved_bytes - ?) 
           WHERE id = ?`,
          [res.expectedBytes, res.roomId]
        );
      }
    });

    return staleReservations.length;
  }
}
