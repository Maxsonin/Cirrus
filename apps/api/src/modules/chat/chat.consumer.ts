import type { ChatStreamEvent } from '@cirrus/shared';

import type { StreamPool } from '../../infra/redis';

const BLOCK_MS = 1000;
const IDLE_TIMEOUT_MS = 180_000;

export type ChatStreamMessage = {
  event: ChatStreamEvent;
  data: string;
};

export async function* readChatStream(
  pool: StreamPool,
  streamKey: string,
  signal: AbortSignal,
): AsyncGenerator<ChatStreamMessage> {
  let lastId = '0';
  let lastMessageAt = Date.now();

  try {
    while (!signal.aborted) {
      const result = await pool.xRead([{ key: streamKey, id: lastId }], {
        BLOCK: BLOCK_MS,
      });

      if (!result) {
        if (Date.now() - lastMessageAt >= IDLE_TIMEOUT_MS) {
          yield {
            event: 'error',
            data: JSON.stringify({ message: 'Generation timed out' }),
          };
          return;
        }

        continue;
      }

      lastMessageAt = Date.now();

      for (const stream of result) {
        for (const message of stream.messages) {
          lastId = message.id;

          const event = message.message.event as ChatStreamEvent;
          yield { event, data: message.message.data };

          if (event === 'done' || event === 'error') {
            return;
          }
        }
      }
    }
  } finally {
    await pool.del(streamKey).catch((error) => {
      console.error(`Failed to delete stream ${streamKey}:`, error);
    });
  }
}
