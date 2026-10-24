import { Router, Request, Response, NextFunction } from 'express';
import { ItemService } from '../services/itemService';
import { requireAuth } from '../middleware/auth';
import { ApiResponse, Item } from '../../../shared/types';
import { AppError } from '../middleware/errorHandler';

const router = Router({ mergeParams: true });

/**
 * POST /api/rooms/:roomId/items/text - Add text, link, or snippet
 */
router.post(
  '/text',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<{ item: Item }>>, next: NextFunction) => {
    try {
      const { roomId } = req.params;
      const { text, type } = req.body;

      if (typeof text !== 'string') {
        throw new AppError('INVALID_PAYLOAD', 'Text field is required and must be a string.', 400);
      }

      const item = await ItemService.createTextItem(roomId, req.session!, text, type);

      res.status(201).json({
        success: true,
        data: { item },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/rooms/:roomId/items/:itemId/download-url
 * Get an authorized, short-lived pre-signed download URL (60s TTL).
 * Offloads 100% of network throughput and Node memory directly to AWS S3.
 */
router.get(
  '/:itemId/download-url',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<{ url: string; isDirect: boolean; filename: string; sizeBytes: number; mimeType: string }>>, next: NextFunction) => {
    try {
      const { roomId, itemId } = req.params;
      const downloadInfo = await ItemService.getFileDownloadUrl(roomId, itemId, req.session!);

      res.status(200).json({
        success: true,
        data: downloadInfo,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/rooms/:roomId/items/:itemId/download - Download an authorized file
 * Redirects directly to pre-signed S3 URL if available, or streams via Node if local driver is used.
 */
router.get(
  '/:itemId/download',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roomId, itemId } = req.params;

      // Check if short-lived direct pre-signed URL is available
      const downloadInfo = await ItemService.getFileDownloadUrl(roomId, itemId, req.session!);
      if (downloadInfo.isDirect) {
        return res.redirect(302, downloadInfo.url);
      }

      // Fallback: Local disk streaming (local dev or unit test suite)
      const file = await ItemService.getFileDownload(roomId, itemId, req.session!);

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Length', file.sizeBytes);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);

      file.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/rooms/:roomId/items/:itemId - Delete an item (author or room owner)
 */
router.delete(
  '/:itemId',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<{ message: string }>>, next: NextFunction) => {
    try {
      const { roomId, itemId } = req.params;

      await ItemService.deleteItem(roomId, itemId, req.session!);

      res.status(200).json({
        success: true,
        data: { message: 'Item deleted successfully.' },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
