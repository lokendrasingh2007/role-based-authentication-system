import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { sendError } from '../utils/response';

/**
 * Role-based authorization middleware factory.
 * Usage: router.get('/admin/users', authenticate, authorize('ADMIN'), handler)
 *
 * All permission checks happen server-side — never trust role data from the client.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        'You do not have permission to access this resource',
        403,
      );
      return;
    }

    next();
  };
}
