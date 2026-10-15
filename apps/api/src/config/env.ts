import 'dotenv/config';

function required(key: string) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  } else {
    return process.env[key];
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://postgres@localhost:5432',
  baseURL: process.env.BETTER_AUTH_URL,
  betterAuthSecret: required('BETTER_AUTH_SECRET'),
  googleWebClientId: required('GOOGLE_WEB_CLIENT_ID'),
  googleClientSecret: required('GOOGLE_CLIENT_SECRET'),
} as const;

export const isDev = env.nodeEnv === 'development';
