import {
  ABORT_SIGNAL,
  chatAbortChannel,
  type ChatRequest,
} from '@cirrus/shared';

import { pubsubPublisher } from '../../infra/redis';
import { chatQueue } from './chat.queue';

export async function enqueueChat(requestId: string, request: ChatRequest) {
  await chatQueue.add(
    'generate',
    {
      requestId,
      request,
    },
    {
      jobId: requestId,
    },
  );
}

export async function abortChat(requestId: string) {
  const removed = await chatQueue.remove(requestId);
  if (removed) return;

  await pubsubPublisher.publish(chatAbortChannel(requestId), ABORT_SIGNAL);
}
