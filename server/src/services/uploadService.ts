import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
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
  public static initiateUpload(
    roomId: string,
    session: RoomSession,
    _filename: string,
    expectedBytes: number,
    _mimeType?: string
  ): { uploadId: string; maxBytes: number; uploadUrl: string } {
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

    const db = getDatabase();
    const now = Date.now();
    const uploadId = uuidv4();
    const reservationExpiry = now + DROPLET_LIMITS.UPLOAD_RESERVATION_TIMEOUT_MS;

    const reserveTransaction = db.transaction(() => {
      // 1. Lock and read room state
      const room = db
        .prepare(
          `SELECT id, used_bytes as usedBytes, reserved_bytes as reservedBytes, file_count as fileCount, status, expires_at as expiresAt
           FROM rooms 
           WHERE id = ?`
        )
        .get(roomId) as { id: string; usedBytes: number; reservedBytes: number; fileCount: number; status: string; expiresAt: number } | undefined;

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
      const activeReservations = db
        .prepare(
          `SELECT COUNT(*) as count 
           FROM upload_reservations 
           WHERE room_id = ? AND status = 'pending' AND expires_at > ?`
        )
        .get(roomId, now) as { count: number };

      if (activeReservations.count >= DROPLET_LIMITS.MAX_CONCURRENT_UPLOADS_PER_ROOM) {
        throw new AppError(
          'ROOM_QUOTA_EXCEEDED',
          `Maximum concurrent uploads (${DROPLET_LIMITS.MAX_CONCURRENT_UPLOADS_PER_ROOM}) active for this room. Please wait.`,
          429
        );
      }

      // 5. Enforce global storage circuit breaker
      const globalStorage = db
        .prepare(
          `SELECT COALESCE(SUM(used_bytes + reserved_bytes), 0) as totalBytes 
           FROM rooms 
           WHERE status = 'active'`
        )
        .get() as { totalBytes: number };

      if (globalStorage.totalBytes + expectedBytes > DROPLET_LIMITS.GLOBAL_STORAGE_CIRCUIT_BREAKER_BYTES) {
        throw new AppError(
          'GLOBAL_CAPACITY_REACHED',
          'System-wide capacity threshold reached. Please try again later.',
          503
        );
      }

      // 6. Record reservation
      db.prepare(
        `INSERT INTO upload_reservations (
          id, room_id, session_id, expected_bytes, created_at, expires_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending')`
      ).run(uploadId, roomId, session.id, expectedBytes, now, reservationExpiry);

      // 7. Atomically allocate reserved capacity in room
      db.prepare(
        `UPDATE rooms 
         SET reserved_bytes = reserved_bytes + ?, last_activity_at = ? 
         WHERE id = ?`
      ).run(expectedBytes, now, roomId);
    });

    reserveTransaction();

    return {
      uploadId,
      maxBytes: expectedBytes,
      uploadUrl: `/api/rooms/${roomId}/uploads/${uploadId}/complete`,
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
    const db = getDatabase();
    const now = Date.now();
    const actualBytes = fileBuffer.length;

    // 1. Fetch pending reservation
    const reservation = db
      .prepare(
        `SELECT id, room_id as roomId, session_id as sessionId, expected_bytes as expectedBytes, expires_at as expiresAt, status
         FROM upload_reservations 
         WHERE id = ? AND room_id = ?`
      )
      .get(uploadId, roomId) as UploadReservation | undefined;

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
      this.cancelReservation(uploadId, roomId, reservation.expectedBytes);
      throw new AppError(
        'FILE_TOO_LARGE',
        `Uploaded file size (${(actualBytes / (1024 * 1024)).toFixed(1)} MiB) exceeded reserved budget.`,
        400
      );
    }

    // 3. Save file to storage driver under opaque key (tagged by size for hybrid storage)
    const objectKey = storageService.generateOpaqueKey(actualBytes);
    try {
      await storageService.save(objectKey, fileBuffer);
    } catch (err) {
      this.cancelReservation(uploadId, roomId, reservation.expectedBytes);
      throw new AppError('UPLOAD_FAILED', 'Failed to store file bytes. Storage error.', 500);
    }

    const cleanFilename = sanitizeFilename(originalFilename);
    const itemId = uuidv4();

    // 4. Commit actual usage to database atomically
    const commitTx = db.transaction(() => {
      // Insert item
      db.prepare(
        `INSERT INTO items (
          id, room_id, session_id, type, text_content, 
          object_key, filename, size_bytes, mime_type, created_at
        ) VALUES (?, ?, ?, 'file', NULL, ?, ?, ?, ?, ?)`
      ).run(
        itemId,
        roomId,
        session.id,
        objectKey,
        cleanFilename,
        actualBytes,
        mimeType || 'application/octet-stream',
        now
      );

      // Commit room usage: increase used, decrease reserved, increment file count
      db.prepare(
        `UPDATE rooms 
         SET used_bytes = used_bytes + ?, 
             reserved_bytes = MAX(0, reserved_bytes - ?), 
             file_count = file_count + 1, 
             last_activity_at = ? 
         WHERE id = ?`
      ).run(actualBytes, reservation.expectedBytes, now, roomId);

      // Mark reservation completed
      db.prepare(`UPDATE upload_reservations SET status = 'completed' WHERE id = ?`).run(uploadId);
    });

    commitTx();

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

    // Broadcast new file to room in real time
    realtimeService.broadcastToRoom(roomId, {
      type: 'ITEM_ADDED',
      roomId,
      timestamp: now,
      payload: { item: createdItem },
    });

    return createdItem;
  }

  /**
   * Cancel and release a pending reservation.
   */
  public static cancelReservation(uploadId: string, roomId: string, expectedBytes: number): void {
    const db = getDatabase();
    const cancelTx = db.transaction(() => {
      db.prepare(`UPDATE upload_reservations SET status = 'cancelled' WHERE id = ?`).run(uploadId);
      db.prepare(
        `UPDATE rooms 
         SET reserved_bytes = MAX(0, reserved_bytes - ?) 
         WHERE id = ?`
      ).run(expectedBytes, roomId);
    });
    cancelTx();
  }

  /**
   * Background cleanup of expired/timed-out reservations.
   */
  public static cleanupStaleReservations(): number {
    const db = getDatabase();
    const now = Date.now();

    const staleReservations = db
      .prepare(
        `SELECT id, room_id as roomId, expected_bytes as expectedBytes 
         FROM upload_reservations 
         WHERE status = 'pending' AND expires_at < ?`
      )
      .all(now) as { id: string; roomId: string; expectedBytes: number }[];

    if (staleReservations.length === 0) return 0;

    const cleanupTx = db.transaction(() => {
      for (const res of staleReservations) {
        db.prepare(`UPDATE upload_reservations SET status = 'timed_out' WHERE id = ?`).run(res.id);
        db.prepare(
          `UPDATE rooms 
           SET reserved_bytes = MAX(0, reserved_bytes - ?) 
           WHERE id = ?`
        ).run(res.expectedBytes, res.roomId);
      }
    });

    cleanupTx();
    return staleReservations.length;
  }
}
