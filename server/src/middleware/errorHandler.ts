import { Request, Response, NextFunction } from 'express';
import { ApiErrorCode, ApiErrorResponse } from '../../../shared/types';

export class AppError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: ApiErrorCode, message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Express body-parser entity too large error
  if ((err as any).type === 'entity.too.large' || (err as any).status === 413) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Payload exceeds the maximum permitted size limit of 100 KiB.',
      },
    };
    res.status(413).json(response);
    return;
  }

  // Generic unhandled error
  console.error('[Droplet Unhandled Error]:', err);
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal error occurred.',
    },
  };
  res.status(500).json(response);
}
