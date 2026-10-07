import {
  DONE_SIGNAL,
  type ChatStreamEvent,
  type GenerationStreamEventType,
} from '@cirrus/shared';

import type { RedisClient } from '../../infra/redis';

type PublisherOptions = {
  intervalMs: number;
  maxSize: number;
};

const STREAM_TTL_SECONDS = 180;

export function createStreamPublisher(
  client: RedisClient,
  streamKey: string,
  { intervalMs, maxSize }: PublisherOptions,
) {
  let type: GenerationStreamEventType | null = null;
  let buffer = '';
  let lastFlushAt = Date.now();

  const add = (event: ChatStreamEvent, data: string) =>
    client
      .multi()
      .xAdd(streamKey, '*', { event, data })
      .expire(streamKey, STREAM_TTL_SECONDS)
      .exec();

  const flush = async () => {
    if (type && buffer) {
      await add(type, JSON.stringify({ v: buffer }));
    }

    buffer = '';
    lastFlushAt = Date.now();
  };

  return {
    async append(nextType: GenerationStreamEventType, value: string) {
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
