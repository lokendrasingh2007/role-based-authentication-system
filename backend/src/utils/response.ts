import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types';

export function sendSuccess<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200,
  pagination?: PaginationMeta,
): void {
  const body: ApiResponse<T> = { success: true, message, data, pagination };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors?: Record<string, string[]>,
): void {
  const body: ApiResponse = { success: false, message, errors };
  res.status(statusCode).json(body);
}
