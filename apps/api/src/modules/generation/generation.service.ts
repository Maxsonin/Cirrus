import {
  ABORT_SIGNAL,
  chatAbortChannel,
  chatActiveKey,
  type ChatJobData,
} from '@cirrus/shared';

import { redis } from '../../infra/redis';
import { generationQueue } from './generation.queue';
import { endGenerationStream } from './generation.stream';

const LOCK_TTL_SECONDS = 600; // TODO: think of a better solution

export async function startGeneration(data: ChatJobData) {
  await generationQueue.add('generate', data, { jobId: data.requestId });
}

export async function cancelGeneration(requestId: string) {
  const removed = await generationQueue.remove(requestId);
  if (removed) return true;

  await redis.publish(chatAbortChannel(requestId), ABORT_SIGNAL);
  return false;
}

export async function lockChat(chatId: string, requestId: string) {
  const result = await redis.set(chatActiveKey(chatId), requestId, {
    NX: true,
    EX: LOCK_TTL_SECONDS,
  });
  return result === 'OK';
}

export async function unlockChat(chatId: string) {
  await redis.del(chatActiveKey(chatId));
}

export function getActiveRequestId(chatId: string) {
  return redis.get(chatActiveKey(chatId));
}

export async function getGeneratingChatIds(chatIds: string[]) {
  if (!chatIds.length) return new Set<string>();

  const values = await redis.mGet(chatIds.map(chatActiveKey));
  return new Set(chatIds.filter((_, i) => values[i]));
}

export async function stopChatGeneration(chatId: string) {
  const requestId = await getActiveRequestId(chatId);
  if (!requestId) return;

  const removed = await cancelGeneration(requestId);
  if (!removed) return;

  // Never started: unlock ourselves and finish any connected readers.
  await unlockChat(chatId);
  await endGenerationStream(requestId);
}
