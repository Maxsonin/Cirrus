import { useEffect, useEffectEvent, useRef } from 'react';

import type { ChatMessage as ChatMessageData } from '@cirrus/shared';

import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { Spinner } from '@/components/ui/spinner';

import { ChatMessage } from './ChatMessage';
import type { ChatStatus } from './use-chat';

const PREFETCH_OFFSET = 5;

type ChatThreadProps = {
  messages: ChatMessageData[];
  status: ChatStatus;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
};

export function ChatThread({
  messages,
  status,
  hasOlder,
  loadingOlder,
  onLoadOlder,
}: ChatThreadProps) {
  const triggerIndex = Math.min(PREFETCH_OFFSET, messages.length - 1);
  const triggerId = messages[triggerIndex]?.id;
  const trigger = useRef<HTMLDivElement>(null);
  const loadOlder = useEffectEvent(onLoadOlder);

  useEffect(() => {
    const node = trigger.current;
    if (!node || !hasOlder || loadingOlder) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadOlder();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [triggerId, hasOlder, loadingOlder]);

  const streaming = status === 'streaming';
  const waiting =
    status === 'loading' ||
    (streaming && messages.at(-1)?.role !== 'assistant');

  return (
    <MessageScrollerProvider
      autoScroll
      defaultScrollPosition="last-anchor"
      scrollPreviousItemPeek={64}
    >
      <MessageScroller className="flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent
            aria-busy={streaming}
            className="mx-auto w-full max-w-3xl px-4 pt-16 pb-44"
          >
            {/* The first child must stay a message: the scroller restores the
                scroll position on prepend by tracking it. */}
            {messages.map((message, index) => (
              <MessageScrollerItem
                key={message.id}
                messageId={message.id}
                scrollAnchor={message.role === 'user'}
                ref={index === triggerIndex ? trigger : undefined}
              >
                <ChatMessage
                  message={message}
                  streaming={streaming && index === messages.length - 1}
                />
              </MessageScrollerItem>
            ))}

            {waiting && (
              <MessageScrollerItem messageId="waiting">
                <Spinner className="text-muted-foreground" />
              </MessageScrollerItem>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        {loadingOlder && (
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
            <Spinner className="text-muted-foreground" aria-label="Loading" />
          </div>
        )}
        <MessageScrollerButton className="bottom-40!" />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
