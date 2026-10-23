import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';
import { env } from '../config/env';

/**
 * Global Express error handler.
 * Must be registered LAST with app.use().
 * Handles Prisma errors, Zod validation errors, and generic errors.
 * Never leaks stack traces in production.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation error
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const field = issue.path.join('.');
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    }
    sendError(res, 'Validation failed', 422, fieldErrors);
    return;
  }

  // Prisma unique constraint violation (e.g. duplicate email)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[]) ?? ['field'];
      sendError(res, `${fields.join(', ')} already exists`, 409);
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'Record not found', 404);
      return;
    }
    // Other Prisma errors — don't expose internal details
    sendError(res, 'Database error', 500);
    return;
  }

  // Prisma validation error (e.g. bad ObjectId format)
  if (err instanceof Prisma.PrismaClientValidationError) {
    sendError(res, 'Invalid request data', 400);
    return;
  }

  // Generic Error
  if (err instanceof Error) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    const message =
      env.NODE_ENV === 'production' && statusCode >= 500
        ? 'Internal server error'
        : err.message;
    sendError(res, message, statusCode);
    return;
  }

  sendError(res, 'Internal server error', 500);
}
