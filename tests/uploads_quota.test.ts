import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server/src/index';
import { getDatabase } from '../server/src/db/database';
import { storageService } from '../server/src/services/storageService';
import { resetRateLimitStores } from '../server/src/middleware/rateLimit';

describe('Step 6: File Uploads, Atomic Quota Reservations & Downloads', () => {
  let roomId: string;
  let ownerToken: string;

  beforeEach(async () => {
    resetRateLimitStores();
    const res = await request(app).post('/api/rooms');
    roomId = res.body.data.room.id;
    ownerToken = res.body.data.sessionToken;
  });

  it('Phase 1 & Phase 2: successfully initiates, reserves, completes, and commits upload', async () => {
    const fileContent = Buffer.from('Droplet test file content 12345');
    const fileSize = fileContent.length;

    // 1. Phase 1: Initiate
    const initRes = await request(app)
      .post(`/api/rooms/${roomId}/uploads/initiate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        filename: 'notes.txt',
        sizeBytes: fileSize,
        mimeType: 'text/plain',
      });

    expect(initRes.status).toBe(200);
    expect(initRes.body.success).toBe(true);
    expect(initRes.body.data.uploadId).toBeDefined();

    const uploadId = initRes.body.data.uploadId;

    // Verify atomic reservation in DB
    const db = getDatabase();
    const roomBefore = db.prepare('SELECT used_bytes, reserved_bytes FROM rooms WHERE id = ?').get(roomId) as any;
    expect(roomBefore.reserved_bytes).toBe(fileSize);
    expect(roomBefore.used_bytes).toBe(0);

    // 2. Phase 2: Complete upload
    const completeRes = await request(app)
      .post(`/api/rooms/${roomId}/uploads/${uploadId}/complete`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', fileContent, 'notes.txt');

    expect(completeRes.status).toBe(201);
    expect(completeRes.body.success).toBe(true);
    expect(completeRes.body.data.item).toBeDefined();
    expect(completeRes.body.data.item.filename).toBe('notes.txt');
    expect(completeRes.body.data.item.sizeBytes).toBe(fileSize);

    // Verify room stats committed in DB
    const roomAfter = db.prepare('SELECT used_bytes, reserved_bytes, file_count FROM rooms WHERE id = ?').get(roomId) as any;
    expect(roomAfter.reserved_bytes).toBe(0);
    expect(roomAfter.used_bytes).toBe(fileSize);
    expect(roomAfter.file_count).toBe(1);

    // 3. Download the file
    const itemId = completeRes.body.data.item.id;
    const downloadRes = await request(app)
      .get(`/api/rooms/${roomId}/items/${itemId}/download`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .buffer(true);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.text).toBe('Droplet test file content 12345');
  });

  it('Rejects file exceeding 50 MiB limit (FILE_TOO_LARGE)', async () => {
    const oversize = 50 * 1024 * 1024 + 1; // 50 MiB + 1 byte
    const res = await request(app)
      .post(`/api/rooms/${roomId}/uploads/initiate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        filename: 'heavy.iso',
        sizeBytes: oversize,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('Enforces maximum 20 files per room limit', async () => {
    const db = getDatabase();
    // Simulate room having 20 files already
    db.prepare('UPDATE rooms SET file_count = 20 WHERE id = ?').run(roomId);

    const res = await request(app)
      .post(`/api/rooms/${roomId}/uploads/initiate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        filename: 'one-more.pdf',
        sizeBytes: 1024,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ROOM_QUOTA_EXCEEDED');
    expect(res.body.error.message).toContain('20 files');
  });

  it('Enforces maximum 200 MiB room capacity limit atomically', async () => {
    const db = getDatabase();
    // Simulate room having 198 MiB used
    const used = 198 * 1024 * 1024;
    db.prepare('UPDATE rooms SET used_bytes = ? WHERE id = ?').run(used, roomId);

    // Attempting to upload 3 MiB (198 + 3 = 201 MiB > 200 MiB)
    const requestBytes = 3 * 1024 * 1024;
    const res = await request(app)
      .post(`/api/rooms/${roomId}/uploads/initiate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        filename: 'overflow.zip',
        sizeBytes: requestBytes,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ROOM_QUOTA_EXCEEDED');
  });

  it('Enforces maximum 2 concurrent uploads per room', async () => {
    // 1st initiate
    const res1 = await request(app)
      .post(`/api/rooms/${roomId}/uploads/initiate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ filename: 'file1.txt', sizeBytes: 1024 });
    expect(res1.status).toBe(200);

    // 2nd initiate
    const res2 = await request(app)
      .post(`/api/rooms/${roomId}/uploads/initiate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ filename: 'file2.txt', sizeBytes: 1024 });
    expect(res2.status).toBe(200);

    // 3rd initiate should fail with 429
    const res3 = await request(app)
      .post(`/api/rooms/${roomId}/uploads/initiate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ filename: 'file3.txt', sizeBytes: 1024 });

    expect(res3.status).toBe(429);
    expect(res3.body.error.code).toBe('ROOM_QUOTA_EXCEEDED');
    expect(res3.body.error.message).toContain('concurrent uploads');
  });

  it('Deleting a file deletes from storage and decreases room used bytes and file count', async () => {
    const fileContent = Buffer.from('To be deleted');
    const initRes = await request(app)
      .post(`/api/rooms/${roomId}/uploads/initiate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ filename: 'delete-me.txt', sizeBytes: fileContent.length });

    const uploadId = initRes.body.data.uploadId;

    const completeRes = await request(app)
      .post(`/api/rooms/${roomId}/uploads/${uploadId}/complete`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', fileContent, 'delete-me.txt');

    const itemId = completeRes.body.data.item.id;

    const db = getDatabase();
    const itemRow = db.prepare('SELECT object_key FROM items WHERE id = ?').get(itemId) as any;
    expect(storageService.exists(itemRow.object_key)).toBe(true);

    // Delete item
    const deleteRes = await request(app)
      .delete(`/api/rooms/${roomId}/items/${itemId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(deleteRes.status).toBe(200);
    expect(storageService.exists(itemRow.object_key)).toBe(false);

    const roomAfter = db.prepare('SELECT used_bytes, file_count FROM rooms WHERE id = ?').get(roomId) as any;
    expect(roomAfter.used_bytes).toBe(0);
    expect(roomAfter.file_count).toBe(0);
  });
});
