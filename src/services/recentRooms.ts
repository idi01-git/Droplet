export interface RecentRoom {
  code: string;
  id: string;
  token?: string;
  role?: 'owner' | 'guest';
  expiresAt: number;
  lastVisited: number;
}

const STORAGE_KEY = 'droplet:recent_rooms';
export const MAX_ACTIVE_CREATED_ROOMS = 3;

export const recentRoomsService = {
  /**
   * Get all unexpired rooms
   */
  getRecentRooms(): RecentRoom[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const list: RecentRoom[] = JSON.parse(data);
      const now = Date.now();
      // Filter out expired rooms automatically
      const valid = list.filter((r) => r.expiresAt > now);
      if (valid.length !== list.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      }
      return valid.sort((a, b) => b.lastVisited - a.lastVisited);
    } catch {
      return [];
    }
  },

  /**
   * Only show rooms that were created by this user (role === 'owner')
   */
  getCreatedRooms(): RecentRoom[] {
    return this.getRecentRooms().filter((r) => r.role === 'owner');
  },

  /**
   * Verify created rooms against the server to purge any rooms that were deleted
   */
  async verifyAndPruneDeletedRooms(
    checkRoomFn: (roomId: string, token: string) => Promise<any>
  ): Promise<RecentRoom[]> {
    const created = this.getCreatedRooms();
    const staleCodes: string[] = [];

    await Promise.all(
      created.map(async (room) => {
        if (!room.token) return;
        try {
          await checkRoomFn(room.id, room.token);
        } catch {
          // Room does not exist anymore (deleted or expired on server)
          staleCodes.push(room.code);
        }
      })
    );

    if (staleCodes.length > 0) {
      staleCodes.forEach((code) => this.removeRecentRoom(code));
    }

    return this.getCreatedRooms();
  },

  addRecentRoom(
    room: { code: string; id: string; expiresAt: number; isOwner?: boolean },
    token?: string
  ): void {
    try {
      const list = this.getRecentRooms().filter((r) => r.code !== room.code);
      const updated: RecentRoom[] = [
        {
          code: room.code,
          id: room.id,
          token,
          role: (room.isOwner ? 'owner' : 'guest') as 'owner' | 'guest',
          expiresAt: room.expiresAt,
          lastVisited: Date.now(),
        },
        ...list,
      ].slice(0, 5); // Keep up to 5 recent rooms
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage access blocked or quota exceeded
    }
  },

  removeRecentRoom(code: string): void {
    try {
      const list = this.getRecentRooms().filter((r) => r.code !== code);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Storage access blocked
    }
  },

  clearRecentRooms(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage access blocked
    }
  },
};

export default recentRoomsService;
