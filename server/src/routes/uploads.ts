import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { UploadService } from '../services/uploadService';
import { requireAuth } from '../middleware/auth';
import { ApiResponse, InitiateUploadResponse, Item } from '../../../shared/types';
import { AppError } from '../middleware/errorHandler';
import { DROPLET_LIMITS } from '../../../shared/limits';

const router = Router({ mergeParams: true });

// Multer memory storage bounded at 10 MiB per file
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: DROPLET_LIMITS.MAX_FILE_SIZE_BYTES,
  },
});

/**
 * POST /api/rooms/:roomId/uploads/initiate
 * Phase 1: Atomically validate limits and reserve upload capacity
 */
router.post(
  '/initiate',
  requireAuth,
  (req: Request, res: Response<ApiResponse<InitiateUploadResponse>>, next: NextFunction) => {
    try {
      const { roomId } = req.params;
      const { filename, sizeBytes, mimeType } = req.body;

      if (!filename || typeof filename !== 'string') {
        throw new AppError('INVALID_PAYLOAD', 'Filename is required.', 400);
      }

      if (typeof sizeBytes !== 'number' || sizeBytes <= 0) {
        throw new AppError('INVALID_PAYLOAD', 'Valid file size in bytes is required.', 400);
      }

      const result = UploadService.initiateUpload(
        roomId,
        req.session!,
        filename,
        sizeBytes,
        mimeType
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/rooms/:roomId/uploads/:uploadId/complete
 * Phase 2: Verify file payload, store in private storage, and commit capacity
 */
router.post(
  '/:uploadId/complete',
  requireAuth,
  uploadMiddleware.single('file'),
  async (req: Request, res: Response<ApiResponse<{ item: Item }>>, next: NextFunction) => {
    try {
      const { roomId, uploadId } = req.params;

      if (!req.file || !req.file.buffer) {
        throw new AppError('INVALID_PAYLOAD', 'File payload is missing from upload request.', 400);
      }

      const originalName = req.file.originalname || req.body.filename || 'uploaded-file';
      const mimeType = req.file.mimetype || 'application/octet-stream';

      const item = await UploadService.completeUpload(
        roomId,
        uploadId,
        req.session!,
        req.file.buffer,
        originalName,
        mimeType
      );

      res.status(201).json({
        success: true,
        data: { item },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
