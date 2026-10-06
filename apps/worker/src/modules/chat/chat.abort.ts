import { ABORT_SIGNAL } from '@cirrus/shared';

import type { RedisClient } from '../../infra/redis';

export async function createAbortSubscriber(
  subscriber: RedisClient,
  channel: string,
  onAbort?: () => void,
) {
  const controller = new AbortController();

  await subscriber.subscribe(channel, (message) => {
    if (message === ABORT_SIGNAL) {
      controller.abort();
      onAbort?.();
    }
  });

  return {
    signal: controller.signal,
    dispose: () => subscriber.unsubscribe(channel),
  };
}
