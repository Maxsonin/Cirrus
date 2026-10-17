import { prisma } from './infra/prisma';
import { connectRedis, disconnectRedis } from './infra/redis';
import { startChatWorker } from './modules/chat/chat.worker';

const workers = {
  chat: startChatWorker,
} as const;

type WorkerType = keyof typeof workers;

function isWorkerType(value: string | undefined): value is WorkerType {
  return value !== undefined && Object.hasOwn(workers, value);
}

const workerType = process.argv[2];

if (!isWorkerType(workerType)) {
  console.error(`Unknown worker: ${workerType}`);
  process.exit(1);
}

await connectRedis();

const worker = workers[workerType]();

console.log(`Worker started: ${workerType}`);

async function shutdown() {
  await worker.close();
  await disconnectRedis();
  await prisma.$disconnect();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
