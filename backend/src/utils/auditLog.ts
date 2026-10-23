import { prisma } from '../db/prisma';
import { AuditAction } from '../types';
import { Request } from 'express';

interface CreateAuditLogParams {
  action: AuditAction;
  actorId: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}

export async function createAuditLog({
  action,
  actorId,
  targetId,
  metadata = {},
  req,
}: CreateAuditLogParams): Promise<void> {
  const enrichedMetadata = {
    ...metadata,
    ...(req && {
      ip: req.ip ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    }),
  };

  await prisma.auditLog.create({
    data: {
      action,
      actorId,
      targetId,
      metadata: enrichedMetadata,
    },
  });
}
