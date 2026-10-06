import { createNodeRedisClient } from 'bullmq';
import { redisClient } from './redis';

export const bullmqConnection = createNodeRedisClient(redisClient);
