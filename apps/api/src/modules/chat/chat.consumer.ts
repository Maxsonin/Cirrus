import type { Response } from 'express';
import { chatStreamKey, type ChatStreamEvent } from '@cirrus/shared';

import { streamPool, type StreamPool } from '../../infra/redis';
import { writeSse } from '../../lib/sse';

const BLOCK_MS = 1000;
const IDLE_TIMEOUT_MS = 45_000;

export type ChatStreamMessage = {
  event: ChatStreamEvent;
  data: string;
};

export async function* readGenerationStream(
  pool: StreamPool,
  streamKey: string,
  signal: AbortSignal,
): AsyncGenerator<ChatStreamMessage> {
  let lastId = '0';
  let lastMessageAt = Date.now();

  while (!signal.aborted) {
    const result = await pool.xRead([{ key: streamKey, id: lastId }], {
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

export async function relayGenerationStream(
  res: Response,
  requestId: string,
  signal: AbortSignal,
) {
  let lastEvent: ChatStreamEvent | null = null;

  try {
    for await (const { event, data } of readGenerationStream(
      streamPool,
      chatStreamKey(requestId),
      signal,
    )) {
      lastEvent = event;
      writeSse(res, event, data);
    }
  } catch (error) {
    console.error(error); // TODO: logger
    lastEvent = 'error';
    writeSse(res, 'error', {
      message: 'Something went wrong while generating your response',
    });
  }

  return signal.aborted ? null : lastEvent;
}
