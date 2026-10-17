import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { HttpError } from './http-error';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Headers already sent (e.g. an open SSE stream): let Express close it.
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request', issues: err.issues });
    return;
  }

  console.error(err);

  res.status(500).json({ error: 'Something went wrong' });
};
