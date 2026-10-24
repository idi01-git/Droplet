import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { realtimeService } from './realtimeService';
import { storageService } from './storageService';
import { DROPLET_LIMITS } from '../../../shared/limits';
import { AppError } from '../middleware/errorHandler';
import { isValidSafeUrl, sanitizeFilename } from '../utils/sanitizer';
import { Item, ItemType, RoomSession } from '../../../shared/types';

export class ItemService {
  /**
   * Create and broadcast a text, link, or snippet item.
   */
  public static async createTextItem(
    roomId: string,
    session: RoomSession,
    text: string,
    requestedType?: 'text' | 'link'
  ): Promise<Item> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new AppError('INVALID_PAYLOAD', 'Text content cannot be empty.', 400);
    }

    // Enforce 100 KiB maximum size
    const byteLength = Buffer.byteLength(trimmed, 'utf8');
    if (byteLength > DROPLET_LIMITS.MAX_TEXT_SIZE_BYTES) {
      throw new AppError(
        'INVALID_PAYLOAD',
        `Text item exceeds maximum permitted size of 100 KiB (received ${(byteLength / 1024).toFixed(1)} KiB).`,
        400
      );
    }

    // Reject explicitly forbidden schemes (javascript:, data:, file:, vbscript:)
    const lower = trimmed.toLowerCase();
    for (const scheme of DROPLET_LIMITS.DISALLOWED_URL_SCHEMES) {
      if (lower.startsWith(scheme)) {
        throw new AppError(
          'INVALID_PAYLOAD',
          `Dangerous scheme "${scheme}" is forbidden.`,
          400
        );
      }
    }

    // Determine type & validate safety
    let finalType: ItemType = 'text';

    // Check if it's a link
    const isUrl = /^https?:\/\//i.test(trimmed) || requestedType === 'link';
    if (isUrl) {
      if (!isValidSafeUrl(trimmed)) {
        throw new AppError(
          'INVALID_PAYLOAD',
          'Dangerous URL schemes (javascript:, data:, file:) are forbidden.',
          400
        );
      }
      finalType = 'link';
    }

    const db = getDb();
    const itemId = uuidv4();
    const now = Date.now();

    // Insert item and update room activity in an atomic transaction
    await db.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO items (
          id, room_id, session_id, type, text_content, 
          filename, size_bytes, mime_type, created_at
        ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
        [
          itemId,
          roomId,
          session.id,
          finalType,
          trimmed,
          byteLength,
          finalType === 'link' ? 'text/uri-list' : 'text/plain',
          now,
        ]
      );

      await tx.run(`UPDATE rooms SET last_activity_at = ? WHERE id = ?`, [now, roomId]);
    });

    const createdItem: Item = {
      id: itemId,
      roomId,
      type: finalType,
      textContent: trimmed,
      sizeBytes: byteLength,
      mimeType: finalType === 'link' ? 'text/uri-list' : 'text/plain',
      createdAt: now,
    };

    // Broadcast in real time to connected devices in the room with author session ID
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
   * Authorize and stream an uploaded file.
   */
  public static async getFileDownload(
    roomId: string,
    itemId: string,
    _session: RoomSession
  ): Promise<{ stream: any; filename: string; mimeType: string; sizeBytes: number }> {
    const db = getDb();

    const item = await db.get<{
      id: string;
      roomId: string;
      objectKey: string;
      filename: string;
      sizeBytes: number;
      mimeType: string;
      type: string;
    }>(
      `SELECT id, room_id as roomId, object_key as objectKey, filename, size_bytes as sizeBytes, mime_type as mimeType, type 
       FROM items 
       WHERE id = ? AND room_id = ? AND type = 'file'`,
      [itemId, roomId]
    );

    if (!item) {
      throw new AppError('INVALID_PAYLOAD', 'File not found in this room.', 404);
    }

    const exists = await storageService.exists(item.objectKey);
    if (!exists) {
      throw new AppError('UPLOAD_FAILED', 'File content is unavailable or has been purged.', 404);
    }

    const stream = await storageService.getStream(item.objectKey);
    const safeFilename = sanitizeFilename(item.filename || 'download');

    return {
      stream,
      filename: safeFilename,
      mimeType: item.mimeType || 'application/octet-stream',
      sizeBytes: item.sizeBytes,
    };
  }

  /**
   * Get an authorized short-lived pre-signed download URL (60s TTL).
   * Direct from AWS S3 (zero server RAM or bandwidth consumed).
   */
  public static async getFileDownloadUrl(
    roomId: string,
    itemId: string,
    _session: RoomSession
  ): Promise<{ url: string; isDirect: boolean; filename: string; sizeBytes: number; mimeType: string }> {
    const db = getDb();

    const item = await db.get<{
      id: string;
      roomId: string;
      objectKey: string;
      filename: string;
      sizeBytes: number;
      mimeType: string;
      type: string;
    }>(
      `SELECT id, room_id as roomId, object_key as objectKey, filename, size_bytes as sizeBytes, mime_type as mimeType, type 
       FROM items 
       WHERE id = ? AND room_id = ? AND type = 'file'`,
      [itemId, roomId]
    );

    if (!item) {
      throw new AppError('INVALID_PAYLOAD', 'File not found in this room.', 404);
    }

    const safeFilename = sanitizeFilename(item.filename || 'download');

    if (item.objectKey) {
      const presigned = await storageService.getPresignedDownloadUrl(
        item.objectKey,
        safeFilename,
        DROPLET_LIMITS.S3_PRESIGNED_DOWNLOAD_TTL_SECONDS
      );
      if (presigned) {
        return {
          url: presigned,
          isDirect: true,
          filename: safeFilename,
          sizeBytes: item.sizeBytes,
          mimeType: item.mimeType || 'application/octet-stream',
        };
      }
    }

    return {
      url: `/api/rooms/${roomId}/items/${itemId}/download`,
      isDirect: false,
      filename: safeFilename,
      sizeBytes: item.sizeBytes,
      mimeType: item.mimeType || 'application/octet-stream',
    };
  }

  /**
   * Delete an item (authorized for author or room owner).
   */
  public static async deleteItem(roomId: string, itemId: string, session: RoomSession): Promise<void> {
    const db = getDb();
    const now = Date.now();

    const item = await db.get<{
      id: string;
      roomId: string;
      sessionId: string;
      type: ItemType;
      objectKey?: string;
      sizeBytes: number;
    }>(
      `SELECT id, room_id as roomId, session_id as sessionId, type, object_key as objectKey, size_bytes as sizeBytes 
       FROM items 
       WHERE id = ? AND room_id = ?`,
      [itemId, roomId]
    );

    if (!item) {
      throw new AppError('INVALID_PAYLOAD', 'Item not found in this room.', 404);
    }

    // Verify permission: must be author or room owner
    const isAuthor = item.sessionId === session.id;
    const isOwner = session.role === 'owner';

    if (!isAuthor && !isOwner) {
      throw new AppError('FORBIDDEN', 'Only the author or room owner can delete this item.', 403);
    }

    // If it's a file, delete from physical storage
    if (item.type === 'file' && item.objectKey) {
      try {
        await storageService.delete(item.objectKey);
      } catch (err) {
        console.error('Failed to delete physical file from storage', err);
      }
    }

    // Atomic database update
    await db.transaction(async (tx) => {
      await tx.run(`DELETE FROM items WHERE id = ?`, [itemId]);

      if (item.type === 'file') {
        await tx.run(
          `UPDATE rooms 
           SET used_bytes = MAX(0, used_bytes - ?), 
               file_count = MAX(0, file_count - 1), 
               last_activity_at = ? 
           WHERE id = ?`,
          [item.sizeBytes, now, roomId]
        );
      }
    });

    // Broadcast deletion in real time
    realtimeService.broadcastToRoom(roomId, {
      type: 'ITEM_DELETED',
      roomId,
      timestamp: now,
      payload: { itemId },
    });
  }
}
