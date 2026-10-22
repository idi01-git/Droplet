import crypto from 'crypto';
import { DROPLET_LIMITS } from '../../../shared/limits';

/**
 * Generate a cryptographically secure random session token (64 hex chars).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a SHA-256 hash of a session token or room code.
 * Raw tokens are never stored at rest in the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a 4-digit room code with leading zeros (e.g., '0421', '4827').
 */
export function generateRoomCode(): string {
  const codeInt = crypto.randomInt(0, 10000);
  return codeInt.toString().padStart(DROPLET_LIMITS.ROOM_CODE_LENGTH, '0');
}

/**
 * Compare two strings in constant time to prevent timing attacks.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
