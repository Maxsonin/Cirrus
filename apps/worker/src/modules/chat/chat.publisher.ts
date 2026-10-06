import { DONE_SIGNAL, type StreamEventType } from '@cirrus/shared';

import type { RedisClient } from '../../infra/redis';

type PublisherOptions = {
  intervalMs: number;
  maxSize: number;
};

export function createStreamPublisher(
  client: RedisClient,
  streamKey: string,
  { intervalMs, maxSize }: PublisherOptions,
) {
  let type: StreamEventType | null = null;
  let buffer = '';
  let lastFlushAt = Date.now();

  const add = (event: string, data: string) =>
    client.xAdd(streamKey, '*', { event, data });

  const flush = async () => {
    if (type && buffer) {
      await add(type, JSON.stringify({ v: buffer }));
    }

    buffer = '';
    lastFlushAt = Date.now();
  };

  return {
    async append(nextType: StreamEventType, value: string) {
      if (nextType !== type) {
        await flush();
        type = nextType;
      }

      buffer += value;

      if (buffer.length >= maxSize || Date.now() - lastFlushAt >= intervalMs) {
        await flush();
      }
    },

    async done() {
      await flush();
      await add('done', DONE_SIGNAL);
    },

    async error(message: string) {
      await flush();
      await add('error', JSON.stringify({ message }));
    },
  };
}
