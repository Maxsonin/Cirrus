import type { Request, RequestHandler, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';

import { HttpError } from '../http/http-error';
import { auth } from './auth';

type SessionUser = typeof auth.$Infer.Session.user;

declare global {
  namespace Express {
    interface Locals {
      user: SessionUser | null;
    }
  }
}

async function getSessionUser(req: Request) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return session?.user ?? null;
}

export const loadSession: RequestHandler = async (req, res, next) => {
  res.locals.user = await getSessionUser(req);
  next();
};

export const requireUser: RequestHandler = async (req, res, next) => {
  res.locals.user = await getSessionUser(req);
  if (!res.locals.user) throw new HttpError(401, 'Unauthorized');
  next();
};

export function getUserId(res: Response) {
  if (!res.locals.user) throw new HttpError(401, 'Unauthorized');
  return res.locals.user.id;
}
