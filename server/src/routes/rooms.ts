import { Router, Request, Response, NextFunction } from 'express';
import { RoomService } from '../services/roomService';
import { ArchiveService } from '../services/archiveService';
import { requireAuth, requireOwner } from '../middleware/auth';
import {
  rateLimitRoomCreation,
  checkFailedJoinLockout,
  recordFailedJoinAttempt,
  clearFailedJoinAttempts,
} from '../middleware/rateLimit';
import { ApiResponse, CreateRoomResponse, JoinRoomResponse, RoomDetailsResponse } from '../../../shared/types';
import { AppError } from '../middleware/errorHandler';

const router = Router();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

/**
 * POST /api/rooms - Create a new room with an owner session
 */
router.post(
  '/',
  rateLimitRoomCreation,
  (req: Request, res: Response<ApiResponse<CreateRoomResponse>>, next: NextFunction) => {
    try {
      const ip = getClientIp(req);
      const result = RoomService.createRoom(ip);

      res.status(201).json({
        success: true,
        data: {
          room: result.room,
          sessionToken: result.sessionToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/rooms/join - Join an active room with 4-digit code
 */
router.post(
  '/join',
  checkFailedJoinLockout,
  (req: Request, res: Response<ApiResponse<JoinRoomResponse>>, next: NextFunction) => {
    const ip = getClientIp(req);
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      recordFailedJoinAttempt(ip);
      return next(new AppError('INVALID_CODE', 'A 4-digit room code is required.', 400));
    }

    try {
      const result = RoomService.joinRoom(code.trim());
      // Clear failed attempts upon successful join
      clearFailedJoinAttempts(ip);

      res.status(200).json({
        success: true,
        data: {
          room: result.room,
          sessionToken: result.sessionToken,
        },
      });
    } catch (err: any) {
      const lockStatus = recordFailedJoinAttempt(ip);
      if (lockStatus.locked) {
        return next(
          new AppError(
            'LOCKOUT_ACTIVE',
            `Too many failed attempts. Locked out for ${Math.ceil(lockStatus.remainingMs / 1000)} seconds.`,
            429,
            { lockoutRemainingMs: lockStatus.remainingMs }
          )
        );
      }
      next(err);
    }
  }
);

/**
 * GET /api/rooms/:roomId - Retrieve authorized room metadata and items
 */
router.get(
  '/:roomId',
  requireAuth,
  (req: Request, res: Response<ApiResponse<RoomDetailsResponse>>, next: NextFunction) => {
    try {
      const { roomId } = req.params;
      const details = RoomService.getRoomDetails(roomId, req.session!);

      res.status(200).json({
        success: true,
        data: details,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/rooms/:roomId - Owner-only immediate room deletion
 */
router.delete(
  '/:roomId',
  requireAuth,
  requireOwner,
  (req: Request, res: Response<ApiResponse<{ message: string }>>, next: NextFunction) => {
    try {
      const { roomId } = req.params;
      // Ensure the owner can only delete their own room
      if (req.room?.id !== roomId) {
        throw new AppError('FORBIDDEN', 'Cannot delete a room other than the authenticated room.', 403);
      }

      RoomService.deleteRoom(roomId);

      res.status(200).json({
        success: true,
        data: { message: 'Room successfully deleted.' },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/rooms/:roomId/download-all - Download all room files as a bounded ZIP
 */
router.get(
  '/:roomId/download-all',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roomId } = req.params;
      const archive = await ArchiveService.createRoomZip(roomId, req.session!);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Length', archive.totalBytes);
      res.setHeader('Content-Disposition', `attachment; filename="${archive.filename}"`);

      res.send(archive.buffer);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
