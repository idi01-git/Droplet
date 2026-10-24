import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDatabase, closeDatabase, getDb, ensureDatabaseSchema } from '../server/src/db/database';
import { hashToken, generateSessionToken, generateRoomCode } from '../server/src/utils/crypto';
import { DROPLET_LIMITS } from '../shared/limits';

describe('Serverless SQLite (LibSQL / Turso) Engine', () => {
  beforeEach(async () => {
    closeDatabase();
  });

  afterEach(async () => {
    closeDatabase();
  });

  it('initializes LibSQL client when tursoUrl is configured', async () => {
    const db = initDatabase({
      tursoUrl: ':memory:', // LibSQL supports in-memory for testing
      inMemory: false, // Ensure it selects LibSQL branch
    });

    expect(db.isServerless).toBe(true);
    await ensureDatabaseSchema();

    // Verify tables exist in LibSQL database
    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('rooms');
    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('items');
    expect(tableNames).toContain('upload_reservations');
  });

  it('executes parameterized INSERT, SELECT (get/all), and UPDATE in LibSQL', async () => {
    const db = initDatabase({
      tursoUrl: ':memory:',
      inMemory: false,
    });

    const now = Date.now();
    const roomId = 'turso-test-room-1';
    const code = generateRoomCode();
    const codeHash = hashToken(code);
    const sessionToken = generateSessionToken();
    const sessionHash = hashToken(sessionToken);

    // 1. Insert room
    const insertRes = await db.run(
      `INSERT INTO rooms (
        id, code, code_hash, created_at, expires_at, status, 
        owner_session_hash, used_bytes, reserved_bytes, file_count, last_activity_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, 0, 0, 0, ?)`,
      [roomId, code, codeHash, now, now + 3600000, sessionHash, now]
    );

    expect(insertRes.changes).toBe(1);

    // 2. Query single row (get)
    const room = await db.get<{ id: string; code: string; status: string }>(
      `SELECT id, code, status FROM rooms WHERE id = ?`,
      [roomId]
    );

    expect(room).toBeDefined();
    expect(room?.id).toBe(roomId);
    expect(room?.code).toBe(code);
    expect(room?.status).toBe('active');

    // 3. Update row
    const updateRes = await db.run(
      `UPDATE rooms SET used_bytes = ?, file_count = ? WHERE id = ?`,
      [1024, 1, roomId]
    );

    expect(updateRes.changes).toBe(1);

    const updatedRoom = await db.get<{ used_bytes: number; file_count: number }>(
      `SELECT used_bytes, file_count FROM rooms WHERE id = ?`,
      [roomId]
    );

    expect(updatedRoom?.used_bytes).toBe(1024);
    expect(updatedRoom?.file_count).toBe(1);

    // 4. Query all rows (all)
    const allRooms = await db.all<{ id: string }>(`SELECT id FROM rooms WHERE status = ?`, ['active']);
    expect(allRooms.length).toBe(1);
    expect(allRooms[0].id).toBe(roomId);
  });

  it('executes atomic transactions with commit and rollback in LibSQL', async () => {
    const db = initDatabase({
      tursoUrl: ':memory:',
      inMemory: false,
    });

    const now = Date.now();
    const roomId = 'turso-tx-room';
    const code = generateRoomCode();
    const codeHash = hashToken(code);

    // Transaction 1: Successful commit (insert room + owner session)
    await db.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO rooms (
          id, code, code_hash, created_at, expires_at, status, 
          owner_session_hash, used_bytes, reserved_bytes, file_count, last_activity_at
        ) VALUES (?, ?, ?, ?, ?, 'active', 'hash1', 0, 0, 0, ?)`,
        [roomId, code, codeHash, now, now + 3600000, now]
      );

      await tx.run(
        `INSERT INTO sessions (
          id, room_id, token_hash, role, created_at, expires_at
        ) VALUES (?, ?, 'tokenhash1', 'owner', ?, ?)`,
        ['session-tx-1', roomId, now, now + 3600000]
      );
    });

    const session = await db.get<{ id: string; role: string }>(
      `SELECT id, role FROM sessions WHERE id = ?`,
      ['session-tx-1']
    );
    expect(session).toBeDefined();
    expect(session?.role).toBe('owner');

    // Transaction 2: Error rollback
    await expect(
      db.transaction(async (tx) => {
        await tx.run(`UPDATE rooms SET used_bytes = 99999 WHERE id = ?`, [roomId]);
        throw new Error('Forced simulation of unexpected error');
      })
    ).rejects.toThrow('Forced simulation of unexpected error');

    // Verify room was rolled back to 0 bytes
    const roomAfterRollback = await db.get<{ used_bytes: number }>(
      `SELECT used_bytes FROM rooms WHERE id = ?`,
      [roomId]
    );
    expect(roomAfterRollback?.used_bytes).toBe(0);
  });

  it('enforces foreign keys and CASCADE delete in LibSQL', async () => {
    const db = initDatabase({
      tursoUrl: ':memory:',
      inMemory: false,
    });

    const now = Date.now();
    const roomId = 'cascade-room';
    const code = generateRoomCode();
    const codeHash = hashToken(code);

    await db.run(
      `INSERT INTO rooms (
        id, code, code_hash, created_at, expires_at, status, 
        owner_session_hash, used_bytes, reserved_bytes, file_count, last_activity_at
      ) VALUES (?, ?, ?, ?, ?, 'active', 'hash', 0, 0, 0, ?)`,
      [roomId, code, codeHash, now, now + 3600000, now]
    );

    await db.run(
      `INSERT INTO sessions (id, room_id, token_hash, role, created_at, expires_at)
       VALUES (?, ?, 'hash2', 'owner', ?, ?)`,
      ['sess-cascade', roomId, now, now + 3600000]
    );

    await db.run(
      `INSERT INTO items (id, room_id, session_id, type, text_content, size_bytes, created_at)
       VALUES (?, ?, ?, 'text', 'Hello cascade', 13, ?)`,
      ['item-cascade', roomId, 'sess-cascade', now]
    );

    // Verify row counts before delete
    const itemsBefore = await db.all(`SELECT id FROM items WHERE room_id = ?`, [roomId]);
    expect(itemsBefore.length).toBe(1);

    // Delete room
    await db.run(`DELETE FROM rooms WHERE id = ?`, [roomId]);

    // Verify CASCADE delete purged session and item
    const itemsAfter = await db.all(`SELECT id FROM items WHERE room_id = ?`, [roomId]);
    const sessionsAfter = await db.all(`SELECT id FROM sessions WHERE room_id = ?`, [roomId]);
    expect(itemsAfter.length).toBe(0);
    expect(sessionsAfter.length).toBe(0);
  });

  it('correctly reports serverless status in health checks', async () => {
    const db = initDatabase({
      tursoUrl: ':memory:',
      inMemory: false,
    });

    expect(db.isServerless).toBe(true);

    closeDatabase();

    // Default without tursoUrl is local sqlite
    const localDb = getDb();
    expect(localDb.isServerless).toBe(false);
  });
});
