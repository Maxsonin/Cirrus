import { createClient, createClientPool } from 'redis';
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

export const queueRedis = createRedisClient('queue');
export const pubsubPublisher = createRedisClient('pubsub publisher');

export const streamPool = createClientPool({
  url: env.redisUrl,
});

streamPool.on('error', (error) => {
  console.error('Redis stream pool error:', error);
});

export type StreamPool = typeof streamPool;

export const bullmqConnection = createNodeRedisClient(queueRedis);

const clients = [queueRedis, pubsubPublisher];

export async function connectRedis() {
  for (const client of clients) {
    if (!client.isOpen) {
      await client.connect();
    }
  }

  await streamPool.connect();
}

export async function disconnectRedis() {
  await Promise.all([
    ...clients.map((client) => client.close()),
    streamPool.close(),
  ]);
}
