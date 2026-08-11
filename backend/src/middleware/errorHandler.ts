import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

// Centralized error handler. Every thrown error in the app - whether an
// AppError, a Zod validation error, or a Prisma error - is normalized into
// the same JSON error shape here. Internal details/stack traces are never
// leaked to the client in production.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return res.status(409).json({
        success: false,
        error: { message: `A record with this ${target} already exists` },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, error: { message: 'Record not found' } });
    }
    return res.status(400).json({ success: false, error: { message: 'Database request error' } });
  }

  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    success: false,
    error: { message: isProd ? 'Internal server error' : (err as Error)?.message ?? 'Internal server error' },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}
