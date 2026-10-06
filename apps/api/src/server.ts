import app from './app';
import { env } from './config/env';
import { connectRedis } from './config/redis';
import { connectPubSub } from './config/pubsub';

await connectRedis();
await connectPubSub();

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
