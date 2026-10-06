import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  liteLlmUrl: process.env.LITELLM_URL ?? 'http://localhost:4000',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  chatConcurrency: Number(process.env.CHAT_CONCURRENCY ?? 10),
} as const;
