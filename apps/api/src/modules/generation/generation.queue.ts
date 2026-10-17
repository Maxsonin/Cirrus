import { Queue } from 'bullmq';
import { CHAT_QUEUE, type ChatJobData } from '@cirrus/shared';

import { bullmqConnection } from '../../infra/redis';

export const generationQueue = new Queue<ChatJobData>(CHAT_QUEUE, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 1, // A retry would duplicate already-sent deltas.
    removeOnComplete: true,
    removeOnFail: true, // add telemetry
  },
});
