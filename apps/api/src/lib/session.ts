import type { RequestHandler } from 'express';
import { fromNodeHeaders } from 'better-auth/node';

import { auth } from './auth';

type SessionUser = typeof auth.$Infer.Session.user;

declare global {
  namespace Express {
    interface Locals {
      user: SessionUser | null;
    }
  }
}

export const loadSession: RequestHandler = async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  res.locals.user = session?.user ?? null;
  next();
};

export const requireUser: RequestHandler = async (req, res, next) => {
  await loadSession(req, res, () => {});

  if (!res.locals.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
};
