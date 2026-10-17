import { createClient, createClientPool } from 'redis';
import { createNodeRedisClient } from 'bullmq';

import { env } from '../config/env';

function createRedisClient(label: string) {
  const client = createClient({ url: env.REDIS_URL });

  client.on('error', (error) => {
    console.error(`Redis ${label} error:`, error);
  });

  return client;
}

export const redis = createRedisClient('main');

export const queueRedis = createRedisClient('queue');
export const bullmqConnection = createNodeRedisClient(queueRedis);

export const streamReaderPool = createClientPool({ url: env.REDIS_URL });

streamReaderPool.on('error', (error) => {
  console.error('Redis stream reader pool error:', error);
});

const clients = [redis, queueRedis];

export async function connectRedis() {
  await Promise.all([
    ...clients
      .filter((client) => !client.isOpen)
      .map((client) => client.connect()),
    streamReaderPool.connect(),
  ]);
}

export async function disconnectRedis() {
  await Promise.all([
    ...clients.map((client) => client.close()),
    streamReaderPool.close(),
  ]);
}
