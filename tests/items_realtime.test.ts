import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from '../server/src/index';
import { WebSocket } from 'ws';
import { AddressInfo } from 'net';
import { DROPLET_LIMITS } from '../shared/limits';

describe('Step 5: Text, Links & Real-Time Sync', () => {
  let wsServerPort: number;

  beforeEach(() => {
    if (!server.listening) {
      server.listen(0);
    }
    const addr = server.address() as AddressInfo;
    wsServerPort = addr.port;
  });

  afterAll(() => {
    if (server.listening) {
      server.close();
    }
  });

  it('POST /api/rooms/:roomId/items/text creates text note and detects URLs', async () => {
    const createRes = await request(app).post('/api/rooms');
    const { room, sessionToken } = createRes.body.data;

    // 1. Post a plain text note
    const textRes = await request(app)
      .post(`/api/rooms/${room.id}/items/text`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ text: 'Review section 4 before the exam!' });

    expect(textRes.status).toBe(201);
    expect(textRes.body.success).toBe(true);
    expect(textRes.body.data.item.type).toBe('text');
    expect(textRes.body.data.item.textContent).toBe('Review section 4 before the exam!');

    // 2. Post a URL link
    const linkRes = await request(app)
      .post(`/api/rooms/${room.id}/items/text`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ text: 'https://github.com/facebook/react' });

    expect(linkRes.status).toBe(201);
    expect(linkRes.body.data.item.type).toBe('link');
    expect(linkRes.body.data.item.textContent).toBe('https://github.com/facebook/react');
  });

  it('Rejects dangerous URL schemes and oversized text (>100 KiB)', async () => {
    const createRes = await request(app).post('/api/rooms');
    const { room, sessionToken } = createRes.body.data;

    // Dangerous URL
    const dangerousRes = await request(app)
      .post(`/api/rooms/${room.id}/items/text`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ text: 'javascript:alert(document.domain)' });

    expect(dangerousRes.status).toBe(400);
    expect(dangerousRes.body.error.code).toBe('INVALID_PAYLOAD');

    // Oversized text (> 100 KiB)
    const largeText = 'A'.repeat(DROPLET_LIMITS.MAX_TEXT_SIZE_BYTES + 100);
    const largeRes = await request(app)
      .post(`/api/rooms/${room.id}/items/text`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ text: largeText });

    expect([400, 413]).toContain(largeRes.status);
    expect(largeRes.body.error.code).toBe('INVALID_PAYLOAD');
  });

  it('Enforces item deletion permissions: Author and Owner can delete; other participants cannot', async () => {
    // 1. Owner creates room
    const createRes = await request(app).post('/api/rooms');
    const { room, sessionToken: ownerToken } = createRes.body.data;

    // 2. Participant 1 joins
    const joinRes1 = await request(app)
      .post('/api/rooms/join')
      .send({ code: room.code });
    const part1Token = joinRes1.body.data.sessionToken;

    // 3. Participant 2 joins
    const joinRes2 = await request(app)
      .post('/api/rooms/join')
      .send({ code: room.code });
    const part2Token = joinRes2.body.data.sessionToken;

    // Participant 1 creates an item
    const itemRes = await request(app)
      .post(`/api/rooms/${room.id}/items/text`)
      .set('Authorization', `Bearer ${part1Token}`)
      .send({ text: 'Note by Participant 1' });
    const itemId = itemRes.body.data.item.id;

    // Participant 2 attempts to delete Participant 1's item -> 403 FORBIDDEN
    const forbiddenRes = await request(app)
      .delete(`/api/rooms/${room.id}/items/${itemId}`)
      .set('Authorization', `Bearer ${part2Token}`);
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');

    // Owner deletes Participant 1's item -> 200 OK
    const ownerDeleteRes = await request(app)
      .delete(`/api/rooms/${room.id}/items/${itemId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerDeleteRes.status).toBe(200);
    expect(ownerDeleteRes.body.success).toBe(true);
  });

  it('Broadcasts ITEM_ADDED event over authenticated WebSocket in real time', async () => {
    const createRes = await request(app).post('/api/rooms');
    const { room, sessionToken } = createRes.body.data;

    // Connect WebSocket
    const wsUrl = `ws://localhost:${wsServerPort}/ws?token=${sessionToken}&roomId=${room.id}`;
    const ws = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', (err) => reject(err));
    });

    const eventPromise = new Promise<any>((resolve) => {
      ws.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        resolve(parsed);
      });
    });

    // Post an item via HTTP
    await request(app)
      .post(`/api/rooms/${room.id}/items/text`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ text: 'Realtime WebSocket Sync Test!' });

    // Wait for WebSocket message
    const event = await eventPromise;
    expect(event.type).toBe('ITEM_ADDED');
    expect(event.roomId).toBe(room.id);
    expect(event.payload.item.textContent).toBe('Realtime WebSocket Sync Test!');

    ws.close();
  });
});
