import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { Item, RoomEvent } from '../../shared/types';

export interface UseRoomSyncOptions {
  roomId: string;
  sessionToken: string;
  onRoomExpired?: (reason?: string) => void;
}

export function useRoomSync({ roomId, sessionToken, onRoomExpired }: UseRoomSyncOptions) {
  const [items, setItems] = useState<Item[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);

  // Fetch full snapshot from API
  const refreshSnapshot = useCallback(async () => {
    try {
      const details = await api.getRoom(roomId, sessionToken);
      setItems(details.items);
      setError(null);
    } catch (err: any) {
      if (err.code === 'ROOM_EXPIRED' || err.code === 'ROOM_NOT_FOUND') {
        onRoomExpired?.(err.message || 'Room is no longer accessible.');
      } else {
        setError(err.message || 'Failed to refresh room items.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [roomId, sessionToken, onRoomExpired]);

  // Connect WebSocket
  useEffect(() => {
    let isDisposed = false;

    // Initial snapshot fetch
    refreshSnapshot();

    const connectWebSocket = () => {
      if (isDisposed) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(
        sessionToken
      )}&roomId=${encodeURIComponent(roomId)}`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isDisposed) {
          ws.close();
          return;
        }
        setIsConnected(true);
        reconnectAttemptRef.current = 0;
        // Re-sync snapshot on reconnection to guarantee zero state drift
        refreshSnapshot();
      };

      ws.onmessage = (event) => {
        try {
          const roomEvent: RoomEvent = JSON.parse(event.data);

          if (roomEvent.type === 'ITEM_ADDED' && roomEvent.payload.item) {
            setItems((prev) => {
              // Avoid duplicates
              if (prev.some((i) => i.id === roomEvent.payload.item!.id)) return prev;
              // Prepend newest item so it appears at top
              return [roomEvent.payload.item!, ...prev];
            });
          } else if (roomEvent.type === 'ITEM_DELETED' && roomEvent.payload.itemId) {
            setItems((prev) => prev.filter((i) => i.id !== roomEvent.payload.itemId));
          } else if (roomEvent.type === 'ROOM_DELETED' || roomEvent.type === 'ROOM_EXPIRED') {
            onRoomExpired?.(roomEvent.payload.reason || 'This room has closed.');
          }
        } catch (e) {
          console.error('Failed to parse incoming WebSocket message', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (!isDisposed) {
          // Exponential backoff reconnect
          const backoff = Math.min(1000 * Math.pow(1.5, reconnectAttemptRef.current), 10000);
          reconnectAttemptRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, backoff);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      isDisposed = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [roomId, sessionToken, refreshSnapshot, onRoomExpired]);

  // Methods to post & delete items
  const postTextItem = async (text: string, type?: 'text' | 'link') => {
    const res = await api.postTextItem(roomId, sessionToken, text, type);
    // Optimistically add item if not yet received via WS
    setItems((prev) => {
      if (prev.some((i) => i.id === res.item.id)) return prev;
      return [...prev, res.item];
    });
    return res.item;
  };

  const deleteItem = async (itemId: string) => {
    await api.deleteItem(roomId, itemId, sessionToken);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  return {
    items,
    isConnected,
    isLoading,
    error,
    postTextItem,
    deleteItem,
    refreshSnapshot,
  };
}
