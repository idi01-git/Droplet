import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server/src/index';

describe('Server Health API (Spec Section 12)', () => {
  it('GET /api/health returns 200 with server status and limits summary', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.limits).toBeDefined();
    expect(res.body.limits.maxFilesPerRoom).toBe(20);
    expect(res.body.limits.maxFileSizeBytes).toBe(50 * 1024 * 1024);
    expect(res.body.limits.maxRoomBytes).toBe(200 * 1024 * 1024);
  });
});
