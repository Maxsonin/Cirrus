import 'dotenv/config';
import { z } from 'zod';
import { loadEnv } from '@cirrus/shared/env';

export const env = loadEnv(
  {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    FRONTEND_ORIGIN: z.url().default('http://localhost:3001'),
    REDIS_URL: z.url().default('redis://localhost:6379'),
    DATABASE_URL: z.url().default('postgresql://postgres@localhost:5432'),
    BETTER_AUTH_URL: z.url().optional(),
    BETTER_AUTH_SECRET: z.string().min(1),
    GOOGLE_WEB_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
  },
  process.env,
);

export const isDev = env.NODE_ENV === 'development';
