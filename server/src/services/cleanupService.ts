import { getDatabase } from '../db/database';
import { storageService } from './storageService';
import { realtimeService } from './realtimeService';
import { UploadService } from './uploadService';
import { unregisterCreatedRoom } from '../middleware/rateLimit';

export class CleanupService {
  private static timer: NodeJS.Timeout | null = null;

  /**
   * Run an idempotent cleanup pass to purge expired rooms, physical storage files, and abandoned reservations.
   * Spec Section 4.6: Scheduled cleanup deletes expired R2/disk objects and database rows.
   */
  public static async purgeExpiredRooms(): Promise<{
    roomsPurged: number;
    filesPurged: number;
    reservationsTimedOut: number;
  }> {
    const db = getDatabase();
    const now = Date.now();

    // 1. Reconcile stale upload reservations (> 5 minutes pending)
    const reservationsTimedOut = UploadService.cleanupStaleReservations();

    // 2. Find expired or explicitly deleted rooms
    const expiredRooms = db
      .prepare(
        `SELECT id, status 
         FROM rooms 
         WHERE expires_at <= ? OR status IN ('expired', 'deleted')`
      )
      .all(now) as { id: string; status: string }[];

    let filesPurged = 0;
    let roomsPurged = 0;

    for (const room of expiredRooms) {
      // Find all file items for this room to physically purge them from storage
      const fileItems = db
        .prepare(
          `SELECT object_key as objectKey 
           FROM items 
           WHERE room_id = ? AND type = 'file' AND object_key IS NOT NULL`
        )
        .all(room.id) as { objectKey: string }[];

      for (const item of fileItems) {
        try {
          if (storageService.exists(item.objectKey)) {
            await storageService.delete(item.objectKey);
            filesPurged++;
          }
        } catch (err) {
          console.error(`[Cleanup] Error purging physical file ${item.objectKey}:`, err);
        }
      }

      // Notify any connected clients before disconnecting (if not already deleted)
      if (room.status !== 'deleted') {
        realtimeService.broadcastToRoom(room.id, {
          type: 'ROOM_EXPIRED',
          roomId: room.id,
          timestamp: now,
          payload: { reason: 'This room has reached its 24-hour expiration.' },
        });
        realtimeService.closeRoomConnections(room.id, 'Room expired');
      }

      // Purge database row (foreign keys cascade delete items, sessions, upload_reservations)
      db.prepare(`DELETE FROM rooms WHERE id = ?`).run(room.id);
      unregisterCreatedRoom(room.id);
      roomsPurged++;
    }

    return { roomsPurged, filesPurged, reservationsTimedOut };
  }

  /**
   * Start periodic background cleanup worker.
   */
  public static startBackgroundWorker(intervalMs = 60000): void {
    if (this.timer) return;

    this.timer = setInterval(async () => {
      try {
        const stats = await this.purgeExpiredRooms();
        if (stats.roomsPurged > 0 || stats.filesPurged > 0 || stats.reservationsTimedOut > 0) {
          console.log(
            `[Cleanup Worker] Purged ${stats.roomsPurged} rooms, ${stats.filesPurged} files, reconciled ${stats.reservationsTimedOut} reservations.`
          );
        }
      } catch (err) {
        console.error('[Cleanup Worker] Error during purge:', err);
      }
    }, intervalMs);
  }

  /**
   * Stop periodic background worker.
   */
  public static stopBackgroundWorker(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
