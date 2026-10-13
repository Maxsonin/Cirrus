import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request', issues: err.issues });
    return;
  }

  console.error(err);

  res.status(500).json({ error: 'Something went wrong' });
};
