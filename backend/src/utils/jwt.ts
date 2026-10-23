import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types';
import { Role } from '@prisma/client';

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof (decoded as JwtPayload).sub !== 'string' ||
    typeof (decoded as JwtPayload).email !== 'string'
  ) {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }

  return decoded as JwtPayload;
}

/**
 * Extracts a bearer token from an Authorization header.
 * Returns null if the header is absent or malformed.
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Build a safe JWT payload from DB user fields.
 */
export function buildPayload(user: {
  id: string;
  email: string;
  role: Role;
}): Omit<JwtPayload, 'iat' | 'exp'> {
  return { sub: user.id, email: user.email, role: user.role };
}
