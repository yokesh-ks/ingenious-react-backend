import jwt from 'jsonwebtoken';
import { ITokenPayload } from '../interfaces/IAuth';
import { AppError } from '../errors/AppError';

function getSecret(envVar: string): string {
  const secret = process.env[envVar];
  if (!secret) throw new AppError(`${envVar} environment variable is not set`, 500, false);
  return secret;
}

export function signAccessToken(payload: ITokenPayload): string {
  return jwt.sign(payload, getSecret('JWT_ACCESS_SECRET'), {
    expiresIn: (process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m') as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: ITokenPayload): string {
  return jwt.sign(payload, getSecret('JWT_REFRESH_SECRET'), {
    expiresIn: (process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d') as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): ITokenPayload {
  try {
    return jwt.verify(token, getSecret('JWT_ACCESS_SECRET')) as ITokenPayload;
  } catch {
    throw new AppError('Invalid or expired access token', 401);
  }
}

export function verifyRefreshToken(token: string): ITokenPayload {
  try {
    return jwt.verify(token, getSecret('JWT_REFRESH_SECRET')) as ITokenPayload;
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }
}

export const REFRESH_COOKIE = 'refreshToken';

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/auth/refresh',
};
