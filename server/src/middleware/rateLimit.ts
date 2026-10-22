import { Request, Response, NextFunction } from 'express';
import { DROPLET_LIMITS } from '../../../shared/limits';
import { ApiErrorResponse } from '../../../shared/types';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface FailedJoinRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

// In-memory rate limiting stores (sliding window / fixed window)
const ipCreationStore = new Map<string, RateLimitRecord>();
const failedJoinStore = new Map<string, FailedJoinRecord>();
const sessionItemStore = new Map<string, RateLimitRecord>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Middleware: Rate limit room creation per IP.
 * Default: 5 requests per 10 minutes.
 */
export function rateLimitRoomCreation(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const now = Date.now();
  const limitConfig = DROPLET_LIMITS.RATE_LIMITS.ROOM_CREATION;

  let record = ipCreationStore.get(ip);
  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + limitConfig.WINDOW_MS };
    ipCreationStore.set(ip, record);
    return next();
  }

  if (record.count >= limitConfig.MAX_REQUESTS) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Room creation rate limit exceeded. Please wait a few minutes before trying again.',
      },
    };
    res.status(429).json(errorResponse);
    return;
  }

  record.count++;
  next();
}

/**
 * Check if an IP is currently locked out from attempting room codes.
 */
export function checkFailedJoinLockout(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = failedJoinStore.get(ip);

  if (record && record.lockedUntil && now < record.lockedUntil) {
    const remainingMs = record.lockedUntil - now;
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'LOCKOUT_ACTIVE',
        message: `Too many failed join attempts. Locked out for ${Math.ceil(remainingMs / 1000)} seconds.`,
        lockoutRemainingMs: remainingMs,
      },
    };
    res.status(429).json(errorResponse);
    return;
  }

  next();
}

/**
 * Record a failed join attempt. Triggers lockout if threshold is exceeded.
 */
export function recordFailedJoinAttempt(ip: string): { locked: boolean; remainingMs: number } {
  const now = Date.now();
  const config = DROPLET_LIMITS.RATE_LIMITS.FAILED_JOIN;
  let record = failedJoinStore.get(ip);

  if (!record || now > record.firstAttemptAt + config.WINDOW_MS) {
    record = {
      attempts: 1,
      firstAttemptAt: now,
      lockedUntil: null,
    };
    failedJoinStore.set(ip, record);
    return { locked: false, remainingMs: 0 };
  }

  record.attempts++;
  if (record.attempts >= config.MAX_ATTEMPTS) {
    record.lockedUntil = now + config.LOCKOUT_DURATION_MS;
    return { locked: true, remainingMs: config.LOCKOUT_DURATION_MS };
  }

  return { locked: false, remainingMs: 0 };
}

/**
 * Clear failed join records upon a successful room code join.
 */
export function clearFailedJoinAttempts(ip: string): void {
  failedJoinStore.delete(ip);
}

/**
 * Reset all in-memory rate limit stores (useful for test runs).
 */
export function resetRateLimitStores(): void {
  ipCreationStore.clear();
  failedJoinStore.clear();
  sessionItemStore.clear();
}
