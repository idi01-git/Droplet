import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server/src/index';
import { getDatabase } from '../server/src/db/database';
import { resetRateLimitStores } from '../server/src/middleware/rateLimit';

describe('Step 4: Room Lifecycle End-to-End API (Create, Join, Expiry, Delete)', () => {
  beforeEach(() => {
    resetRateLimitStores();
  });

  it('POST /api/rooms creates a room and returns owner session and 4-digit code', async () => {
    const res = await request(app).post('/api/rooms');
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.room).toBeDefined();
    expect(res.body.data.room.id).toBeDefined();
    expect(res.body.data.room.code).toMatch(/^\d{4}$/);
    expect(res.body.data.room.isOwner).toBe(true);
    expect(res.body.data.sessionToken).toHaveLength(64);
  });

  it('POST /api/rooms/join joins an active room with participant privileges', async () => {
    // 1. Create a room first
    const createRes = await request(app).post('/api/rooms');
    const { room, sessionToken: ownerToken } = createRes.body.data;

    // 2. Join with the 4-digit code
    const joinRes = await request(app)
      .post('/api/rooms/join')
      .send({ code: room.code });

    expect(joinRes.status).toBe(200);
    expect(joinRes.body.success).toBe(true);
    expect(joinRes.body.data.room.id).toBe(room.id);
    expect(joinRes.body.data.room.isOwner).toBe(false);
    expect(joinRes.body.data.sessionToken).toBeDefined();
    expect(joinRes.body.data.sessionToken).not.toBe(ownerToken);
  });

  it('POST /api/rooms/join rejects invalid or non-existent codes', async () => {
    const res = await request(app)
      .post('/api/rooms/join')
      .send({ code: '9998' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROOM_NOT_FOUND');
  });

  it('GET /api/rooms/:roomId enforces authentication and expiry', async () => {
    const createRes = await request(app).post('/api/rooms');
    const { room, sessionToken } = createRes.body.data;

    // Unauthorized request without token
    const unauthRes = await request(app).get(`/api/rooms/${room.id}`);
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.error.code).toBe('UNAUTHORIZED');

    // Authorized request with token
    const authRes = await request(app)
      .get(`/api/rooms/${room.id}`)
      .set('Authorization', `Bearer ${sessionToken}`);

    expect(authRes.status).toBe(200);
    expect(authRes.body.success).toBe(true);
    expect(authRes.body.data.room.id).toBe(room.id);
    expect(authRes.body.data.room.code).toBe(room.code);
    expect(authRes.body.data.room.isOwner).toBe(true);
    expect(Array.isArray(authRes.body.data.items)).toBe(true);
  });

  it('DELETE /api/rooms/:roomId prevents participant deletion and allows owner deletion', async () => {
    // Create room (Owner)
    const createRes = await request(app).post('/api/rooms');
    const { room, sessionToken: ownerToken } = createRes.body.data;

    // Join room (Participant)
    const joinRes = await request(app)
      .post('/api/rooms/join')
      .send({ code: room.code });
    const participantToken = joinRes.body.data.sessionToken;

    // Participant tries to delete -> 403 Forbidden
    const partDeleteRes = await request(app)
      .delete(`/api/rooms/${room.id}`)
      .set('Authorization', `Bearer ${participantToken}`);
    expect(partDeleteRes.status).toBe(403);
    expect(partDeleteRes.body.error.code).toBe('FORBIDDEN');

    // Owner deletes room -> 200 OK
    const ownerDeleteRes = await request(app)
      .delete(`/api/rooms/${room.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerDeleteRes.status).toBe(200);
    expect(ownerDeleteRes.body.success).toBe(true);

    // Subsequent access returns 404 ROOM_NOT_FOUND
    const postDeleteRes = await request(app)
      .get(`/api/rooms/${room.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(postDeleteRes.status).toBe(404);
  });

  it('Denies access when room expires (410 ROOM_EXPIRED)', async () => {
    const createRes = await request(app).post('/api/rooms');
    const { room, sessionToken } = createRes.body.data;

    // Manually simulate expiration in DB
    const db = getDatabase();
    db.prepare('UPDATE rooms SET expires_at = ? WHERE id = ?').run(Date.now() - 1000, room.id);

    const res = await request(app)
      .get(`/api/rooms/${room.id}`)
      .set('Authorization', `Bearer ${sessionToken}`);

    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('ROOM_EXPIRED');
  });

  it('Enforces Layer 2 Defense: Rejects creation when creator reaches active room limit', async () => {
    // Create 3 active rooms (the maximum allowed)
    const res1 = await request(app).post('/api/rooms');
    const res2 = await request(app).post('/api/rooms');
    const res3 = await request(app).post('/api/rooms');
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res3.status).toBe(201);

    // 4th room creation rejected with 429 ACTIVE_ROOM_LIMIT_REACHED
    const res4 = await request(app).post('/api/rooms');
    expect(res4.status).toBe(429);
    expect(res4.body.error.code).toBe('ACTIVE_ROOM_LIMIT_REACHED');

    // After deleting one room, creation succeeds again
    const deleteRes = await request(app)
      .delete(`/api/rooms/${res1.body.data.room.id}`)
      .set('Authorization', `Bearer ${res1.body.data.sessionToken}`);
    expect(deleteRes.status).toBe(200);

    const res5 = await request(app).post('/api/rooms');
    expect(res5.status).toBe(201);
  });
});
