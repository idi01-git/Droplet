import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/database';
import { hashToken } from '../utils/crypto';
import { AppError } from './errorHandler';
import { Room, RoomSession } from '../../../shared/types';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      session?: RoomSession;
      room?: Room;
      sessionToken?: string;
    }
  }
}

export function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const customHeader = req.headers['x-session-token'];
  if (typeof customHeader === 'string') {
    return customHeader.trim();
  }
  return null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractSessionToken(req);
  if (!token) {
    return next(new AppError('UNAUTHORIZED', 'Session token is missing.', 401));
  }

  const tokenHash = hashToken(token);
  const db = getDb();

  try {
    // Find session (even if revoked, to provide accurate error)
    const sessionRow = await db.get<RoomSession>(
      `SELECT id, room_id as roomId, token_hash as tokenHash, role, created_at as createdAt, expires_at as expiresAt, revoked_at as revokedAt
       FROM sessions 
       WHERE token_hash = ?`,
      [tokenHash]
    );

    if (!sessionRow) {
      return next(new AppError('UNAUTHORIZED', 'Invalid session token.', 401));
    }

    if (sessionRow.revokedAt) {
      return next(new AppError('ROOM_NOT_FOUND', 'Room has been deleted.', 404));
    }

    const now = Date.now();
    if (now > sessionRow.expiresAt) {
      return next(new AppError('ROOM_EXPIRED', 'Session has expired.', 410));
    }

    // Find room and verify expiry
    const roomRow = await db.get<Room>(
      `SELECT id, created_at as createdAt, expires_at as expiresAt, status, used_bytes as usedBytes, reserved_bytes as reservedBytes, file_count as fileCount
       FROM rooms 
       WHERE id = ?`,
      [sessionRow.roomId]
    );

    if (!roomRow || roomRow.status === 'deleted') {
      return next(new AppError('ROOM_NOT_FOUND', 'Room not found or has been deleted.', 404));
    }

    if (now > roomRow.expiresAt || roomRow.status === 'expired') {
      return next(new AppError('ROOM_EXPIRED', 'Room has expired and is no longer accessible.', 410));
    }

    // Attach session and room to request
    req.session = sessionRow;
    req.room = roomRow;
    req.sessionToken = token;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware ensuring the authenticated session is the room owner.
 */
export function requireOwner(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session || req.session.role !== 'owner') {
    return next(new AppError('FORBIDDEN', 'Owner permission is required for this action.', 403));
  }
  next();
}
