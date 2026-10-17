import { createClient } from 'redis';
import { createNodeRedisClient } from 'bullmq';

import { env } from '../config/env';

function createRedisClient(label: string) {
  const client = createClient({ url: env.REDIS_URL });

  client.on('error', (error) => {
    console.error(`Redis ${label} error:`, error);
  });

  return client;
}

export type RedisClient = ReturnType<typeof createRedisClient>;

export const redis = createRedisClient('main');
export const subscriber = createRedisClient('subscriber');

export const queueRedis = createRedisClient('queue');
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
