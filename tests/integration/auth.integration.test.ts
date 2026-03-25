import request from 'supertest';
import app from '../../app';
import { connectTestDatabase, clearDatabase, closeTestDatabase } from '../setup/testDatabase';

const TEST_USER = {
  email: 'auth@example.com',
  name: 'Auth User',
  password: 'Password123!',
};

// Set JWT secrets for tests
beforeAll(() => {
  process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-that-is-long-enough-32chars';
  process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-that-is-long-enough-32chars';
  process.env['JWT_ACCESS_EXPIRES_IN'] = '15m';
  process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';
});

describe('Auth Routes Integration', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  // ─── POST /auth/signup ───────────────────────────────────────────────────────

  describe('POST /auth/signup', () => {
    it('returns 201 with user and accessToken on success', async () => {
      const res = await request(app).post('/auth/signup').send(TEST_USER);

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe(TEST_USER.email);
      expect(res.body.user.name).toBe(TEST_USER.name);
      expect(res.body.accessToken).toBeDefined();
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('never exposes password in the response', async () => {
      const res = await request(app).post('/auth/signup').send(TEST_USER);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('sets httpOnly refreshToken cookie', async () => {
      const res = await request(app).post('/auth/signup').send(TEST_USER);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toMatch(/HttpOnly/i);
    });

    it('returns 422 when email is missing', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({ name: 'Test', password: 'Password123!' });
      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(/email/i);
    });

    it('returns 422 when password is missing', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'test@example.com', name: 'Test' });
      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(/password/i);
    });

    it('returns 422 when name is missing', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'test@example.com', password: 'Password123!' });
      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(/name/i);
    });

    it('returns 422 for duplicate email', async () => {
      await request(app).post('/auth/signup').send(TEST_USER);
      const res = await request(app).post('/auth/signup').send(TEST_USER);
      expect(res.status).toBe(422);
    });

    it('returns 422 for invalid email format', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({ ...TEST_USER, email: 'not-an-email' });
      expect(res.status).toBe(422);
    });

    it('returns 422 when password is too short', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({ ...TEST_USER, password: '123' });
      expect(res.status).toBe(422);
    });
  });

  // ─── POST /auth/signin ───────────────────────────────────────────────────────

  describe('POST /auth/signin', () => {
    beforeEach(async () => {
      await request(app).post('/auth/signup').send(TEST_USER);
    });

    it('returns 200 with user and accessToken on valid credentials', async () => {
      const res = await request(app)
        .post('/auth/signin')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(TEST_USER.email);
      expect(res.body.accessToken).toBeDefined();
    });

    it('never exposes password in signin response', async () => {
      const res = await request(app)
        .post('/auth/signin')
        .send({ email: TEST_USER.email, password: TEST_USER.password });
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('sets httpOnly refreshToken cookie on signin', async () => {
      const res = await request(app)
        .post('/auth/signin')
        .send({ email: TEST_USER.email, password: TEST_USER.password });
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies?.find((c: string) => c.startsWith('refreshToken='))).toBeDefined();
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(app)
        .post('/auth/signin')
        .send({ email: TEST_USER.email, password: 'WrongPass!' });
      expect(res.status).toBe(401);
    });

    it('returns 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/auth/signin')
        .send({ email: 'ghost@example.com', password: 'Password123!' });
      expect(res.status).toBe(401);
    });

    it('returns 422 when email is missing', async () => {
      const res = await request(app)
        .post('/auth/signin')
        .send({ password: 'Password123!' });
      expect(res.status).toBe(422);
    });

    it('returns 422 when password is missing', async () => {
      const res = await request(app)
        .post('/auth/signin')
        .send({ email: TEST_USER.email });
      expect(res.status).toBe(422);
    });
  });

  // ─── POST /auth/refresh ──────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('returns a new accessToken when refresh cookie is valid', async () => {
      const signupRes = await request(app).post('/auth/signup').send(TEST_USER);
      const cookies = signupRes.headers['set-cookie'] as unknown as string[];

      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(typeof res.body.accessToken).toBe('string');
      // Token has 3 JWT segments
      expect(res.body.accessToken.split('.')).toHaveLength(3);
    });

    it('sets a new refreshToken cookie on each refresh call', async () => {
      const signupRes = await request(app).post('/auth/signup').send(TEST_USER);
      const cookies = signupRes.headers['set-cookie'] as unknown as string[];

      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', cookies);

      // A new set-cookie header with refreshToken must be present (rotation)
      const newCookies = res.headers['set-cookie'] as unknown as string[];
      expect(newCookies?.find((c: string) => c.startsWith('refreshToken='))).toBeDefined();
    });

    it('returns 401 when no refresh cookie is sent', async () => {
      const res = await request(app).post('/auth/refresh');
      expect(res.status).toBe(401);
    });

    it('returns 401 for a tampered refresh token', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', 'refreshToken=tampered.token.value');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /auth/me ────────────────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('returns the current user for a valid access token', async () => {
      const signupRes = await request(app).post('/auth/signup').send(TEST_USER);
      const { accessToken } = signupRes.body as { accessToken: string };

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(TEST_USER.email);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('returns 401 with no Authorization header', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 for a malformed token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer not.a.valid.token');
      expect(res.status).toBe(401);
    });

    it('returns 401 for a token signed with wrong secret', async () => {
      const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');
      const fakeToken = jwt.sign(
        { sub: 'fake-id', email: 'fake@test.com', role: 'user' },
        'wrong-secret'
      );
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${fakeToken}`);
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /auth/signout ──────────────────────────────────────────────────────

  describe('POST /auth/signout', () => {
    it('returns 200 and clears the refresh cookie', async () => {
      const signupRes = await request(app).post('/auth/signup').send(TEST_USER);
      const cookies = signupRes.headers['set-cookie'] as unknown as string[];

      const res = await request(app)
        .post('/auth/signout')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/signed out/i);

      const setCookies = res.headers['set-cookie'] as unknown as string[] | undefined;
      const cleared = setCookies?.find((c: string) => c.startsWith('refreshToken='));
      // Cookie is cleared (max-age=0 or expires in past)
      expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i);
    });
  });
});
