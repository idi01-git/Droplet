import JSZip from 'jszip';
import { getDb } from '../db/database';
import { storageService } from './storageService';
import { DROPLET_LIMITS } from '../../../shared/limits';
import { AppError } from '../middleware/errorHandler';
import { sanitizeFilename } from '../utils/sanitizer';
import { Item, Room, RoomSession } from '../../../shared/types';

export class ArchiveService {
  /**
   * Generate a bounded ZIP archive containing all room files and shared notes.
   * Spec Section 4.5: Bounded Download All (.zip) up to 50 MiB with safe archive paths and room-notes.txt.
   */
  public static async createRoomZip(
    roomId: string,
    _session: RoomSession
  ): Promise<{ buffer: Buffer; filename: string; totalBytes: number }> {
    const db = getDb();
    const now = Date.now();

    // 1. Fetch room
    const room = await db.get<Room>(
      `SELECT id, created_at as createdAt, expires_at as expiresAt, status, used_bytes as usedBytes 
       FROM rooms 
       WHERE id = ?`,
      [roomId]
    );

    if (!room || room.status === 'deleted') {
      throw new AppError('ROOM_NOT_FOUND', 'Room not found or has been deleted.', 404);
    }

    if (now > room.expiresAt || room.status === 'expired') {
      throw new AppError('ROOM_EXPIRED', 'Room has expired.', 410);
    }

    // 2. Fetch all room items
    const items = await db.all<Item & { objectKey?: string }>(
      `SELECT id, room_id as roomId, type, text_content as textContent, 
              object_key as objectKey, filename, size_bytes as sizeBytes, mime_type as mimeType, created_at as createdAt
       FROM items 
       WHERE room_id = ? 
       ORDER BY created_at ASC`,
      [roomId]
    );

    const fileItems = items.filter((i) => i.type === 'file');
    const textItems = items.filter((i) => i.type === 'text' || i.type === 'link');

    // 3. Enforce 200 MiB total archive budget
    const totalFileBytes = fileItems.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
    if (totalFileBytes > DROPLET_LIMITS.MAX_ZIP_BUDGET_BYTES) {
      throw new AppError(
        'ARCHIVE_LIMIT_EXCEEDED',
        `Room archive size (${(totalFileBytes / (1024 * 1024)).toFixed(1)} MiB) exceeds the 200 MiB limit. Please download files individually.`,
        400
      );
    }

    const zip = new JSZip();
    const usedFilenames = new Map<string, number>();

    // 4. Add files to ZIP with sanitized, collision-free names
    for (const file of fileItems) {
      if (!file.objectKey || !(await storageService.exists(file.objectKey))) {
        continue;
      }

      const rawName = file.filename || 'download';
      const safeBase = sanitizeFilename(rawName);

      // Handle duplicate filenames in the same room
      let finalName = safeBase;
      const count = usedFilenames.get(safeBase) || 0;
      if (count > 0) {
        const ext = safeBase.includes('.') ? safeBase.slice(safeBase.lastIndexOf('.')) : '';
        const nameWithoutExt = safeBase.includes('.') ? safeBase.slice(0, safeBase.lastIndexOf('.')) : safeBase;
        finalName = `${nameWithoutExt} (${count})${ext}`;
      }
      usedFilenames.set(safeBase, count + 1);

      // Read file buffer from storage (works seamlessly for local and S3)
      const fileBuffer = await storageService.getBuffer(file.objectKey);
      zip.file(finalName, fileBuffer);
    }

    // 5. Add room-notes.txt compiling all text notes and links
    if (textItems.length > 0) {
      let notesContent = `========================================================================\n`;
      notesContent += `DROPLET - ROOM NOTES\n`;
      notesContent += `Exported: ${new Date().toISOString()}\n`;
      notesContent += `========================================================================\n\n`;

      textItems.forEach((item, index) => {
        const dateStr = new Date(item.createdAt).toLocaleString();
        notesContent += `[${index + 1}] ${item.type.toUpperCase()} (${dateStr})\n`;
        notesContent += `${item.textContent}\n\n`;
      });

      zip.file('room-notes.txt', notesContent);
    }

    // 6. Generate compressed ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const zipFilename = `droplet-room-${roomId.slice(0, 8)}.zip`;

    return {
      buffer: zipBuffer,
      filename: zipFilename,
      totalBytes: zipBuffer.length,
    };
  }
}
