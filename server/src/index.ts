import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { DROPLET_LIMITS } from '../../shared/limits';
import { initDatabase } from './db/database';
import roomsRouter from './routes/rooms';
import itemsRouter from './routes/items';
import uploadsRouter from './routes/uploads';
import { errorHandler } from './middleware/errorHandler';
import { realtimeService } from './services/realtimeService';
import { CleanupService } from './services/cleanupService';

// Initialize SQLite database
initDatabase();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket server
realtimeService.initialize(server);

app.use(cors());
app.use(express.json({ limit: `${DROPLET_LIMITS.MAX_TEXT_SIZE_BYTES}b` }));

// Health check endpoint (Spec Section 12)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    limits: {
      roomLifetimeMs: DROPLET_LIMITS.ROOM_LIFETIME_MS,
      maxFilesPerRoom: DROPLET_LIMITS.MAX_FILES_PER_ROOM,
      maxFileSizeBytes: DROPLET_LIMITS.MAX_FILE_SIZE_BYTES,
      maxRoomBytes: DROPLET_LIMITS.MAX_ROOM_BYTES,
    },
  });
});

// Mount API Routes
app.use('/api/rooms', roomsRouter);
app.use('/api/rooms/:roomId/items', itemsRouter);
app.use('/api/rooms/:roomId/uploads', uploadsRouter);

// Serve built React frontend static files in unified deployment (Render / Production)
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback for all non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Centralized Error Handler (must be after all routes)
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  // Start 60-second periodic expiry & orphaned object cleanup worker
  CleanupService.startBackgroundWorker(60000);

  server.listen(PORT, () => {
    console.log(`[Droplet Server] Listening on port ${PORT}`);
    console.log(`[Droplet Server] Serving fullstack app on http://localhost:${PORT}`);
  });
}

export { app, server };
