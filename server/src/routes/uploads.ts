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
 * Phase 1: Atomically validate limits, reserve upload capacity, and generate pre-signed S3 URL if cloud driver is active
 */
router.post(
  '/initiate',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<InitiateUploadResponse>>, next: NextFunction) => {
    try {
      const { roomId } = req.params;
      const { filename, sizeBytes, mimeType } = req.body;

      if (!filename || typeof filename !== 'string') {
        throw new AppError('INVALID_PAYLOAD', 'Filename is required.', 400);
      }

      if (typeof sizeBytes !== 'number' || sizeBytes <= 0) {
        throw new AppError('INVALID_PAYLOAD', 'Valid file size in bytes is required.', 400);
      }

      const result = await UploadService.initiateUpload(
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
 * Phase 2:
 * - Direct S3: Confirms direct S3 upload via JSON payload (zero server RAM consumption)
 * - Local / Fallback: Verify multipart file payload and commit capacity
 */
router.post(
  '/:uploadId/complete',
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    if (req.is('application/json')) {
      return next();
    }
    uploadMiddleware.single('file')(req, res, next);
  },
  async (req: Request, res: Response<ApiResponse<{ item: Item }>>, next: NextFunction) => {
    try {
      const { roomId, uploadId } = req.params;

      // Case A: Multipart file payload (local storage driver / test environment)
      if (req.file && req.file.buffer) {
        const originalName = req.file.originalname || req.body?.filename || 'uploaded-file';
        const mimeType = req.file.mimetype || 'application/octet-stream';

        const item = await UploadService.completeUpload(
          roomId,
          uploadId,
          req.session!,
          req.file.buffer,
          originalName,
          mimeType
        );

        return res.status(201).json({
          success: true,
          data: { item },
        });
      }

      // Case B: Direct S3 Pre-signed confirmation (zero server RAM!)
      const { filename, mimeType } = req.body || {};
      const item = await UploadService.completeDirectUpload(
        roomId,
        uploadId,
        req.session!,
        filename,
        mimeType
      );

      return res.status(201).json({
        success: true,
        data: { item },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
