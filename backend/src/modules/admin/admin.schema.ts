import { z } from 'zod';
import { Role, AccountStatus } from '@prisma/client';

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(AccountStatus).optional(),
});

export const changeRoleSchema = z.object({
  role: z.nativeEnum(Role, { errorMap: () => ({ message: 'Invalid role' }) }),
});

export const changeStatusSchema = z.object({
  status: z.nativeEnum(AccountStatus, { errorMap: () => ({ message: 'Invalid status' }) }),
});

export const listAuditLogsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  targetId: z.string().optional(),
  actorId: z.string().optional(),
  action: z.string().optional(),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type ListAuditLogsInput = z.infer<typeof listAuditLogsSchema>;
