import { Queue } from 'bullmq';
import { CHAT_QUEUE } from '@cirrus/shared';

import { bullmqConnection } from '../../infra/redis';

export const chatQueue = new Queue(CHAT_QUEUE, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 1, // A retry would duplicate already-sent deltas.
    removeOnComplete: true,
    removeOnFail: true, // add telemetry
  },
});
