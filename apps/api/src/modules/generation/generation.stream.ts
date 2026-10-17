import {
  DONE_SIGNAL,
  STREAM_TTL_SECONDS,
  chatStreamKey,
  type ChatStreamEvent,
} from '@cirrus/shared';

import { redis, streamReaderPool } from '../../infra/redis';

const BLOCK_MS = 1000;

/**
 * This logic is INCORRECT.
 * In the future project updates it should be changed to ping or some sort of heartbeat
 * that will notify user that the generation take a long time. Right now we show error to user
 * even though his job is still being processed. Retry will connect him to the stream if the generation have started.
 *
 * What should be done instead is until user is in queue
 * or the model is still loading or takes longer to think
 * we should show a message to the user to notify of waiting.
 * Therefore user can wait indefinitely, until we sand an error
 */
const IDLE_TIMEOUT_MS = 45_000;

export type GenerationStreamMessage = {
  event: ChatStreamEvent;
  data: string;
};

export async function* readGenerationStream(
  requestId: string,
  signal: AbortSignal,
): AsyncGenerator<GenerationStreamMessage> {
  const key = chatStreamKey(requestId);
  let lastId = '0';
  let lastMessageAt = Date.now();

  while (!signal.aborted) {
    const result = await streamReaderPool.xRead([{ key, id: lastId }], {
      BLOCK: BLOCK_MS,
    });

    if (!result) {
      if (Date.now() - lastMessageAt >= IDLE_TIMEOUT_MS) {
        yield {
          event: 'error',
          data: JSON.stringify({
            message: 'Generation timed out. Please try again later.',
          }),
        };
        return;
      }

      continue;
    }

    for (const message of result[0].messages) {
      lastId = message.id;
      lastMessageAt = Date.now();

      const event = message.message.event as ChatStreamEvent;
      yield { event, data: message.message.data };

      if (event === 'done' || event === 'error') return;
    }
  }
}

export async function endGenerationStream(requestId: string) {
  const key = chatStreamKey(requestId);

  await redis
    .multi()
    .xAdd(key, '*', { event: 'done', data: DONE_SIGNAL })
    .expire(key, STREAM_TTL_SECONDS)
    .exec();
}
