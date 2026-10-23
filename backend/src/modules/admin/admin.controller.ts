import { Request, Response, NextFunction } from 'express';
import {
  listUsersSchema,
  changeRoleSchema,
  changeStatusSchema,
  listAuditLogsSchema,
} from './admin.schema';
import * as adminService from './admin.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

export async function getUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = listUsersSchema.parse(req.query);
    const result = await adminService.listUsers(input);
    sendSuccess(res, 'Users retrieved', result.users, 200, result.pagination);
  } catch (err) {
    next(err);
  }
}

export async function getUser(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await adminService.getUserById(req.params.id);
    sendSuccess(res, 'User retrieved', user);
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const actorId = (req as unknown as AuthenticatedRequest).user.sub;
    const input = changeRoleSchema.parse(req.body);
    const user = await adminService.changeUserRole(req.params.id, actorId, input, req);
    sendSuccess(res, 'User role updated', user);
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const actorId = (req as unknown as AuthenticatedRequest).user.sub;
    const input = changeStatusSchema.parse(req.body);
    const user = await adminService.changeUserStatus(req.params.id, actorId, input, req);
    sendSuccess(res, 'User status updated', user);
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = listAuditLogsSchema.parse(req.query);
    const result = await adminService.listAuditLogs(input);
    sendSuccess(res, 'Audit logs retrieved', result.logs, 200, result.pagination);
  } catch (err) {
    next(err);
  }
}
