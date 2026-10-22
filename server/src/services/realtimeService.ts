import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import { getDatabase } from '../db/database';
import { hashToken } from '../utils/crypto';
import { RoomEvent, RoomSession } from '../../../shared/types';

interface AuthenticatedSocket extends WebSocket {
  isAlive: boolean;
  roomId?: string;
  sessionId?: string;
}

class RealtimeService {
  private wss: WebSocketServer | null = null;
  private roomSockets = new Map<string, Set<AuthenticatedSocket>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Attach the WebSocket server to the existing HTTP server instance.
   */
  public initialize(server: HttpServer): void {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const { pathname, query } = parse(request.url || '', true);

      if (pathname === '/ws') {
        const token = query.token as string | undefined;
        const roomId = query.roomId as string | undefined;

        if (!token || !roomId) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Validate session token against database
        const db = getDatabase();
        const tokenHash = hashToken(token);
        const now = Date.now();

        const session = db
          .prepare(
            `SELECT id, room_id as roomId, token_hash as tokenHash, role, created_at as createdAt, expires_at as expiresAt, revoked_at as revokedAt
             FROM sessions
             WHERE token_hash = ? AND room_id = ? AND revoked_at IS NULL`
          )
          .get(tokenHash, roomId) as RoomSession | undefined;

        if (!session || now > session.expiresAt) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          this.wss?.emit('connection', ws, request, roomId, session.id);
        });
      }
    });

    this.wss.on('connection', (ws: WebSocket, _request: unknown, roomId: string, sessionId: string) => {
      const authWs = ws as AuthenticatedSocket;
      authWs.isAlive = true;
      authWs.roomId = roomId;
      authWs.sessionId = sessionId;

      authWs.on('pong', () => {
        authWs.isAlive = true;
      });

      // Register socket to room
      if (!this.roomSockets.has(roomId)) {
        this.roomSockets.set(roomId, new Set());
      }
      this.roomSockets.get(roomId)?.add(authWs);

      authWs.on('close', () => {
        this.removeSocket(roomId, authWs);
      });

      authWs.on('error', () => {
        this.removeSocket(roomId, authWs);
      });
    });

    // Start 30s heartbeat interval to clean up stale sockets
    this.heartbeatInterval = setInterval(() => {
      this.roomSockets.forEach((sockets) => {
        sockets.forEach((ws) => {
          if (!ws.isAlive) {
            ws.terminate();
            sockets.delete(ws);
            return;
          }
          ws.isAlive = false;
          ws.ping();
        });
      });
    }, 30000);
  }

  private removeSocket(roomId: string, ws: AuthenticatedSocket): void {
    const sockets = this.roomSockets.get(roomId);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        this.roomSockets.delete(roomId);
      }
    }
  }

  /**
   * Broadcast an event to all connected devices in a specific room.
   */
  public broadcastToRoom(roomId: string, event: RoomEvent): void {
    const sockets = this.roomSockets.get(roomId);
    if (!sockets || sockets.size === 0) return;

    const payloadString = JSON.stringify(event);

    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payloadString);
      }
    });
  }

  /**
   * Terminate all connections in a room (e.g. on room deletion or expiry).
   */
  public closeRoomConnections(roomId: string, reason = 'Room closed'): void {
    const sockets = this.roomSockets.get(roomId);
    if (!sockets) return;

    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, reason);
      }
    });
    this.roomSockets.delete(roomId);
  }

  /**
   * Cleanup resources when server shuts down.
   */
  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.wss?.close();
    this.roomSockets.clear();
  }
}

export const realtimeService = new RealtimeService();
