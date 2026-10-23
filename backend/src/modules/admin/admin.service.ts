import { Prisma, Role, AccountStatus } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { sanitizeUser } from '../../utils/sanitize';
import { createAuditLog } from '../../utils/auditLog';
import { SafeUser, PaginationMeta } from '../../types';
import {
  ListUsersInput,
  ChangeRoleInput,
  ChangeStatusInput,
  ListAuditLogsInput,
} from './admin.schema';
import { Request } from 'express';

export interface PaginatedUsers {
  users: SafeUser[];
  pagination: PaginationMeta;
}

export async function listUsers(input: ListUsersInput): Promise<PaginatedUsers> {
  const { page, limit, search, role, status } = input;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    ...(role && { role }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(sanitizeUser),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserById(id: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    const err = new Error('User not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return sanitizeUser(user);
}

export async function changeUserRole(
  targetId: string,
  actorId: string,
  input: ChangeRoleInput,
  req?: Request,
): Promise<SafeUser> {
  // Prevent privilege escalation: admins cannot change their own role
  if (targetId === actorId) {
    const err = new Error('Admins cannot change their own role') as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) {
    const err = new Error('User not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const previousRole: Role = user.role;

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { role: input.role },
  });

  await createAuditLog({
    action: 'ROLE_CHANGED',
    actorId,
    targetId,
    metadata: { before: { role: previousRole }, after: { role: input.role } },
    req,
  });

  return sanitizeUser(updated);
}

export async function changeUserStatus(
  targetId: string,
  actorId: string,
  input: ChangeStatusInput,
  req?: Request,
): Promise<SafeUser> {
  // Prevent admins from deactivating their own account
  if (targetId === actorId) {
    const err = new Error('Admins cannot change their own account status') as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) {
    const err = new Error('User not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const previousStatus: AccountStatus = user.status;

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { status: input.status },
  });

  await createAuditLog({
    action: 'STATUS_CHANGED',
    actorId,
    targetId,
    metadata: {
      before: { status: previousStatus },
      after: { status: input.status },
    },
    req,
  });

  return sanitizeUser(updated);
}

export interface PaginatedAuditLogs {
  logs: Array<{
    id: string;
    action: string;
    targetId: string;
    actorId: string;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }>;
  pagination: PaginationMeta;
}

export async function listAuditLogs(
  input: ListAuditLogsInput,
): Promise<PaginatedAuditLogs> {
  const { page, limit, targetId, actorId, action } = input;
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {
    ...(targetId && { targetId }),
    ...(actorId && { actorId }),
    ...(action && { action: { contains: action, mode: 'insensitive' } }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
