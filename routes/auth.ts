import { Router, Request, Response, NextFunction } from 'express';
import { authRepository } from '../src/repositories/AuthRepository';
import { userRepository } from '../src/repositories/UserRepository';
import { authenticate } from '../src/middleware/authenticate';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_COOKIE,
  REFRESH_COOKIE_OPTIONS,
} from '../src/utils/jwt';
import { ValidationError, AppError } from '../src/errors/AppError';
import { ISignUpDTO, ISignInDTO } from '../src/interfaces/IAuth';

const router = Router();

// ─── POST /auth/signup ────────────────────────────────────────────────────────
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Partial<ISignUpDTO>;
    if (!body.email) throw new ValidationError('email is required');
    if (!body.name) throw new ValidationError('name is required');
    if (!body.password) throw new ValidationError('password is required');

    const existing = await authRepository.findByEmail(body.email);
    if (existing) throw new ValidationError('An account with this email already exists');

    const user = await userRepository.create(body as ISignUpDTO);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(201).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/signin ────────────────────────────────────────────────────────
router.post('/signin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Partial<ISignInDTO>;
    if (!body.email) throw new ValidationError('email is required');
    if (!body.password) throw new ValidationError('password is required');

    const doc = await authRepository.findByEmail(body.email);
    if (!doc) throw new AppError('Invalid email or password', 401);

    const isMatch = await doc.comparePassword(body.password);
    if (!isMatch) throw new AppError('Invalid email or password', 401);

    if (!doc.isActive) throw new AppError('Account is disabled', 403);

    const user = await authRepository.findById(doc._id.toString());
    if (!user) throw new AppError('User not found', 404);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ user, accessToken });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies[REFRESH_COOKIE] as string | undefined;
    if (!token) throw new AppError('Refresh token missing', 401);

    const payload = verifyRefreshToken(token);

    const user = await authRepository.findById(payload.sub);
    if (!user) throw new AppError('User no longer exists', 401);
    if (!user.isActive) throw new AppError('Account is disabled', 403);

    const newPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(newPayload);
    const refreshToken = signRefreshToken(newPayload);

    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
router.get('/me', authenticate, (_req: Request, res: Response) => {
  res.json({ user: res.req.user });
});

// ─── POST /auth/signout ───────────────────────────────────────────────────────
router.post('/signout', (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_OPTIONS.path });
  res.json({ message: 'Signed out successfully' });
});

export default router;
