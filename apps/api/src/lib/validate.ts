import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    req.body = schema.parse(req.body);
    next();
  };

export const validateQuery =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    Object.defineProperty(req, 'query', {
      value: schema.parse(req.query),
      writable: true,
    });
    next();
  };
