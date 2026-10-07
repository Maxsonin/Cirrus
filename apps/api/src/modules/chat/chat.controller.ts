import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { chatStreamKey, type AiRequest } from '@cirrus/shared';

import { streamPool } from '../../infra/redis';
import { openSse, writeSse } from '../../lib/sse';
import { readChatStream } from './chat.consumer';
import { abortChat, enqueueChat } from './chat.service';

export async function chatController(req: Request, res: Response) {
  const requestId = randomUUID();
  const abort = new AbortController();

  // User abortion handler
  res.on('close', () => {
    if (res.writableEnded) return;

    abort.abort();
    console.log(`Client aborted generation: ${requestId}`);
    abortChat(requestId).catch((error) => {
      console.error(`Failed to cancel chat ${requestId}:`, error);
    });
  });

  try {
    const request = req.body as AiRequest; // TODO: add Zod middleware for validation and prevent incorrect models from starting a job in worker

    await enqueueChat(requestId, request);

    openSse(res);

    for await (const { event, data } of readChatStream(
      streamPool,
      chatStreamKey(requestId),
      abort.signal,
    )) {
      writeSse(res, event, data);
    }
  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Something went wrong',
      });
      return;
    }

    writeSse(res, 'error', JSON.stringify({ message: 'Something went wrong' }));
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
}
