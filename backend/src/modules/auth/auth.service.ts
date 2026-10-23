import { prisma } from '../../db/prisma';
import { hashPassword, comparePassword } from '../../utils/password';
import { signToken, buildPayload } from '../../utils/jwt';
import { sanitizeUser } from '../../utils/sanitize';
import { createAuditLog } from '../../utils/auditLog';
import { SafeUser } from '../../types';
import { RegisterInput, LoginInput, ChangePasswordInput } from './auth.schema';
import { Request } from 'express';

export interface AuthResult {
  user: SafeUser;
  token: string;
}

export async function registerUser(
  input: RegisterInput,
  req?: Request,
): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    const err = new Error('Email already registered') as Error & { statusCode: number };
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    },
  });

  // Log registration (actor = the new user themselves)
  await createAuditLog({
    action: 'USER_REGISTERED',
    actorId: user.id,
    targetId: user.id,
    metadata: { email: user.email },
    req,
  });

  const token = signToken(buildPayload(user));
  return { user: sanitizeUser(user), token };
}

export async function loginUser(
  input: LoginInput,
  req?: Request,
): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  // Use a constant-time comparison path to prevent timing attacks
  const isPasswordValid = user
    ? await comparePassword(input.password, user.passwordHash)
    : await comparePassword(input.password, '$2a$12$placeholderHashForTimingProtection');

  if (!user || !isPasswordValid) {
    const err = new Error('Invalid email or password') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  if (user.status === 'INACTIVE') {
    const err = new Error('Your account has been deactivated. Please contact support.') as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }

  await createAuditLog({
    action: 'USER_LOGIN',
    actorId: user.id,
    targetId: user.id,
    req,
  });

  const token = signToken(buildPayload(user));
  return { user: sanitizeUser(user), token };
}

export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const err = new Error('User not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  return sanitizeUser(user);
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  req?: Request,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const err = new Error('User not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const isValid = await comparePassword(input.currentPassword, user.passwordHash);
  if (!isValid) {
    const err = new Error('Current password is incorrect') as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }

  const newHash = await hashPassword(input.newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  await createAuditLog({
    action: 'PASSWORD_CHANGED',
    actorId: userId,
    targetId: userId,
    req,
  });
}
