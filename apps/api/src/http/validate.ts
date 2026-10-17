import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    req.body = schema.parse(req.body);
    next();
  };

export const validateParams =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    req.params = schema.parse(req.params) as typeof req.params;
    next();
  };

export const validateQuery =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    // Express 5 exposes `req.query` through a getter.
    Object.defineProperty(req, 'query', {
      value: schema.parse(req.query),
      writable: true,
    });
    next();
  };
