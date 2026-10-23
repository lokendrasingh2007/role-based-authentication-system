import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { startTestDb, stopTestDb, cleanCollections, getTestPrisma } from './db-helpers';

// Lazy-load app AFTER env vars are set by startTestDb
let app: Express.Application;

beforeAll(async () => {
  await startTestDb();
  // Dynamic import ensures Prisma singleton is created after DATABASE_URL is set
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

async function registerUser(overrides: Record<string, string> = {}): Promise<request.Response> {
  return request(app)
    .post('/api/auth/register')
    .send({
      email: 'test@example.com',
      password: 'Test@1234!',
      firstName: 'Test',
      lastName: 'User',
      ...overrides,
    });
}

// ─── Registration ─────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('registers a new user and returns 201 with safe user data', async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      status: 'ACTIVE',
    });
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.password).toBeUndefined();
  });

  it('sets an HttpOnly cookie on successful registration', async () => {
    const res = await registerUser();
    const setCookie = res.headers['set-cookie'] as string[] | string | undefined;
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : (setCookie ?? '');
    expect(cookieStr).toContain('token=');
    expect(cookieStr.toLowerCase()).toContain('httponly');
  });

  it('returns 409 for duplicate email', async () => {
    await registerUser();
    const res = await registerUser();
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 for invalid email', async () => {
    const res = await registerUser({ email: 'not-an-email' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for weak password (no uppercase)', async () => {
    const res = await registerUser({ password: 'weakpass1!' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for weak password (no special char)', async () => {
    const res = await registerUser({ password: 'Weakpass1' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for missing required fields', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(422);
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerUser();
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Test@1234!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('test@example.com');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPass1!' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Test@1234!' });
    expect(res.status).toBe(401);
  });

  it('returns 422 for missing body', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(422);
  });

  it('returns 403 for deactivated account', async () => {
    const user = await getTestPrisma().user.findFirst({
      where: { email: 'test@example.com' },
    });
    if (user) {
      await getTestPrisma().user.update({
        where: { id: user.id },
        data: { status: 'INACTIVE' },
      });
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Test@1234!' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ─── Get Me ───────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns current user when authenticated', async () => {
    const regRes = await registerUser();
    const cookie = (regRes.headers['set-cookie'] as string[])[0];

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('test@example.com');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('clears the cookie on logout', async () => {
    const regRes = await registerUser();
    const cookie = (regRes.headers['set-cookie'] as string[])[0];

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'] as string[] | undefined;
    if (setCookie) {
      const tokenCookie = Array.isArray(setCookie)
        ? setCookie.find((c: string) => c.startsWith('token='))
        : setCookie;
      if (tokenCookie) {
        expect(tokenCookie).toMatch(/token=;|Max-Age=0/i);
      }
    }
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});

// ─── Change Password ──────────────────────────────────────────────────────────

describe('PATCH /api/auth/change-password', () => {
  let cookie: string;

  beforeEach(async () => {
    const res = await registerUser();
    cookie = (res.headers['set-cookie'] as string[])[0];
  });

  it('changes password with valid input', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({
        currentPassword: 'Test@1234!',
        newPassword: 'NewPass@5678!',
        confirmPassword: 'NewPass@5678!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 for wrong current password', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({
        currentPassword: 'WrongPass@1!',
        newPassword: 'NewPass@5678!',
        confirmPassword: 'NewPass@5678!',
      });

    expect(res.status).toBe(400);
  });

  it('returns 422 when passwords do not match', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({
        currentPassword: 'Test@1234!',
        newPassword: 'NewPass@5678!',
        confirmPassword: 'DifferentPass@1!',
      });

    expect(res.status).toBe(422);
  });

  it('returns 422 when new password is same as current', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({
        currentPassword: 'Test@1234!',
        newPassword: 'Test@1234!',
        confirmPassword: 'Test@1234!',
      });

    expect(res.status).toBe(422);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .send({
        currentPassword: 'Test@1234!',
        newPassword: 'NewPass@5678!',
        confirmPassword: 'NewPass@5678!',
      });

    expect(res.status).toBe(401);
  });
});

// ─── Password Hashing ─────────────────────────────────────────────────────────

describe('Password hashing', () => {
  it('stores a bcrypt hash, not plain-text password', async () => {
    await registerUser();
    const dbUser = await getTestPrisma().user.findFirst({
      where: { email: 'test@example.com' },
    });

    expect(dbUser).not.toBeNull();
    expect(dbUser!.passwordHash).not.toBe('Test@1234!');
    expect(dbUser!.passwordHash).toMatch(/^\$2[aby]\$/);
  });
});
