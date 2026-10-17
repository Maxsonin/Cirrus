import type { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@cirrus/db';
import { appendChatMessage } from '@cirrus/db/chat';
import {
  chatAbortChannel,
  chatActiveKey,
  chatStreamKey,
  type ChatJobData,
  type ChatMessage,
  type MessagePart,
} from '@cirrus/shared';

import type { RedisClient } from '../../infra/redis';
import { streamResponse } from '../../providers/litellm';
import { createAbortSubscriber } from './chat.abort';
import { createStreamPublisher } from './chat.publisher';

const STREAM = {
  intervalMs: 500,
  maxSize: 1024,
} as const;

type ChatProcessorDeps = {
  streamClient: RedisClient;
  pubsubSubscriber: RedisClient;
  prisma: PrismaClient;
};

export function createChatProcessor({
  streamClient,
  pubsubSubscriber,
  prisma,
}: ChatProcessorDeps) {
  return async function processChatJob(job: Job<ChatJobData>) {
    const { requestId, chatId, request } = job.data;

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

    let text = '';
    let reasoning = '';
    let failure: unknown = null;

    try {
      for await (const event of streamResponse(request, abort.signal)) {
        if (event.type === 'delta') text += event.value;
        else reasoning += event.value;

        await publisher.append(event.type, event.value);
      }
    } catch (error) {
      if (!abort.signal.aborted) failure = error;
    } finally {
      await abort.dispose();
    }

    // Persist before publishing done, so a client that reloads on done
    // always finds the answer in the DB. Aborted answers are kept partially.
    if (chatId) {
      try {
        if (text || reasoning) {
          await appendChatMessage(
            prisma,
            chatId,
            assistantMessage(request.model, reasoning, text),
            true,
          );
        }
      } catch (error) {
        failure ??= error;
      } finally {
        await streamClient.del(chatActiveKey(chatId));
      }
    }

    if (failure) {
      await publisher.error('Something went wrong, generation failed');
      throw failure;
    }

    await publisher.done();
  };
}

function assistantMessage(
  model: string,
  reasoning: string,
  text: string,
): ChatMessage {
  const parts: MessagePart[] = [];
  if (reasoning) parts.push({ type: 'reasoning', text: reasoning });
  if (text) parts.push({ type: 'text', text });

  return {
    id: randomUUID(),
    role: 'assistant',
    parts,
    model,
    createdAt: new Date().toISOString(),
  };
}
