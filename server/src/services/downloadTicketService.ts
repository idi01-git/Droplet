import crypto from 'crypto';

export interface DownloadTicket {
  ticket: string;
  roomId: string;
  itemId: string; // Specific item ID or 'all' for room ZIP
  sessionId: string;
  expiresAt: number;
}

export class DownloadTicketService {
  private tickets: Map<string, DownloadTicket> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically prune expired tickets every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.pruneExpired();
    }, 60_000);

    // Ensure timer doesn't keep node process alive in tests
    if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Create a secure, cryptographically random, short-lived download ticket (default 60s TTL).
   */
  public createTicket(roomId: string, itemId: string, sessionId: string, ttlSeconds: number = 60): string {
    const ticket = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + ttlSeconds * 1000;

    this.tickets.set(ticket, {
      ticket,
      roomId,
      itemId,
      sessionId,
      expiresAt,
    });

    return ticket;
  }

  /**
   * Verify and consume (single-use) a download ticket.
   * Ensures the ticket matches roomId and itemId, and has not expired.
   */
  public verifyAndConsumeTicket(ticket: string, roomId: string, itemId: string): { sessionId: string } | null {
    const record = this.tickets.get(ticket);
    if (!record) {
      return null;
    }

    // Single-use: burn ticket immediately on use to prevent replay
    this.tickets.delete(ticket);

    const now = Date.now();
    if (now >= record.expiresAt) {
      return null;
    }

    if (record.roomId !== roomId || (record.itemId !== itemId && record.itemId !== 'all')) {
      return null;
    }

    return { sessionId: record.sessionId };
  }

  /**
   * Clean up expired tickets from memory.
   */
  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, record] of this.tickets.entries()) {
      if (now >= record.expiresAt) {
        this.tickets.delete(key);
      }
    }
  }

  /**
   * Clear all active tickets (useful for tests)
   */
  public clear(): void {
    this.tickets.clear();
  }
}

export const downloadTicketService = new DownloadTicketService();
