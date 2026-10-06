import type { AiRequest } from '@cirrus/shared';

import { chatQueue } from './chat.queue';

export async function generateChat(requestId: string, request: AiRequest) {
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

  return { requestId };
}
