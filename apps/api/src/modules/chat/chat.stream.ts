import type { Response } from 'express';
import { randomUUID } from 'node:crypto';

import type { ChatRequest } from '@cirrus/shared';

import { openSse, writeSse } from '../../lib/sse';
import { relayGenerationStream } from './chat.consumer';
import * as chatService from './chat.service';

export async function streamStateless(
  body: ChatRequest,
  res: Response,
  anonymous: boolean,
) {
  const requestId = randomUUID();

  const abort = new AbortController();
  res.on('close', () => {
    if (res.writableEnded) return;

    abort.abort();
    chatService.cancelGeneration(requestId);
  });

  await chatService.submitStatelessChat(body, anonymous, requestId);

  openSse(res);
  await relayGenerationStream(res, requestId, abort.signal);

  res.end();
}

export async function streamPersistent(
  body: ChatRequest,
  res: Response,
  userId: string,
) {
  const abort = new AbortController();
  res.on('close', () => abort.abort());

  const { chat, requestId } = await chatService.submitPersistentChat(
    userId,
    body,
  );

  openSse(res);
  writeSse(res, 'chat', JSON.stringify(chat));

  if ((await relayGenerationStream(res, requestId, abort.signal)) === 'done') {
    await chatService.markRead(userId, chat.id);
  }

  res.end();
}
