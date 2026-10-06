import { createClient } from 'redis';
import { createNodeRedisClient } from 'bullmq';

import { env } from '../config/env';

function createRedisClient(label: string) {
  const client = createClient({
    url: env.redisUrl,
  });

  client.on('error', (error) => {
    console.error(`Redis ${label} error:`, error);
  });

  return client;
}

export type RedisClient = ReturnType<typeof createRedisClient>;

export const queueRedis = createRedisClient('queue');
export const streamRedis = createRedisClient('stream');
export const pubsubSubscriber = createRedisClient('pubsub subscriber');

export const bullmqConnection = createNodeRedisClient(queueRedis);

const clients = [queueRedis, streamRedis, pubsubSubscriber];

export async function connectRedis() {
  for (const client of clients) {
    if (!client.isOpen) {
      await client.connect();
    }
  }
}

export async function disconnectRedis() {
  await Promise.all(clients.map((client) => client.close()));
}
