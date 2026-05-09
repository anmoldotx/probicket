import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.errorCode,
        ...(process.env.NODE_ENV !== 'production' && err.details
          ? { details: err.details }
          : {}),
      },
    });
    return;
  }

  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR' },
  });
}
