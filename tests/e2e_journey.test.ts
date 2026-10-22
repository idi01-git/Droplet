import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import JSZip from 'jszip';
import { app } from '../server/src/index';
import { resetRateLimitStores } from '../server/src/middleware/rateLimit';

describe('Step 8: Full End-to-End Multi-Device Sharing Journey', () => {
  beforeEach(() => {
    resetRateLimitStores();
  });

  it('Executes the complete Droplet user journey across two simulated devices', async () => {
    // ----------------------------------------------------
    // 1. Device A (Laptop): Creates a new disposable room
    // ----------------------------------------------------
    const createRes = await request(app).post('/api/rooms');
    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);

    const { room, sessionToken: deviceAToken } = createRes.body.data;
    const roomCode = room.code;
    const roomId = room.id;

    expect(room.isOwner).toBe(true);
    expect(roomCode).toMatch(/^\d{4}$/);

    // ----------------------------------------------------
    // 2. Device B (Lab PC): Joins room using 4-digit code
    // ----------------------------------------------------
    const joinRes = await request(app)
      .post('/api/rooms/join')
      .send({ code: roomCode });

    expect(joinRes.status).toBe(200);
    expect(joinRes.body.success).toBe(true);

    const { sessionToken: deviceBToken } = joinRes.body.data;
    expect(joinRes.body.data.room.isOwner).toBe(false);
    expect(deviceBToken).not.toBe(deviceAToken);

    // ----------------------------------------------------
    // 3. Device A: Shares notes and links
    // ----------------------------------------------------
    const noteRes = await request(app)
      .post(`/api/rooms/${roomId}/items/text`)
      .set('Authorization', `Bearer ${deviceAToken}`)
      .send({ text: 'git clone https://github.com/example/project.git' });

    expect(noteRes.status).toBe(201);
    expect(noteRes.body.data.item.type).toBe('text');

    const linkRes = await request(app)
      .post(`/api/rooms/${roomId}/items/text`)
      .set('Authorization', `Bearer ${deviceAToken}`)
      .send({ text: 'https://docs.docker.com/engine/' });

    expect(linkRes.status).toBe(201);
    expect(linkRes.body.data.item.type).toBe('link');

    // ----------------------------------------------------
    // 4. Device B: Reads room items and verifies presence
    // ----------------------------------------------------
    const deviceBGetRes = await request(app)
      .get(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${deviceBToken}`);

    expect(deviceBGetRes.status).toBe(200);
    expect(deviceBGetRes.body.data.items).toHaveLength(2);

    // ----------------------------------------------------
    // 5. Device B: Uploads a PDF document to the room
    // ----------------------------------------------------
    const pdfBytes = Buffer.from('%PDF-1.4 Lab Experiment Data & Results');
    const initRes = await request(app)
      .post(`/api/rooms/${roomId}/uploads/initiate`)
      .set('Authorization', `Bearer ${deviceBToken}`)
      .send({
        filename: 'lab_results.pdf',
        sizeBytes: pdfBytes.length,
        mimeType: 'application/pdf',
      });

    expect(initRes.status).toBe(200);
    const uploadId = initRes.body.data.uploadId;

    const completeRes = await request(app)
      .post(`/api/rooms/${roomId}/uploads/${uploadId}/complete`)
      .set('Authorization', `Bearer ${deviceBToken}`)
      .attach('file', pdfBytes, 'lab_results.pdf');

    expect(completeRes.status).toBe(201);
    const uploadedItemId = completeRes.body.data.item.id;

    // ----------------------------------------------------
    // 6. Device A: Downloads the file uploaded by Device B
    // ----------------------------------------------------
    const downloadRes = await request(app)
      .get(`/api/rooms/${roomId}/items/${uploadedItemId}/download`)
      .set('Authorization', `Bearer ${deviceAToken}`)
      .buffer(true);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.body.toString()).toBe('%PDF-1.4 Lab Experiment Data & Results');

    // ----------------------------------------------------
    // 7. Device A: Downloads All as a single ZIP archive
    // ----------------------------------------------------
    const zipRes = await request(app)
      .get(`/api/rooms/${roomId}/download-all`)
      .set('Authorization', `Bearer ${deviceAToken}`)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(zipRes.status).toBe(200);
    const zip = await JSZip.loadAsync(zipRes.body);
    expect(Object.keys(zip.files)).toContain('lab_results.pdf');
    expect(Object.keys(zip.files)).toContain('room-notes.txt');

    // ----------------------------------------------------
    // 8. Device A (Owner): Deletes the room immediately
    // ----------------------------------------------------
    const deleteRes = await request(app)
      .delete(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${deviceAToken}`);

    expect(deleteRes.status).toBe(200);

    // ----------------------------------------------------
    // 9. Verification: Both devices lose all access
    // ----------------------------------------------------
    const deviceAPostDelete = await request(app)
      .get(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${deviceAToken}`);
    expect([401, 404]).toContain(deviceAPostDelete.status);

    const deviceBPostDelete = await request(app)
      .get(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${deviceBToken}`);
    expect([401, 404]).toContain(deviceBPostDelete.status);

    // Unauthenticated request is denied
    const unauthRes = await request(app).get(`/api/rooms/${roomId}`);
    expect(unauthRes.status).toBe(401);
  });
});
