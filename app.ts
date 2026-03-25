import express, { Request, Response, NextFunction } from 'express';

const app = express();

// Logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${req.method} request for ${req.url}`);
  next();
});

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello World');
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Basic error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.log(req);
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});
