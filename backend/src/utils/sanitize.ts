import { User } from '@prisma/client';
import { SafeUser } from '../types';

/**
 * Strips passwordHash (and any other internal fields) before sending to clients.
 * Always call this before returning user data from any controller.
 */
export function sanitizeUser(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _pw, ...safe } = user;
  return safe;
}
