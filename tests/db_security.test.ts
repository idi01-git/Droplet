import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDatabase, closeDatabase, getDatabase } from '../server/src/db/database';
import {
  generateSessionToken,
  hashToken,
  generateRoomCode,
  constantTimeEquals,
} from '../server/src/utils/crypto';
import {
  isValidSafeUrl,
  sanitizeFilename,
  escapeHtml,
} from '../server/src/utils/sanitizer';
import {
  recordFailedJoinAttempt,
  clearFailedJoinAttempts,
  resetRateLimitStores,
} from '../server/src/middleware/rateLimit';
import { DROPLET_LIMITS } from '../shared/limits';

describe('Step 3: Database, Security & Rate Limiting Engine', () => {
  beforeEach(() => {
    initDatabase({ inMemory: true });
    resetRateLimitStores();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('Database Schema & Operations', () => {
    it('initializes rooms and sessions tables and enforces foreign keys', () => {
      const db = getDatabase();

      const roomId = 'test-room-1';
      const codeHash = hashToken('4827');
      const now = Date.now();
      const expiresAt = now + DROPLET_LIMITS.ROOM_LIFETIME_MS;

      // Insert room
      db.prepare(
        `INSERT INTO rooms (id, code_hash, created_at, expires_at, status, last_activity_at)
         VALUES (?, ?, ?, ?, 'active', ?)`
      ).run(roomId, codeHash, now, expiresAt, now);

      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
      expect(room).toBeDefined();
      expect(room.id).toBe(roomId);
      expect(room.status).toBe('active');

      // Insert session
      const token = generateSessionToken();
      const tokenHash = hashToken(token);
      db.prepare(
        `INSERT INTO sessions (id, room_id, token_hash, role, created_at, expires_at)
         VALUES (?, ?, ?, 'owner', ?, ?)`
      ).run('session-1', roomId, tokenHash, now, expiresAt);

      const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get('session-1') as any;
      expect(session).toBeDefined();
      expect(session.role).toBe('owner');
      expect(session.token_hash).toBe(tokenHash);

      // Deleting room cascades to session
      db.prepare('DELETE FROM rooms WHERE id = ?').run(roomId);
      const sessionAfter = db.prepare('SELECT * FROM sessions WHERE id = ?').get('session-1');
      expect(sessionAfter).toBeUndefined();
    });
  });

  describe('Cryptographic Utilities', () => {
    it('generates high-entropy 64-character hex session tokens', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });

    it('hashes tokens deterministically with SHA-256', () => {
      const token = 'my-secret-session-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(token);
    });

    it('generates valid 4-digit numeric room codes', () => {
      for (let i = 0; i < 20; i++) {
        const code = generateRoomCode();
        expect(code).toHaveLength(4);
        expect(/^\d{4}$/.test(code)).toBe(true);
      }
    });

    it('compares strings with constant-time equality', () => {
      expect(constantTimeEquals('secret123', 'secret123')).toBe(true);
      expect(constantTimeEquals('secret123', 'wrong1234')).toBe(false);
      expect(constantTimeEquals('short', 'longer-string')).toBe(false);
    });
  });

  describe('Sanitizer Utilities', () => {
    it('validates safe URLs and rejects dangerous schemes (Spec §4.2)', () => {
      expect(isValidSafeUrl('https://example.com')).toBe(true);
      expect(isValidSafeUrl('http://localhost:3000')).toBe(true);
      expect(isValidSafeUrl('https://github.com/repo/item?param=1')).toBe(true);

      // Dangerous schemes
      expect(isValidSafeUrl('javascript:alert(document.cookie)')).toBe(false);
      expect(isValidSafeUrl('JAVASCRIPT:alert(1)')).toBe(false);
      expect(isValidSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidSafeUrl('vbscript:msgbox(1)')).toBe(false);
      expect(isValidSafeUrl('file:///etc/passwd')).toBe(false);
      expect(isValidSafeUrl('')).toBe(false);
      expect(isValidSafeUrl('not a url')).toBe(false);
    });

    it('sanitizes filenames against path traversal (Zip Slip / directory escape)', () => {
      expect(sanitizeFilename('../../evil.sh')).toBe('evil.sh');
      expect(sanitizeFilename('..\\..\\windows\\system32\\cmd.exe')).toBe('cmd.exe');
      expect(sanitizeFilename('notes:assignment?.pdf')).toBe('notes_assignment_.pdf');
      expect(sanitizeFilename('valid-document.pdf')).toBe('valid-document.pdf');
      expect(sanitizeFilename('...')).toBe('unnamed-file');
      expect(sanitizeFilename('')).toBe('unnamed-file');
    });

    it('escapes HTML special characters', () => {
      const unsafe = '<script>alert("XSS & fun")</script>';
      const safe = escapeHtml(unsafe);
      expect(safe).toBe('&lt;script&gt;alert(&quot;XSS &amp; fun&quot;)&lt;/script&gt;');
      expect(safe).not.toContain('<');
      expect(safe).not.toContain('>');
    });
  });

  describe('Rate Limiter & Brute-Force Lockout Engine', () => {
    it('tracks failed join attempts and locks out after 5 failures', () => {
      const ip = '192.168.1.100';

      // 4 failed attempts should not trigger lockout
      for (let i = 1; i <= 4; i++) {
        const result = recordFailedJoinAttempt(ip);
        expect(result.locked).toBe(false);
      }

      // 5th failed attempt triggers lockout
      const fifthAttempt = recordFailedJoinAttempt(ip);
      expect(fifthAttempt.locked).toBe(true);
      expect(fifthAttempt.remainingMs).toBeGreaterThan(0);
      expect(fifthAttempt.remainingMs).toBeLessThanOrEqual(5 * 60 * 1000);
    });

    it('clears failed join attempts on successful join', () => {
      const ip = '192.168.1.101';
      recordFailedJoinAttempt(ip);
      recordFailedJoinAttempt(ip);

      clearFailedJoinAttempts(ip);

      // Next attempt starts fresh count (attempt 1)
      const fresh = recordFailedJoinAttempt(ip);
      expect(fresh.locked).toBe(false);
    });
  });
});
