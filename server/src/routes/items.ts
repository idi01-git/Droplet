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
  (req: Request, res: Response<ApiResponse<{ item: Item }>>, next: NextFunction) => {
    try {
      const { roomId } = req.params;
      const { text, type } = req.body;

      if (typeof text !== 'string') {
        throw new AppError('INVALID_PAYLOAD', 'Text field is required and must be a string.', 400);
      }

      const item = ItemService.createTextItem(roomId, req.session!, text, type);

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
 * GET /api/rooms/:roomId/items/:itemId/download - Download an authorized file
 */
router.get(
  '/:itemId/download',
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roomId, itemId } = req.params;
      const file = ItemService.getFileDownload(roomId, itemId, req.session!);

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
