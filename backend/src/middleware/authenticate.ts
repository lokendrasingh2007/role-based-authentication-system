import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

/**
 * Verifies the JWT from the Authorization header or the `token` HttpOnly cookie.
 * Attaches the decoded payload to `req.user`.
 * Returns 401 for missing/invalid tokens and 401 for expired tokens.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Support both cookie-based and header-based tokens
  const cookieToken: string | undefined = (req as Request & { cookies: Record<string, string> }).cookies?.token;
  const headerToken = extractBearerToken(req.headers.authorization);
  const token = cookieToken ?? headerToken;

  if (!token) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  try {
    const payload = verifyToken(token);
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      sendError(res, 'Token has expired', 401);
      return;
    }
    sendError(res, 'Invalid token', 401);
  }
}
