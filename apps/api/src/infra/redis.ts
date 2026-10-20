import { createClient, createClientPool } from 'redis';
import { createNodeRedisClient } from 'bullmq';

import { env } from '../config/env';

function createRedisClient(name: string) {
  const client = createClient({ url: env.REDIS_URL, name });

  client.on('error', (error) => {
    console.error(`Redis ${name} error:`, error);
  });

  return client;
}

export const redis = createRedisClient('api:main');

export const queueRedis = createRedisClient('api:queue');
export const bullmqConnection = createNodeRedisClient(queueRedis);

export const streamReaderPool = createClientPool({
  url: env.REDIS_URL,
  name: 'api:stream-reader',
});

streamReaderPool.on('error', (error) => {
  console.error('Redis api:stream-reader error:', error);
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
