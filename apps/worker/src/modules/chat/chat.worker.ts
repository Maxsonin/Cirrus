import { Worker } from 'bullmq';
import { CHAT_QUEUE, type ChatJobData } from '@cirrus/shared';

import { env } from '../../config/env';
import {
  bullmqConnection,
  pubsubSubscriber,
  streamRedis,
} from '../../infra/redis';
import { createChatProcessor } from './chat.processor';

export function startChatWorker() {
  const processChatJob = createChatProcessor({
    streamClient: streamRedis,
    pubsubSubscriber,
  });

  const worker = new Worker<ChatJobData>(CHAT_QUEUE, processChatJob, {
    connection: bullmqConnection,
    concurrency: env.chatConcurrency,
  });

  worker.on('completed', (job) => {
    console.log(`Chat job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`Chat job ${job?.id} failed:`, error);
  });

  return worker;
}
