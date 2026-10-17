import {
  ABORT_SIGNAL,
  DONE_SIGNAL,
  chatAbortChannel,
  chatActiveKey,
  chatStreamKey,
  type ChatJobData,
} from '@cirrus/shared';

import { pubsubPublisher, streamPool } from '../../infra/redis';
import { chatQueue } from './chat.queue';

const ACTIVE_TTL_SECONDS = 600;
const STREAM_TTL_SECONDS = 180;

export async function enqueueChat(data: ChatJobData) {
  await chatQueue.add('generate', data, { jobId: data.requestId });
}

// Returns true when the job was still queued and got removed,
// meaning the worker will never publish anything for it.
export async function abortChat(requestId: string) {
  const removed = await chatQueue.remove(requestId);
  if (removed) return true;

  await pubsubPublisher.publish(chatAbortChannel(requestId), ABORT_SIGNAL);
  return false;
}

export async function lockChat(chatId: string, requestId: string) {
  const result = await streamPool.set(chatActiveKey(chatId), requestId, {
    NX: true,
    EX: ACTIVE_TTL_SECONDS,
  });
  return result === 'OK';
}

export function unlockChat(chatId: string) {
  return streamPool.del(chatActiveKey(chatId));
}

export function getActiveRequest(chatId: string) {
  return streamPool.get(chatActiveKey(chatId));
}

export async function getGeneratingChats(chatIds: string[]) {
  if (!chatIds.length) return new Set<string>();

  const values = await streamPool.mGet(chatIds.map(chatActiveKey));
  return new Set(chatIds.filter((_, i) => values[i]));
}

export async function stopChat(chatId: string) {
  const requestId = await getActiveRequest(chatId);
  if (!requestId) return;

  const removed = await abortChat(requestId);
  if (!removed) return; // the worker saves the partial answer and unlocks

  // Never started: unlock ourselves and finish any connected readers.
  await unlockChat(chatId);
  await streamPool
    .multi()
    .xAdd(chatStreamKey(requestId), '*', { event: 'done', data: DONE_SIGNAL })
    .expire(chatStreamKey(requestId), STREAM_TTL_SECONDS)
    .exec();
}
