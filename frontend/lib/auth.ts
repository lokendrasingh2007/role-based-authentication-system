export type Role = 'USER' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  targetId: string;
  actorId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
