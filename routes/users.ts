import { Router, Request, Response, NextFunction } from 'express';
import { userRepository } from '../src/repositories/UserRepository';
import { NotFoundError, ValidationError } from '../src/errors/AppError';
import { ICreateUserDTO, IUpdateUserDTO } from '../src/interfaces/IUser';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userRepository.findAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userRepository.findById(String(req.params['id']));
    if (!user) throw new NotFoundError('User not found');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Partial<ICreateUserDTO>;
    if (!body.email) throw new ValidationError('email is required');
    if (!body.name) throw new ValidationError('name is required');
    if (!body.password) throw new ValidationError('password is required');
    const user = await userRepository.create(body as ICreateUserDTO);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto: IUpdateUserDTO = req.body as IUpdateUserDTO;
    const user = await userRepository.update(String(req.params['id']), dto);
    if (!user) throw new NotFoundError('User not found');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await userRepository.delete(String(req.params['id']));
    if (!deleted) throw new NotFoundError('User not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
