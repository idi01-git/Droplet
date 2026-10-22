import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import JSZip from 'jszip';
import { app } from '../server/src/index';
import { getDatabase } from '../server/src/db/database';
import { storageService } from '../server/src/services/storageService';
import { resetRateLimitStores } from '../server/src/middleware/rateLimit';
import { CleanupService } from '../server/src/services/cleanupService';

describe('Step 7: Bounded ZIP "Download All" & Auto-Cleanup Engine', () => {
  beforeEach(() => {
    resetRateLimitStores();
  });

  it('GET /api/rooms/:roomId/download-all creates a valid ZIP with files and room-notes.txt', async () => {
    // 1. Create a room
    const createRes = await request(app).post('/api/rooms');
    const { room, sessionToken } = createRes.body.data;

    // 2. Post a text note
    await request(app)
      .post(`/api/rooms/${room.id}/items/text`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ text: 'Lab project meeting at 3 PM' });

    // 3. Upload a file
    const fileContent = Buffer.from('console.log("hello world");');
    const initRes = await request(app)
      .post(`/api/rooms/${room.id}/uploads/initiate`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ filename: 'test.js', sizeBytes: fileContent.length });

    const uploadId = initRes.body.data.uploadId;
    await request(app)
      .post(`/api/rooms/${room.id}/uploads/${uploadId}/complete`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .attach('file', fileContent, 'test.js');

    // 4. Download all as ZIP with binary buffer parser
    const zipRes = await request(app)
      .get(`/api/rooms/${room.id}/download-all`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(zipRes.status).toBe(200);
    expect(zipRes.headers['content-type']).toContain('application/zip');
    expect(Buffer.isBuffer(zipRes.body)).toBe(true);

    // 5. Unzip and verify contents using JSZip
    const zip = await JSZip.loadAsync(zipRes.body);
    const filesInZip = Object.keys(zip.files);

    expect(filesInZip).toContain('test.js');
    expect(filesInZip).toContain('room-notes.txt');

    const testJsContent = await zip.file('test.js')?.async('string');
    expect(testJsContent).toBe('console.log("hello world");');

    const notesContent = await zip.file('room-notes.txt')?.async('string');
    expect(notesContent).toContain('Lab project meeting at 3 PM');
  });

  it('CleanupService purges expired rooms, removes physical files from disk, and cascades DB rows', async () => {
    // 1. Create room and upload a file
    const createRes = await request(app).post('/api/rooms');
    const { room, sessionToken } = createRes.body.data;

    const fileContent = Buffer.from('Disposable temporary file bytes');
    const initRes = await request(app)
      .post(`/api/rooms/${room.id}/uploads/initiate`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ filename: 'disposable.txt', sizeBytes: fileContent.length });

    const uploadId = initRes.body.data.uploadId;
    const completeRes = await request(app)
      .post(`/api/rooms/${room.id}/uploads/${uploadId}/complete`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .attach('file', fileContent, 'disposable.txt');

    const itemId = completeRes.body.data.item.id;
    const db = getDatabase();

    const itemRow = db.prepare('SELECT object_key FROM items WHERE id = ?').get(itemId) as any;
    expect(storageService.exists(itemRow.object_key)).toBe(true);

    // 2. Mark room expired
    db.prepare('UPDATE rooms SET expires_at = ? WHERE id = ?').run(Date.now() - 5000, room.id);

    // 3. Run CleanupService purge
    const stats = await CleanupService.purgeExpiredRooms();
    expect(stats.roomsPurged).toBeGreaterThanOrEqual(1);
    expect(stats.filesPurged).toBeGreaterThanOrEqual(1);

    // 4. Verify physical file is gone from disk
    expect(storageService.exists(itemRow.object_key)).toBe(false);

    // 5. Verify room row and item rows are gone from DB
    const roomAfter = db.prepare('SELECT id FROM rooms WHERE id = ?').get(room.id);
    expect(roomAfter).toBeUndefined();

    const itemAfter = db.prepare('SELECT id FROM items WHERE id = ?').get(itemId);
    expect(itemAfter).toBeUndefined();

    // 6. Accessing room now returns 401 (session purged) or 404 (room not found)
    const accessRes = await request(app)
      .get(`/api/rooms/${room.id}`)
      .set('Authorization', `Bearer ${sessionToken}`);

    expect([401, 404]).toContain(accessRes.status);
  });
});
