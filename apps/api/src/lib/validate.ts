import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
