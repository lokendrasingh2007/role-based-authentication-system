import { Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema, changePasswordSchema } from './auth.schema';
import * as authService from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { env } from '../../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 15 * 60 * 1000, // 15 minutes — matches JWT_EXPIRES_IN
  path: '/',
};

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.registerUser(input, req);

    res.cookie('token', result.token, COOKIE_OPTIONS);
    sendSuccess(res, 'Registration successful', result.user, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.loginUser(input, req);

    res.cookie('token', result.token, COOKIE_OPTIONS);
    sendSuccess(res, 'Login successful', result.user);
  } catch (err) {
    next(err);
  }
}

export async function logout(
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  // Clear the HttpOnly cookie by setting it to expire immediately
  res.clearCookie('token', { path: '/' });
  sendSuccess(res, 'Logged out successfully');
}

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub: userId } = (req as AuthenticatedRequest).user;
    const user = await authService.getCurrentUser(userId);
    sendSuccess(res, 'User profile retrieved', user);
  } catch (err) {
    next(err);
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sub: userId } = (req as AuthenticatedRequest).user;
    const input = changePasswordSchema.parse(req.body);
    await authService.changePassword(userId, input, req);

    // Invalidate current cookie — user must re-login after password change
    res.clearCookie('token', { path: '/' });
    sendSuccess(res, 'Password changed successfully. Please log in again.');
  } catch (err) {
    next(err);
  }
}

export function healthCheck(_req: Request, res: Response): void {
  sendError(res, 'Not found', 404);
}
