import { useCallback, useEffect, useEffectEvent, useRef } from 'react';

const CHANNEL_NAME = 'cirrus-anonymous-chat';

/**
 * Anonymous users keep one live chat across tabs: `claim()` tells the other
 * tabs to drop theirs (`onTakenOver` runs there). Only a signal is sent, no
 * chat data.
 */
export function useAnonymousChatLock(
  enabled: boolean,
  onTakenOver: () => void,
) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const handleTakenOver = useEffectEvent(onTakenOver);

  useEffect(() => {
    if (!enabled) return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => handleTakenOver();
    channelRef.current = channel;

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [enabled]);

  return useCallback(() => channelRef.current?.postMessage('claim'), []);
}
