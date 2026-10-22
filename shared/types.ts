/**
 * DROPLET - Shared TypeScript Contracts & Data Models
 * Source of truth: Droplet_Agent_Spec.md Sections 4, 9, 12
 */

export type RoomStatus = 'active' | 'expired' | 'deleting' | 'deleted';
export type SessionRole = 'owner' | 'participant';
export type ItemType = 'text' | 'link' | 'file';
export type UploadReservationStatus = 'pending' | 'completed' | 'cancelled' | 'timed_out';

export interface Room {
  id: string;
  code?: string; // Displayed only to room members
  createdAt: number; // Unix epoch ms
  expiresAt: number; // Unix epoch ms (created_at + 24 hours)
  status: RoomStatus;
  usedBytes: number;
  reservedBytes: number;
  fileCount: number;
  isOwner?: boolean;
}

export interface RoomSummary {
  id: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  status: RoomStatus;
  usedBytes: number;
  reservedBytes: number;
  fileCount: number;
  isOwner: boolean;
  timeRemainingMs: number;
}

export interface Item {
  id: string;
  roomId: string;
  type: ItemType;
  textContent?: string;
  filename?: string;
  sizeBytes: number;
  mimeType?: string;
  createdAt: number;
  downloadUrl?: string;
}

export interface UploadReservation {
  id: string;
  roomId: string;
  sessionId: string;
  expectedBytes: number;
  createdAt: number;
  expiresAt: number;
  status: UploadReservationStatus;
}

export interface RoomSession {
  id: string;
  roomId: string;
  tokenHash: string;
  role: SessionRole;
  createdAt: number;
  expiresAt: number;
  revokedAt?: number;
}

/** Standard Error Codes specified in Droplet_Agent_Spec.md Section 12 */
export type ApiErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_EXPIRED'
  | 'INVALID_CODE'
  | 'RATE_LIMITED'
  | 'FILE_TOO_LARGE'
  | 'ROOM_QUOTA_EXCEEDED'
  | 'GLOBAL_CAPACITY_REACHED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'UPLOAD_FAILED'
  | 'ARCHIVE_LIMIT_EXCEEDED'
  | 'INVALID_PAYLOAD'
  | 'LOCKOUT_ACTIVE'
  | 'INTERNAL_ERROR';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
  lockoutRemainingMs?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export type ApiErrorResponse = ApiResponse<never>;

// Room API Request/Response
export interface CreateRoomResponse {
  room: RoomSummary;
  sessionToken: string;
}

export interface JoinRoomRequest {
  code: string;
}

export interface JoinRoomResponse {
  room: RoomSummary;
  sessionToken: string;
}

export interface RoomDetailsResponse {
  room: RoomSummary;
  items: Item[];
}

export interface CreateTextItemRequest {
  text: string;
  type?: 'text' | 'link';
}

export interface InitiateUploadRequest {
  filename: string;
  sizeBytes: number;
  mimeType?: string;
}

export interface InitiateUploadResponse {
  uploadId: string;
  maxBytes: number;
  uploadUrl: string;
}

// Realtime Event definitions
export type RoomEventType =
  | 'ITEM_ADDED'
  | 'ITEM_DELETED'
  | 'ROOM_STATS_UPDATED'
  | 'ROOM_EXPIRED'
  | 'ROOM_DELETED';

export interface RoomEvent {
  type: RoomEventType;
  roomId: string;
  timestamp: number;
  payload: {
    item?: Item;
    itemId?: string;
    stats?: {
      usedBytes: number;
      fileCount: number;
      expiresAt: number;
    };
    reason?: string;
  };
}
