import type { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { appendChatMessage, type PrismaClient } from '@cirrus/db';
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
import { createStreamPublisher, type StreamPublisher } from './chat.publisher';

type ChatProcessorDeps = {
  streamClient: RedisClient;
  subscriber: RedisClient;
  prisma: PrismaClient;
};

type Answer = {
  text: string;
  reasoning: string;
};

export function createChatProcessor({
  streamClient,
  subscriber,
  prisma,
}: ChatProcessorDeps) {
  async function streamAnswer(
    job: Job<ChatJobData>,
    publisher: StreamPublisher,
  ) {
    const { requestId, request } = job.data;

    const abort = await createAbortSubscriber(
      subscriber,
      chatAbortChannel(requestId),
      () => {
        console.log(`Chat job ${job.id} aborted`);
      },
    );

    const answer: Answer = { text: '', reasoning: '' };
    let error: unknown = null;

    try {
      for await (const event of streamResponse(request, abort.signal)) {
        if (event.type === 'delta') answer.text += event.value;
        else answer.reasoning += event.value;

        await publisher.append(event.type, event.value);
      }
    } catch (streamError) {
      if (!abort.signal.aborted) error = streamError;
    } finally {
      await abort.dispose();
    }

    return { answer, error };
  }

  return async function processChatJob(job: Job<ChatJobData>) {
    const { requestId, chatId, request } = job.data;
    const publisher = createStreamPublisher(
      streamClient,
      chatStreamKey(requestId),
    );

    let failure: unknown = null;

    try {
      const { answer, error } = await streamAnswer(job, publisher);
      failure = error;

      if (chatId && (answer.text || answer.reasoning)) {
        await appendChatMessage(
          prisma,
          chatId,
          assistantMessage(request.model, answer),
          { unread: true },
        );
      }
    } catch (error) {
      failure ??= error;
    } finally {
      if (chatId) await streamClient.del(chatActiveKey(chatId));
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
  { text, reasoning }: Answer,
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
