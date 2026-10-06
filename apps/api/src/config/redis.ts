import { createClient } from 'redis';
import { env } from './env';

export const redisClient = createClient({
  url: env.redisUrl,
});

redisClient.on('error', (error) => {
  console.error('Redis error:', error);
});

export const streamClient = createClient({
  url: env.redisUrl,
});

streamClient.on('error', (error) => {
  console.error('Redis Stream error:', error);
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  if (!streamClient.isOpen) {
    await streamClient.connect();
  }
}
