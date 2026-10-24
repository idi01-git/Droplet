import {
  ApiResponse,
  CreateRoomResponse,
  JoinRoomResponse,
  RoomDetailsResponse,
  Item,
} from '../../shared/types';

const BASE_URL = '/api';

class ApiClient {
  private getHeaders(token?: string | null): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Create a new room with an owner session
   */
  async createRoom(): Promise<CreateRoomResponse> {
    const res = await fetch(`${BASE_URL}/rooms`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    const json: ApiResponse<CreateRoomResponse> = await res.json();
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error?.message || 'Failed to create room.');
    }

    return json.data;
  }

  /**
   * Join an active room with a 4-digit code
   */
  async joinRoom(code: string): Promise<JoinRoomResponse> {
    const res = await fetch(`${BASE_URL}/rooms/join`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ code }),
    });

    const json: ApiResponse<JoinRoomResponse> = await res.json();
    if (!res.ok || !json.success || !json.data) {
      const err = new Error(json.error?.message || 'Failed to join room.');
      (err as any).code = json.error?.code;
      (err as any).lockoutRemainingMs = json.error?.lockoutRemainingMs;
      throw err;
    }

    return json.data;
  }

  /**
   * Get room metadata and items
   */
  async getRoom(roomId: string, token: string): Promise<RoomDetailsResponse> {
    const res = await fetch(`${BASE_URL}/rooms/${roomId}`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });

    const json: ApiResponse<RoomDetailsResponse> = await res.json();
    if (!res.ok || !json.success || !json.data) {
      const err = new Error(json.error?.message || 'Failed to retrieve room details.');
      (err as any).code = json.error?.code;
      throw err;
    }

    return json.data;
  }

  /**
   * Post a text note, code snippet, or link
   */
  async postTextItem(
    roomId: string,
    token: string,
    text: string,
    type?: 'text' | 'link'
  ): Promise<{ item: Item }> {
    const res = await fetch(`${BASE_URL}/rooms/${roomId}/items/text`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ text, type }),
    });

    const json: ApiResponse<{ item: Item }> = await res.json();
    if (!res.ok || !json.success || !json.data) {
      const err = new Error(json.error?.message || 'Failed to post note.');
      (err as any).code = json.error?.code;
      (err as any).status = res.status;
      throw err;
    }

    return json.data;
  }

  /**
   * Delete an item from the room
   */
  async deleteItem(roomId: string, itemId: string, token: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/rooms/${roomId}/items/${itemId}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    });

    const json: ApiResponse<{ message: string }> = await res.json();
    if (!res.ok || !json.success) {
      const err = new Error(json.error?.message || 'Failed to delete item.');
      (err as any).code = json.error?.code;
      (err as any).status = res.status;
      throw err;
    }
  }

  /**
   * Two-phase atomic upload with progress tracking
   */
  async uploadFile(
    roomId: string,
    token: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<Item> {
    // Phase 1: Initiate & reserve quota
    const initRes = await fetch(`${BASE_URL}/rooms/${roomId}/uploads/initiate`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({
        filename: file.name,
        sizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
      }),
    });

    const initJson: ApiResponse<{ uploadId: string; maxBytes: number; uploadUrl: string; isDirectS3?: boolean }> =
      await initRes.json();

    if (!initRes.ok || !initJson.success || !initJson.data) {
      const err = new Error(initJson.error?.message || 'Failed to initiate upload.');
      (err as any).code = initJson.error?.code;
      (err as any).status = initRes.status;
      throw err;
    }

    const { uploadId, uploadUrl, isDirectS3 } = initJson.data;

    // Case A: Direct AWS S3 Upload via Pre-signed PUT URL (ZERO Node server RAM/bandwidth)
    if (isDirectS3 && uploadUrl.startsWith('http')) {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentage = Math.round((event.loaded / event.total) * 100);
              onProgress(percentage);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Direct S3 upload failed with status ${xhr.status}.`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during S3 direct upload.'));
        };

        xhr.send(file);
      });

      // Confirm upload with server without sending the file payload
      const completeRes = await fetch(`${BASE_URL}/rooms/${roomId}/uploads/${uploadId}/complete`, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify({
          filename: file.name,
          sizeBytes: file.size,
          mimeType: file.type || 'application/octet-stream',
        }),
      });

      const completeJson: ApiResponse<{ item: Item }> = await completeRes.json();
      if (!completeRes.ok || !completeJson.success || !completeJson.data) {
        throw new Error(completeJson.error?.message || 'Failed to confirm upload.');
      }

      return completeJson.data.item;
    }

    // Case B: Fallback (Local Storage Driver / test environment): Multipart upload through Express
    return new Promise<Item>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/rooms/${roomId}/uploads/${uploadId}/complete`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            onProgress(percentage);
          }
        };
      }

      xhr.onload = () => {
        try {
          const json: ApiResponse<{ item: Item }> = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && json.success && json.data) {
            resolve(json.data.item);
          } else {
            reject(new Error(json.error?.message || 'Upload failed.'));
          }
        } catch {
          reject(new Error('Invalid response from server.'));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload.'));
      };

      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
    });
  }

  /**
   * Download an authorized file. Uses short-lived pre-signed S3 URL if available,
   * completely offloading file bandwidth and memory from the server.
   */
  async downloadFile(roomId: string, itemId: string, token: string, filename: string): Promise<void> {
    try {
      const urlRes = await fetch(`${BASE_URL}/rooms/${roomId}/items/${itemId}/download-url`, {
        method: 'GET',
        headers: this.getHeaders(token),
      });

      if (urlRes.ok) {
        const urlJson: ApiResponse<{ url: string; isDirect: boolean }> = await urlRes.json();
        if (urlJson.success && urlJson.data) {
          if (urlJson.data.isDirect) {
            // Direct download from AWS S3 pre-signed URL (zero server RAM/bandwidth!)
            const a = document.createElement('a');
            a.href = urlJson.data.url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
          }
        }
      }
    } catch {
      // Fall through to streaming endpoint
    }

    // Fallback: Stream directly through Node server (local driver / tests)
    const res = await fetch(`${BASE_URL}/rooms/${roomId}/items/${itemId}/download`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });

    if (!res.ok) {
      throw new Error('Failed to download file.');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Download all room files and notes as a single ZIP archive
   */
  async downloadAllZip(roomId: string, token: string, roomCode: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/rooms/${roomId}/download-all`, {
      method: 'GET',
      headers: this.getHeaders(token),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error?.message || 'Failed to download ZIP archive.');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `droplet-room-${roomCode}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Delete room immediately (Owner only)
   */
  async deleteRoom(roomId: string, token: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/rooms/${roomId}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    });

    const json: ApiResponse<{ message: string }> = await res.json();
    if (!res.ok || !json.success) {
      const err = new Error(json.error?.message || 'Failed to delete room.');
      (err as any).code = json.error?.code;
      (err as any).status = res.status;
      throw err;
    }
  }
}

export const api = new ApiClient();
