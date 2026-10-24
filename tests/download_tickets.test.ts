import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server/src/index';
import { downloadTicketService } from '../server/src/services/downloadTicketService';

describe('Native Streaming Download Tickets (Solution 2 & 3)', () => {
  beforeEach(() => {
    downloadTicketService.clear();
  });

  it('downloadTicketService creates and single-use consumes tickets correctly', () => {
    const ticket = downloadTicketService.createTicket('room-123', 'item-456', 'session-789', 60);
    expect(ticket).toHaveLength(64); // 32 bytes hex = 64 characters

    // First consumption succeeds
    const result = downloadTicketService.verifyAndConsumeTicket(ticket, 'room-123', 'item-456');
    expect(result).not.toBeNull();
    expect(result?.sessionId).toBe('session-789');

    // Second consumption fails (single-use burned!)
    const replay = downloadTicketService.verifyAndConsumeTicket(ticket, 'room-123', 'item-456');
    expect(replay).toBeNull();
  });

  it('rejects ticket consumption for mismatched roomId or itemId', () => {
    const ticket = downloadTicketService.createTicket('room-A', 'item-X', 'sess-1', 60);

    // Mismatched room
    expect(downloadTicketService.verifyAndConsumeTicket(ticket, 'room-B', 'item-X')).toBeNull();

    // Recreate and test mismatched item
    const ticket2 = downloadTicketService.createTicket('room-A', 'item-X', 'sess-1', 60);
    expect(downloadTicketService.verifyAndConsumeTicket(ticket2, 'room-A', 'item-Y')).toBeNull();
  });

  it('rejects expired tickets', () => {
    // 0-second TTL (immediately expired)
    const ticket = downloadTicketService.createTicket('room-A', 'item-X', 'sess-1', 0);
    const result = downloadTicketService.verifyAndConsumeTicket(ticket, 'room-A', 'item-X');
    expect(result).toBeNull();
  });

  it('allows native browser streaming via single-use ticket URL without Authorization header', async () => {
    // 1. Create a room
    const createRes = await request(app).post('/api/rooms').send();
    expect(createRes.status).toBe(201);
    const { room, sessionToken } = createRes.body.data;

    // 2. Upload a test file
    const fileContent = 'Hello Native Streaming World!';
    const initRes = await request(app)
      .post(`/api/rooms/${room.id}/uploads/initiate`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        filename: 'stream-test.txt',
        sizeBytes: Buffer.byteLength(fileContent),
        mimeType: 'text/plain',
      });
    expect(initRes.status).toBe(200);
    const { uploadId } = initRes.body.data;

    const completeRes = await request(app)
      .post(`/api/rooms/${room.id}/uploads/${uploadId}/complete`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .attach('file', Buffer.from(fileContent), 'stream-test.txt');
    expect(completeRes.status).toBe(201);
    const itemId = completeRes.body.data.item.id;

    // 3. Request download URL ticket
    const urlRes = await request(app)
      .get(`/api/rooms/${room.id}/items/${itemId}/download-url`)
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(urlRes.status).toBe(200);
    expect(urlRes.body.success).toBe(true);
    const downloadUrl = urlRes.body.data.url;
    expect(downloadUrl).toContain('/download?ticket=');

    // 4. Download file directly using the ticket URL WITHOUT any Authorization header!
    // (Simulates native browser window.location.assign or <a download> click)
    const downloadRes = await request(app).get(downloadUrl);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.text).toBe(fileContent);
    expect(downloadRes.headers['content-disposition']).toContain('attachment');
    expect(downloadRes.headers['content-disposition']).toContain('stream-test.txt');

    // 5. Verify the ticket cannot be reused (single-use burned!)
    const replayRes = await request(app).get(downloadUrl);
    expect(replayRes.status).toBe(401);
    expect(replayRes.body.error.message).toContain('invalid or has expired');
  });

  it('allows downloading ZIP archive via ticket URL without Authorization header', async () => {
    // 1. Create a room
    const createRes = await request(app).post('/api/rooms').send();
    const { room, sessionToken } = createRes.body.data;

    // 2. Add a note so zip is not empty
    await request(app)
      .post(`/api/rooms/${room.id}/items/text`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ text: 'Note for ZIP archive', type: 'text' });

    // 3. Request ZIP download URL ticket
    const zipUrlRes = await request(app)
      .get(`/api/rooms/${room.id}/download-all-url`)
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(zipUrlRes.status).toBe(200);
    const zipDownloadUrl = zipUrlRes.body.data.url;
    expect(zipDownloadUrl).toContain('/download-all?ticket=');

    // 4. Download zip directly without headers
    const zipRes = await request(app).get(zipDownloadUrl);
    expect(zipRes.status).toBe(200);
    expect(zipRes.headers['content-type']).toBe('application/zip');
    expect(zipRes.headers['content-disposition']).toContain('attachment');
  });
});
