import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { chatStreamKey, type ChatRequest } from '@cirrus/shared';

import { streamPool } from '../../infra/redis';
import { openSse, writeSse } from '../../lib/sse';
import { readChatStream } from './chat.consumer';
import { abortChat, enqueueChat } from './chat.service';

export async function stream(
  req: Request<unknown, unknown, ChatRequest>,
  res: Response,
) {
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

  await enqueueChat(requestId, req.body);

  openSse(res);

  try {
    for await (const { event, data } of readChatStream(
      streamPool,
      chatStreamKey(requestId),
      abort.signal,
    )) {
      writeSse(res, event, data);
    }
  } catch (error) {
    console.error(error);
    writeSse(
      res,
      'error',
      JSON.stringify({
        message: 'Something went wrong while generating your response',
      }),
    );
  }

  res.end();
}
