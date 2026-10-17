import {
  DONE_SIGNAL,
  STREAM_TTL_SECONDS,
  type ChatStreamEvent,
  type GenerationStreamEventType,
} from '@cirrus/shared';

import type { RedisClient } from '../../infra/redis';

const FLUSH_INTERVAL_MS = 500;
const FLUSH_MAX_CHARS = 1024;

export type StreamPublisher = ReturnType<typeof createStreamPublisher>;

export function createStreamPublisher(client: RedisClient, streamKey: string) {
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

      if (
        buffer.length >= FLUSH_MAX_CHARS ||
        Date.now() - lastFlushAt >= FLUSH_INTERVAL_MS
      ) {
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
