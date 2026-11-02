import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { HttpError } from './http-error';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    console.warn(err.issues);
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  console.error(err);

  res.status(500).json({ error: 'Something went wrong' });
};
