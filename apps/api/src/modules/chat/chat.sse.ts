import type { Response } from 'express';
import { randomUUID } from 'node:crypto';

import {
  DONE_SIGNAL,
  type ChatRequest,
  type ChatStreamEvent,
} from '@cirrus/shared';

import { abortOnDisconnect, openSse, writeSse } from '../../http/sse';
import { readGenerationStream } from '../generation/generation.stream';
import * as chatService from './chat.service';

export async function streamStateless(
  body: ChatRequest,
  res: Response,
  anonymous: boolean,
) {
  const requestId = randomUUID();
  const signal = abortOnDisconnect(res, () => {
    chatService.cancelGeneration(requestId).catch(console.error);
  });

  await chatService.submitStatelessChat(body, anonymous, requestId);

  openSse(res);
  await relayGeneration(res, requestId, signal);
  res.end();
}

export async function streamPersistent(
  body: ChatRequest,
  res: Response,
  userId: string,
) {
  const signal = abortOnDisconnect(res);

  const { chat, requestId } = await chatService.submitPersistentChat(
    userId,
    body,
  );

  openSse(res);
  writeSse(res, { event: 'chat', data: chat });
  await relayPersistentGeneration(res, userId, chat.id, requestId, signal);
}

export async function resumeStream(
  res: Response,
  userId: string,
  chatId: string,
) {
  const requestId = await chatService.getActiveGeneration(userId, chatId);

  if (!requestId) {
    res.status(204).end();
    return;
  }

  const signal = abortOnDisconnect(res);

  openSse(res);
  await relayPersistentGeneration(res, userId, chatId, requestId, signal);
}

async function relayPersistentGeneration(
  res: Response,
  userId: string,
  chatId: string,
  requestId: string,
  signal: AbortSignal,
) {
  if ((await relayGeneration(res, requestId, signal)) === 'done') {
    await chatService.markRead(userId, chatId);
  }
  res.end();
}

async function relayGeneration(
  res: Response,
  requestId: string,
  signal: AbortSignal,
) {
  let lastEvent: ChatStreamEvent | null = null;

  try {
    for await (const { event, data } of readGenerationStream(
      requestId,
      signal,
    )) {
      lastEvent = event;
      writeSse(res, event === 'done' ? { data: DONE_SIGNAL } : { event, data });
    }
  } catch (error) {
    console.error(error); // TODO: logger
    lastEvent = 'error';
    writeSse(res, {
      event: 'error',
      data: { message: 'Something went wrong while generating your response' },
    });
  }

  return signal.aborted ? null : lastEvent;
}
