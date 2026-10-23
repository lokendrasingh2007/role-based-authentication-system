import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as adminController from './admin.controller';

const router = Router();

// Apply authentication + ADMIN authorization to every route in this router
const adminGuard = [
  (req: Request, res: Response, next: NextFunction) => authenticate(req, res, next),
  (req: Request, res: Response, next: NextFunction) => authorize('ADMIN')(req as never, res, next),
];

router.get('/users', ...adminGuard, adminController.getUsers);
router.get('/users/:id', ...adminGuard, adminController.getUser);
router.patch('/users/:id/role', ...adminGuard, adminController.updateUserRole);
router.patch('/users/:id/status', ...adminGuard, adminController.updateUserStatus);
router.get('/audit-logs', ...adminGuard, adminController.getAuditLogs);

export default router;
