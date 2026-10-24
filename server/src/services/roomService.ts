import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { generateRoomCode, generateSessionToken, hashToken } from '../utils/crypto';
import { DROPLET_LIMITS } from '../../../shared/limits';
import { AppError } from '../middleware/errorHandler';
import { Room, RoomSummary, RoomSession, Item } from '../../../shared/types';

export class RoomService {
  /**
   * Find an active, unique 4-digit room code.
   */
  public static async generateUniqueCode(): Promise<string> {
    const db = getDb();
    const now = Date.now();

    for (let attempt = 0; attempt < 50; attempt++) {
      const code = generateRoomCode();
      const codeHash = hashToken(code);

      const existing = await db.get<{ id: string }>(
        `SELECT id FROM rooms 
         WHERE code_hash = ? AND status = 'active' AND expires_at > ?`,
        [codeHash, now]
      );

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
  public static async createRoom(_creatorIp?: string): Promise<{ room: RoomSummary; sessionToken: string; code: string }> {
    const db = getDb();
    const now = Date.now();
    const expiresAt = now + DROPLET_LIMITS.ROOM_LIFETIME_MS;
    const roomId = uuidv4();
    const code = await this.generateUniqueCode();
    const codeHash = hashToken(code);

    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashToken(sessionToken);
    const sessionId = uuidv4();

    // Execute room & session creation in an atomic transaction
    await db.transaction(async (tx) => {
      // Insert room
      await tx.run(
        `INSERT INTO rooms (
          id, code, code_hash, created_at, expires_at, status, 
          owner_session_hash, used_bytes, reserved_bytes, file_count, last_activity_at
        ) VALUES (?, ?, ?, ?, ?, 'active', ?, 0, 0, 0, ?)`,
        [roomId, code, codeHash, now, expiresAt, sessionTokenHash, now]
      );

      // Insert owner session
      await tx.run(
        `INSERT INTO sessions (
          id, room_id, token_hash, role, created_at, expires_at
        ) VALUES (?, ?, ?, 'owner', ?, ?)`,
        [sessionId, roomId, sessionTokenHash, now, expiresAt]
      );
    });

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
  public static async joinRoom(code: string): Promise<{ room: RoomSummary; sessionToken: string }> {
    if (!DROPLET_LIMITS.ROOM_CODE_REGEX.test(code)) {
      throw new AppError('INVALID_CODE', 'Room code must be a 4-digit number.', 400);
    }

    const db = getDb();
    const now = Date.now();
    const codeHash = hashToken(code);

    // Look for active room with this code
    const roomRow = await db.get<Room & { code?: string }>(
      `SELECT id, code, created_at as createdAt, expires_at as expiresAt, status,
              used_bytes as usedBytes, reserved_bytes as reservedBytes, file_count as fileCount
       FROM rooms 
       WHERE code_hash = ? AND status = 'active' AND expires_at > ?`,
      [codeHash, now]
    );

    if (!roomRow) {
      throw new AppError('ROOM_NOT_FOUND', 'No active room found with this code. It may have expired.', 404);
    }

    // Ensure code is persisted if room row didn't have it
    if (!roomRow.code) {
      await db.run(`UPDATE rooms SET code = ? WHERE id = ?`, [code, roomRow.id]);
    }

    // Generate participant session
    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashToken(sessionToken);
    const sessionId = uuidv4();

    await db.run(
      `INSERT INTO sessions (
        id, room_id, token_hash, role, created_at, expires_at
      ) VALUES (?, ?, ?, 'participant', ?, ?)`,
      [sessionId, roomRow.id, sessionTokenHash, now, roomRow.expiresAt]
    );

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
  public static async getRoomDetails(roomId: string, session: RoomSession): Promise<{ room: RoomSummary; items: Item[] }> {
    const db = getDb();
    const now = Date.now();

    const roomRow = await db.get<Room & { code?: string }>(
      `SELECT id, code, created_at as createdAt, expires_at as expiresAt, status,
              used_bytes as usedBytes, reserved_bytes as reservedBytes, file_count as fileCount
       FROM rooms 
       WHERE id = ?`,
      [roomId]
    );

    if (!roomRow || roomRow.status === 'deleted') {
      throw new AppError('ROOM_NOT_FOUND', 'Room not found or has been deleted.', 404);
    }

    if (now > roomRow.expiresAt || roomRow.status === 'expired') {
      throw new AppError('ROOM_EXPIRED', 'Room has expired and is no longer accessible.', 410);
    }

    // Fetch items with permission check for deletion
    const itemRows = await db.all<Item & { sessionId: string }>(
      `SELECT id, room_id as roomId, session_id as sessionId, type, text_content as textContent, 
              filename, size_bytes as sizeBytes, mime_type as mimeType, created_at as createdAt
       FROM items 
       WHERE room_id = ? 
       ORDER BY created_at DESC`,
      [roomId]
    );

    const isOwner = session.role === 'owner';
    const items: Item[] = itemRows.map((row) => ({
      id: row.id,
      roomId: row.roomId,
      type: row.type,
      textContent: row.textContent,
      filename: row.filename,
      sizeBytes: row.sizeBytes,
      mimeType: row.mimeType,
      createdAt: row.createdAt,
      canDelete: isOwner || row.sessionId === session.id,
    }));

    const roomSummary: RoomSummary = {
      id: roomRow.id,
      code: roomRow.code || '',
      createdAt: roomRow.createdAt,
      expiresAt: roomRow.expiresAt,
      status: roomRow.status,
      usedBytes: roomRow.usedBytes,
      reservedBytes: roomRow.reservedBytes,
      fileCount: roomRow.fileCount,
      isOwner,
      timeRemainingMs: Math.max(0, roomRow.expiresAt - now),
    };

    return { room: roomSummary, items };
  }

  /**
   * Delete a room immediately (Owner only).
   */
  public static async deleteRoom(roomId: string): Promise<void> {
    const db = getDb();
    const now = Date.now();

    // Mark room as deleted and revoke all active sessions immediately
    await db.transaction(async (tx) => {
      await tx.run(
        `UPDATE rooms SET status = 'deleted', last_activity_at = ? WHERE id = ?`,
        [now, roomId]
      );

      await tx.run(
        `UPDATE sessions SET revoked_at = ? WHERE room_id = ? AND revoked_at IS NULL`,
        [now, roomId]
      );
    });
  }
}
