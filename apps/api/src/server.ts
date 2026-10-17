import app from './app';
import { env } from './config/env';
import { prisma } from './infra/prisma';
import { connectRedis, disconnectRedis } from './infra/redis';
import { generationQueue } from './modules/generation/generation.queue';

await connectRedis();

const server = app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});

async function shutdown() {
  server.close();
  await generationQueue.close();
  await disconnectRedis();
  await prisma.$disconnect();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
