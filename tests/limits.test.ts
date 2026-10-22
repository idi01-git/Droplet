import { describe, it, expect } from 'vitest';
import {
  DROPLET_LIMITS,
  ONE_SECOND_MS,
  ONE_MINUTE_MS,
  ONE_HOUR_MS,
  ONE_KIB,
  ONE_MIB,
  ONE_GIB,
} from '../shared/limits';

describe('Droplet Application Limits & Quotas (Spec Section 5)', () => {
  it('correctly calculates time units', () => {
    expect(ONE_SECOND_MS).toBe(1000);
    expect(ONE_MINUTE_MS).toBe(60_000);
    expect(ONE_HOUR_MS).toBe(3_600_000);
  });

  it('correctly calculates binary IEC byte units (KiB, MiB, GiB)', () => {
    expect(ONE_KIB).toBe(1024);
    expect(ONE_MIB).toBe(1024 * 1024);
    expect(ONE_GIB).toBe(1024 * 1024 * 1024);
  });

  it('enforces room lifetime of exactly 24 hours', () => {
    expect(DROPLET_LIMITS.ROOM_LIFETIME_MS).toBe(24 * 60 * 60 * 1000);
    expect(DROPLET_LIMITS.ROOM_LIFETIME_MS).toBe(86_400_000);
  });

  it('validates 4-digit room code format', () => {
    expect(DROPLET_LIMITS.ROOM_CODE_LENGTH).toBe(4);
    expect(DROPLET_LIMITS.ROOM_CODE_REGEX.test('0000')).toBe(true);
    expect(DROPLET_LIMITS.ROOM_CODE_REGEX.test('4827')).toBe(true);
    expect(DROPLET_LIMITS.ROOM_CODE_REGEX.test('9999')).toBe(true);

    // Invalid codes
    expect(DROPLET_LIMITS.ROOM_CODE_REGEX.test('482')).toBe(false);
    expect(DROPLET_LIMITS.ROOM_CODE_REGEX.test('48271')).toBe(false);
    expect(DROPLET_LIMITS.ROOM_CODE_REGEX.test('482A')).toBe(false);
    expect(DROPLET_LIMITS.ROOM_CODE_REGEX.test('abcd')).toBe(false);
    expect(DROPLET_LIMITS.ROOM_CODE_REGEX.test('')).toBe(false);
  });

  it('enforces exact file and storage quotas', () => {
    expect(DROPLET_LIMITS.MAX_FILES_PER_ROOM).toBe(20);
    expect(DROPLET_LIMITS.MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024); // 50 MiB
    expect(DROPLET_LIMITS.MAX_ROOM_BYTES).toBe(200 * 1024 * 1024); // 200 MiB
    expect(DROPLET_LIMITS.MAX_TEXT_SIZE_BYTES).toBe(100 * 1024); // 100 KiB
    expect(DROPLET_LIMITS.MAX_ACTIVE_ROOMS_PER_CREATOR).toBe(3);
    expect(DROPLET_LIMITS.MAX_CONCURRENT_UPLOADS_PER_ROOM).toBe(2);
    expect(DROPLET_LIMITS.MAX_ZIP_BUDGET_BYTES).toBe(200 * 1024 * 1024);
  });

  it('enforces circuit breaker threshold', () => {
    expect(DROPLET_LIMITS.GLOBAL_STORAGE_CIRCUIT_BREAKER_BYTES).toBe(2 * 1024 * 1024 * 1024); // 2 GiB
  });

  it('defines strict rate limit settings', () => {
    expect(DROPLET_LIMITS.RATE_LIMITS.FAILED_JOIN.MAX_ATTEMPTS).toBe(5);
    expect(DROPLET_LIMITS.RATE_LIMITS.FAILED_JOIN.LOCKOUT_DURATION_MS).toBe(5 * 60 * 1000);
    expect(DROPLET_LIMITS.RATE_LIMITS.ROOM_CREATION.MAX_REQUESTS).toBe(5);
  });

  it('includes malicious url schemes in blocklist', () => {
    expect(DROPLET_LIMITS.DISALLOWED_URL_SCHEMES).toContain('javascript:');
    expect(DROPLET_LIMITS.DISALLOWED_URL_SCHEMES).toContain('data:');
    expect(DROPLET_LIMITS.DISALLOWED_URL_SCHEMES).toContain('vbscript:');
    expect(DROPLET_LIMITS.DISALLOWED_URL_SCHEMES).toContain('file:');
  });
});
