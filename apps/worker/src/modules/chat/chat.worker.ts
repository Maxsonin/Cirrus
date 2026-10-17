import { Worker } from 'bullmq';
import { CHAT_QUEUE, type ChatJobData } from '@cirrus/shared';

import { env } from '../../config/env';
import { bullmqConnection, redis, subscriber } from '../../infra/redis';
import { prisma } from '../../infra/prisma';
import { createChatProcessor } from './chat.processor';

export function startChatWorker() {
  const processChatJob = createChatProcessor({
    streamClient: redis,
    subscriber,
    prisma,
  });

  const worker = new Worker<ChatJobData>(CHAT_QUEUE, processChatJob, {
    connection: bullmqConnection,
    concurrency: env.CHAT_CONCURRENCY,
  });

  worker.on('completed', (job) => {
    console.log(`Chat job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`Chat job ${job?.id} failed:`, error);
  });

  return worker;
}
