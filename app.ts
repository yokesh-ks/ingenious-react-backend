import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { AppError } from './src/errors/AppError';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Hello World' });
});

// Routes
import authRouter from './routes/auth';
import usersRouter from './routes/users';
app.use('/auth', authRouter);
app.use('/users', usersRouter);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
