import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { generateRoomCode, generateSessionToken, hashToken } from '../utils/crypto';
import { DROPLET_LIMITS } from '../../../shared/limits';
import { AppError } from '../middleware/errorHandler';
import { Room, RoomSummary, RoomSession, Item } from '../../../shared/types';

export class RoomService {
  /**
   * Find an active, unique 4-digit room code.
   */
  public static generateUniqueCode(): string {
    const db = getDatabase();
    const now = Date.now();

    for (let attempt = 0; attempt < 50; attempt++) {
      const code = generateRoomCode();
      const codeHash = hashToken(code);

      const existing = db
        .prepare(
          `SELECT id FROM rooms 
           WHERE code_hash = ? AND status = 'active' AND expires_at > ?`
        )
        .get(codeHash, now);

      if (!existing) {
        return code;
      }
    }

    throw new AppError(
      'GLOBAL_CAPACITY_REACHED',
      'Unable to allocate a unique room code. System is currently at peak capacity.',
      503
    );
  }

  /**
   * Create a new room with an owner session.
   */
  public static createRoom(_creatorIp?: string): { room: RoomSummary; sessionToken: string; code: string } {
    const db = getDatabase();
    const now = Date.now();
    const expiresAt = now + DROPLET_LIMITS.ROOM_LIFETIME_MS;
    const roomId = uuidv4();
    const code = this.generateUniqueCode();
    const codeHash = hashToken(code);

    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashToken(sessionToken);
    const sessionId = uuidv4();

    // Execute room & session creation in an atomic transaction
    const createTransaction = db.transaction(() => {
      // Insert room
      db.prepare(
        `INSERT INTO rooms (
          id, code, code_hash, created_at, expires_at, status, 
          owner_session_hash, used_bytes, reserved_bytes, file_count, last_activity_at
        ) VALUES (?, ?, ?, ?, ?, 'active', ?, 0, 0, 0, ?)`
      ).run(roomId, code, codeHash, now, expiresAt, sessionTokenHash, now);

      // Insert owner session
      db.prepare(
        `INSERT INTO sessions (
          id, room_id, token_hash, role, created_at, expires_at
        ) VALUES (?, ?, ?, 'owner', ?, ?)`
      ).run(sessionId, roomId, sessionTokenHash, now, expiresAt);
    });

    createTransaction();

    const roomSummary: RoomSummary = {
      id: roomId,
      code,
      createdAt: now,
      expiresAt,
      status: 'active',
      usedBytes: 0,
      reservedBytes: 0,
      fileCount: 0,
      isOwner: true,
      timeRemainingMs: expiresAt - now,
    };

    return { room: roomSummary, sessionToken, code };
  }

  /**
   * Join an existing active room via 4-digit code.
   */
  public static joinRoom(code: string): { room: RoomSummary; sessionToken: string } {
    if (!DROPLET_LIMITS.ROOM_CODE_REGEX.test(code)) {
      throw new AppError('INVALID_CODE', 'Room code must be a 4-digit number.', 400);
    }

    const db = getDatabase();
    const now = Date.now();
    const codeHash = hashToken(code);

    // Look for active room with this code
    const roomRow = db
      .prepare(
        `SELECT id, code, created_at as createdAt, expires_at as expiresAt, status,
                used_bytes as usedBytes, reserved_bytes as reservedBytes, file_count as fileCount
         FROM rooms 
         WHERE code_hash = ? AND status = 'active' AND expires_at > ?`
      )
      .get(codeHash, now) as (Room & { code?: string }) | undefined;

    if (!roomRow) {
      throw new AppError('ROOM_NOT_FOUND', 'No active room found with this code. It may have expired.', 404);
    }

    // Ensure code is persisted if room row didn't have it
    if (!roomRow.code) {
      db.prepare(`UPDATE rooms SET code = ? WHERE id = ?`).run(code, roomRow.id);
    }

    // Generate participant session
    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashToken(sessionToken);
    const sessionId = uuidv4();

    db.prepare(
      `INSERT INTO sessions (
        id, room_id, token_hash, role, created_at, expires_at
      ) VALUES (?, ?, ?, 'participant', ?, ?)`
    ).run(sessionId, roomRow.id, sessionTokenHash, now, roomRow.expiresAt);

    const roomSummary: RoomSummary = {
      id: roomRow.id,
      code,
      createdAt: roomRow.createdAt,
      expiresAt: roomRow.expiresAt,
      status: 'active',
      usedBytes: roomRow.usedBytes,
      reservedBytes: roomRow.reservedBytes,
      fileCount: roomRow.fileCount,
      isOwner: false,
      timeRemainingMs: Math.max(0, roomRow.expiresAt - now),
    };

    return { room: roomSummary, sessionToken };
  }

  /**
   * Retrieve room details and unexpired items.
   */
  public static getRoomDetails(roomId: string, session: RoomSession): { room: RoomSummary; items: Item[] } {
    const db = getDatabase();
    const now = Date.now();

    const roomRow = db
      .prepare(
        `SELECT id, code, created_at as createdAt, expires_at as expiresAt, status,
                used_bytes as usedBytes, reserved_bytes as reservedBytes, file_count as fileCount
         FROM rooms 
         WHERE id = ?`
      )
      .get(roomId) as (Room & { code?: string }) | undefined;

    if (!roomRow || roomRow.status === 'deleted') {
      throw new AppError('ROOM_NOT_FOUND', 'Room not found or has been deleted.', 404);
    }

    if (now > roomRow.expiresAt || roomRow.status === 'expired') {
      throw new AppError('ROOM_EXPIRED', 'Room has expired and is no longer accessible.', 410);
    }

    // Fetch items
    const itemRows = db
      .prepare(
        `SELECT id, room_id as roomId, type, text_content as textContent, 
                filename, size_bytes as sizeBytes, mime_type as mimeType, created_at as createdAt
         FROM items 
         WHERE room_id = ? 
         ORDER BY created_at DESC`
      )
      .all(roomId) as Item[];

    const roomSummary: RoomSummary = {
      id: roomRow.id,
      code: roomRow.code || '',
      createdAt: roomRow.createdAt,
      expiresAt: roomRow.expiresAt,
      status: roomRow.status,
      usedBytes: roomRow.usedBytes,
      reservedBytes: roomRow.reservedBytes,
      fileCount: roomRow.fileCount,
      isOwner: session.role === 'owner',
      timeRemainingMs: Math.max(0, roomRow.expiresAt - now),
    };

    return { room: roomSummary, items: itemRows };
  }

  /**
   * Delete a room immediately (Owner only).
   */
  public static deleteRoom(roomId: string): void {
    const db = getDatabase();
    const now = Date.now();

    // Mark room as deleted and revoke all active sessions immediately
    const deleteTx = db.transaction(() => {
      db.prepare(
        `UPDATE rooms SET status = 'deleted', last_activity_at = ? WHERE id = ?`
      ).run(now, roomId);

      db.prepare(
        `UPDATE sessions SET revoked_at = ? WHERE room_id = ? AND revoked_at IS NULL`
      ).run(now, roomId);
    });

    deleteTx();
  }
}
