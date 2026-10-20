import { createClient } from 'redis';
import { createNodeRedisClient } from 'bullmq';

import { env } from '../config/env';

function createRedisClient(name: string) {
  const client = createClient({ url: env.REDIS_URL, name });

  client.on('error', (error) => {
    console.error(`Redis ${name} error:`, error);
  });

  return client;
}

export type RedisClient = ReturnType<typeof createRedisClient>;

export const redis = createRedisClient('worker:main');
export const subscriber = createRedisClient('worker:subscriber');

export const queueRedis = createRedisClient('worker:queue');
export const bullmqConnection = createNodeRedisClient(queueRedis);

const clients = [redis, queueRedis, subscriber];

export async function connectRedis() {
  await Promise.all(
    clients
      .filter((client) => !client.isOpen)
      .map((client) => client.connect()),
  );
}

export async function disconnectRedis() {
  await Promise.all(clients.map((client) => client.close()));
}
