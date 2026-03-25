import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../errors/AppError';
import { userRepository } from '../repositories/UserRepository';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authorization header missing or malformed', 401);
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    const user = await userRepository.findById(payload.sub);
    if (!user) throw new AppError('User no longer exists', 401);
    if (!user.isActive) throw new AppError('Account is disabled', 403);

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function authorize(...roles: string[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const user = res.req.user;
    if (!user || !roles.includes(user.role)) {
      next(new AppError('Insufficient permissions', 403));
      return;
    }
    next();
  };
}
