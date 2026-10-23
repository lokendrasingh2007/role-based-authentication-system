import { Request } from 'express';
import { Role, AccountStatus } from '@prisma/client';

// ─── JWT Payload ──────────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;   // user id
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

// ─── Augmented Express Request ────────────────────────────────────────────────
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

// ─── Safe User (never includes passwordHash) ─────────────────────────────────
export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Standard API Response ────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Audit Log Actions ────────────────────────────────────────────────────────
export type AuditAction =
  | 'USER_REGISTERED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'ROLE_CHANGED'
  | 'STATUS_CHANGED';
