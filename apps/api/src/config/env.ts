import 'dotenv/config';

function required(key: string) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  liteLlmUrl: process.env.LITELLM_URL ?? 'http://localhost:4000',
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://postgres@localhost:5432',
} as const;
