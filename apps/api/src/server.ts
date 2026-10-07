import app from './app';
import { env } from './config/env';
import { connectRedis, disconnectRedis } from './infra/redis';
import { chatQueue } from './modules/chat/chat.queue';

await connectRedis();

const server = app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});

async function shutdown() {
  server.close();
  await chatQueue.close();
  await disconnectRedis();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
