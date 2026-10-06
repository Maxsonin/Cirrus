import { createClient } from 'redis';
import { env } from './env';

export const pubsubPublisher = createClient({
  url: env.redisUrl,
});

pubsubPublisher.on('error', (error) => {
  console.error('Redis Pub/Sub publisher error:', error);
});

export const pubsubSubscriber = createClient({
  url: env.redisUrl,
});

pubsubSubscriber.on('error', (error) => {
  console.error('Redis Pub/Sub subscriber error:', error);
});

export async function connectPubSub() {
  if (!pubsubPublisher.isOpen) {
    await pubsubPublisher.connect();
  }

  if (!pubsubSubscriber.isOpen) {
    await pubsubSubscriber.connect();
  }
}
