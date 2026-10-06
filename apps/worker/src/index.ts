import { connectRedis, disconnectRedis } from './infra/redis';
import { startChatWorker } from './modules/chat/chat.worker';

const workers = {
  chat: startChatWorker,
} as const;

const workerType = process.argv[2] as keyof typeof workers | undefined;

if (!workerType || !(workerType in workers)) {
  console.error(`Unknown worker: ${workerType}`);
  process.exit(1);
}

await connectRedis();

const worker = workers[workerType]();

console.log(`Worker started: ${workerType}`);

async function shutdown() {
  await worker.close();
  await disconnectRedis();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
