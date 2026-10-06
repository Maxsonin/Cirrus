import type { Job } from 'bullmq';
import {
  chatAbortChannel,
  chatStreamKey,
  type ChatJobData,
} from '@cirrus/shared';

import type { RedisClient } from '../../infra/redis';
import { readSseData } from '../../lib/sse';
import { createResponseStream } from '../../providers/litellm';
import { parseProviderEvent } from '../../providers/litellm.events';
import { createAbortSubscriber } from './chat.abort';
import { createStreamPublisher } from './chat.publisher';

const STREAM = {
  intervalMs: 500,
  maxSize: 1024,
} as const;

type ChatProcessorDeps = {
  streamClient: RedisClient;
  pubsubSubscriber: RedisClient;
};

export function createChatProcessor({
  streamClient,
  pubsubSubscriber,
}: ChatProcessorDeps) {
  return async function processChatJob(job: Job<ChatJobData>) {
    const { requestId, request } = job.data;

    const abort = await createAbortSubscriber(
      pubsubSubscriber,
      chatAbortChannel(requestId),
      () => {
        console.log(`Chat job ${job.id} aborted`);
      },
    );
    const publisher = createStreamPublisher(
      streamClient,
      chatStreamKey(requestId),
      STREAM,
    );

    try {
      const body = await createResponseStream(request, abort.signal);

      for await (const data of readSseData(body)) {
        const event = parseProviderEvent(data);

        if (event) {
          await publisher.append(event.type, event.value);
        }
      }

      await publisher.done();
    } catch (error) {
      if (abort.signal.aborted) {
        console.log(`Chat job ${job.id} aborted`);
        return;
      }

      await publisher.error('Something went wrong, generation failed');
      throw error;
    } finally {
      await abort.dispose();
    }
  };
}
