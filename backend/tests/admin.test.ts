import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { hashPassword } from '../src/utils/password';
import { startTestDb, stopTestDb, cleanCollections, getTestPrisma } from './db-helpers';

let app: Express.Application;

beforeAll(async () => {
  await startTestDb();
  const { default: expressApp } = await import('../src/app');
  app = expressApp;
}, 60_000);

afterAll(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await cleanCollections(getTestPrisma());
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createUser(overrides: Partial<{
  email: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
}> = {}): Promise<string> {
  const passwordHash = await hashPassword('Test@1234!');
  const user = await getTestPrisma().user.create({
    data: {
      email: overrides.email ?? 'user@example.com',
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      role: overrides.role ?? 'USER',
      status: overrides.status ?? 'ACTIVE',
    },
  });
  return user.id;
}

async function loginAs(email: string, password = 'Test@1234!'): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  const cookies = res.headers['set-cookie'] as string[];
  return Array.isArray(cookies) ? cookies[0] : cookies;
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  it('returns user list for ADMIN', async () => {
    await createUser({ email: 'admin@example.com', role: 'ADMIN' });
    await createUser({ email: 'user1@example.com' });
    const cookie = await loginAs('admin@example.com');

    const res = await request(app)
      .get('/api/admin/users')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
  });

  it('returns 403 for USER role', async () => {
    await createUser({ email: 'user@example.com', role: 'USER' });
    const cookie = await loginAs('user@example.com');

    const res = await request(app)
      .get('/api/admin/users')
      .set('Cookie', cookie);

    expect(res.status).toBe(403);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('supports search by email', async () => {
    await createUser({ email: 'admin@example.com', role: 'ADMIN' });
    await createUser({ email: 'findme@example.com' });
    await createUser({ email: 'other@example.com' });
    const cookie = await loginAs('admin@example.com');

    const res = await request(app)
      .get('/api/admin/users?search=findme')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.some((u: { email: string }) => u.email === 'findme@example.com')).toBe(true);
  });

  it('supports pagination', async () => {
    await createUser({ email: 'admin@example.com', role: 'ADMIN' });
    const cookie = await loginAs('admin@example.com');

    const res = await request(app)
      .get('/api/admin/users?page=1&limit=1')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(1);
  });

  it('never returns passwordHash in user list', async () => {
    await createUser({ email: 'admin@example.com', role: 'ADMIN' });
    const cookie = await loginAs('admin@example.com');

    const res = await request(app)
      .get('/api/admin/users')
      .set('Cookie', cookie);

    for (const user of res.body.data) {
      expect(user.passwordHash).toBeUndefined();
    }
  });
});

// ─── PATCH /api/admin/users/:id/role ─────────────────────────────────────────

describe('PATCH /api/admin/users/:id/role', () => {
  it('changes a user role to ADMIN', async () => {
    await createUser({ email: 'admin@example.com', role: 'ADMIN' });
    const targetId = await createUser({ email: 'target@example.com', role: 'USER' });
    const cookie = await loginAs('admin@example.com');

    const res = await request(app)
      .patch(`/api/admin/users/${targetId}/role`)
      .set('Cookie', cookie)
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('ADMIN');
  });

  it('returns 403 when admin tries to change their own role', async () => {
    const adminId = await createUser({ email: 'admin@example.com', role: 'ADMIN' });
    const cookie = await loginAs('admin@example.com');

    const res = await request(app)
      .patch(`/api/admin/users/${adminId}/role`)
      .set('Cookie', cookie)
      .send({ role: 'USER' });

    expect(res.status).toBe(403);
  });

  it('returns 403 for USER attempting role change', async () => {
    await createUser({ email: 'user@example.com', role: 'USER' });
    const targetId = await createUser({ email: 'target@example.com', role: 'USER' });
    const cookie = await loginAs('user@example.com');

    const res = await request(app)
      .patch(`/api/admin/users/${targetId}/role`)
      .set('Cookie', cookie)
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
  });

  it('returns 422 for invalid role value', async () => {
    await createUser({ email: 'admin@example.com', role: 'ADMIN' });
    const targetId = await createUser({ email: 'target@example.com' });
    const cookie = await loginAs('admin@example.com');

    const res = await request(app)
      .patch(`/api/admin/users/${targetId}/role`)
      .set('Cookie', cookie)
      .send({ role: 'SUPERUSER' });

    expect(res.status).toBe(422);
  });
});

// ─── PATCH /api/admin/users/:id/status ───────────────────────────────────────

describe('PATCH /api/admin/users/:id/status', () => {
  it('deactivates a user account', async () => {
    await createUser({ email: 'admin@example.com', role: 'ADMIN' });
    const targetId = await createUser({ email: 'target@example.com' });
    const cookie = await loginAs('admin@example.com');

    const res = await request(app)
      .patch(`/api/admin/users/${targetId}/status`)
      .set('Cookie', cookie)
      .send({ status: 'INACTIVE' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('INACTIVE');
  });

  it('returns 403 when admin tries to deactivate own account', async () => {
    const adminId = await createUser({ email: 'admin@example.com', role: 'ADMIN' });
    const cookie = await loginAs('admin@example.com');

    const res = await request(app)
      .patch(`/api/admin/users/${adminId}/status`)
      .set('Cookie', cookie)
      .send({ status: 'INACTIVE' });

    expect(res.status).toBe(403);
  });

  it('deactivated users cannot log in', async () => {
    await createUser({ email: 'admin@example.com', role: 'ADMIN' });
    const targetId = await createUser({ email: 'victim@example.com' });
    const adminCookie = await loginAs('admin@example.com');

    // Deactivate the victim user
    await request(app)
      .patch(`/api/admin/users/${targetId}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'INACTIVE' });

    // Attempt login as deactivated user
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'victim@example.com', password: 'Test@1234!' });

    expect(loginRes.status).toBe(403);
  });
});

// ─── GET /api/admin/audit-logs ────────────────────────────────────────────────

describe('GET /api/admin/audit-logs', () => {
  it('returns audit logs for ADMIN', async () => {
    await createUser({ email: 'admin@example.com', role: 'ADMIN' });
    const cookie = await loginAs('admin@example.com');

    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('returns 403 for regular USER', async () => {
    await createUser({ email: 'user@example.com', role: 'USER' });
    const cookie = await loginAs('user@example.com');

    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Cookie', cookie);

    expect(res.status).toBe(403);
  });
});

// ─── Privilege Escalation ─────────────────────────────────────────────────────

describe('Privilege escalation prevention', () => {
  it('USER cannot access any /api/admin/* endpoint', async () => {
    await createUser({ email: 'user@example.com', role: 'USER' });
    const cookie = await loginAs('user@example.com');

    const endpoints = [
      { method: 'get' as const, path: '/api/admin/users' },
      { method: 'get' as const, path: '/api/admin/audit-logs' },
    ];

    for (const ep of endpoints) {
      const res = await request(app)[ep.method](ep.path).set('Cookie', cookie);
      expect(res.status).toBe(403);
    }
  });
});
