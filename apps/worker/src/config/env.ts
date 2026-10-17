import 'dotenv/config';
import { z } from 'zod';
import { loadEnv } from '@cirrus/shared/env';

export const env = loadEnv(
  {
    LITELLM_URL: z.url().default('http://localhost:4000'),
    REDIS_URL: z.url().default('redis://localhost:6379'),
    DATABASE_URL: z.url().default('postgresql://postgres@localhost:5432'),
    CHAT_CONCURRENCY: z.coerce.number().int().positive().default(10),
  },
  process.env,
);
