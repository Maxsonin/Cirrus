import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type {
  ChatMessage,
  ChatRequestBody,
  MessagePart,
  MessagesPage,
  ModelId,
} from '@cirrus/shared';

import { ApiError, errorMessage } from '@/lib/api';

import {
  abortChat,
  fetchMessages,
  postChat,
  readChatStream,
  resumeChat,
} from './api';
import { chatKeys } from './queries';

export type ChatStatus = 'loading' | 'ready' | 'streaming';

type UseChatOptions = {
  /** Saved chat to open, or null for a new one. Read once on mount. */
  initialChatId: string | null;
  /** Stateless chats (anonymous / temporary) send the whole history and are never saved. */
  stateless: boolean;
  temporary: boolean;
  onCreated: (chatId: string) => void;
  onMissing: () => void;
};

type SendOptions = { model: ModelId; think: boolean };

export function useChat({
  initialChatId,
  stateless,
  temporary,
  onCreated,
  onMissing,
}: UseChatOptions) {
  const queryClient = useQueryClient();
  // The URL changes to "/:id" once a new chat is created; that must not
  // reload it (and abort its stream), so the id to open is captured once.
  const [openedChatId] = useState(initialChatId);
  const [chatId, setChatId] = useState(initialChatId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [status, setStatus] = useState<ChatStatus>(
    initialChatId ? 'loading' : 'ready',
  );
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Streams one assistant answer into `messages`.
  // Resolves to false when the server had nothing to stream.
  const stream = async (
    open: (signal: AbortSignal) => Promise<Response | null>,
  ) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('streaming');
    setError(null);

    let answerStarted = false;
    const append = (type: MessagePart['type'], text: string) => {
      const isFirst = !answerStarted;
      answerStarted = true;
      setMessages((prev) => {
        const [base, answer] = isFirst
          ? [prev, createMessage('assistant')]
          : [prev.slice(0, -1), prev.at(-1)!];
        return [...base, appendPart(answer, type, text)];
      });
    };

    try {
      const response = await open(controller.signal);
      if (!response) return false;

      for await (const event of readChatStream(response)) {
        if (event.type === 'chat') {
          setChatId(event.chatId);
          onCreated(event.chatId);
        } else if (event.type === 'error') {
          setError(event.message);
        } else {
          append(event.type, event.text);
        }
      }
      return true;
    } catch (err) {
      if (!controller.signal.aborted) setError(errorMessage(err));
      return true;
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      setStatus('ready');
      void queryClient.invalidateQueries({ queryKey: chatKeys.all });
    }
  };

  // Shows a saved chat's latest messages, then reattaches to a generation
  // that may still be running.
  const openChat = useEffectEvent(
    async (id: string, page: MessagesPage, isCancelled: () => boolean) => {
      setMessages(page.messages);
      setCursor(page.nextCursor);

      const resumed = await stream((signal) => resumeChat(id, signal));

      // The answer may have finished between the two requests: reload it.
      // TODO: if it was saved before /messages but the lock was still held, the
      // resumed stream replays it a second time. Fix on the backend by
      // returning the active request id together with the messages.
      if (!resumed && !isCancelled() && page.messages.at(-1)?.role === 'user') {
        const latest = await fetchMessages(id);
        if (isCancelled()) return;
        setMessages(latest.messages);
        setCursor(latest.nextCursor);
      }
    },
  );

  const failOpen = useEffectEvent((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) onMissing();
    else setError(errorMessage(err));
    setStatus('ready');
  });

  useEffect(() => {
    if (!openedChatId) return;

    let cancelled = false;
    const isCancelled = () => cancelled;

    fetchMessages(openedChatId)
      .then((page) => {
        if (!cancelled) return openChat(openedChatId, page, isCancelled);
      })
      .catch((err) => {
        if (!cancelled) failOpen(err);
      });

    return () => {
      cancelled = true;
      controllerRef.current?.abort();
    };
  }, [openedChatId]);

  const send = async (text: string, { model, think }: SendOptions) => {
    if (status !== 'ready') return;

    const userMessage = createMessage('user', text);
    const history = [...messages, userMessage];
    setMessages(history);

    const body: ChatRequestBody = stateless
      ? {
          temporary,
          model,
          think,
          messages: history.map(toInput).filter((m) => m.parts.length),
        }
      : {
          chatId: chatId ?? undefined,
          model,
          think,
          messages: [toInput(userMessage)],
        };

    await stream((signal) => postChat(body, signal));
  };

  // Saved chats keep generating server-side, so stopping them is explicit.
  const stop = () => {
    if (!stateless && chatId) {
      abortChat(chatId).catch((err) => setError(errorMessage(err)));
    } else {
      controllerRef.current?.abort();
    }
  };

  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadOlder = async () => {
    if (!chatId || !cursor || loadingOlder) return;

    setLoadingOlder(true);
    try {
      const page = await fetchMessages(chatId, cursor);
      setMessages((prev) => [...page.messages, ...prev]);
      setCursor(page.nextCursor);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingOlder(false);
    }
  };

  return {
    messages,
    status,
    error,
    hasOlder: cursor !== null,
    loadingOlder,
    lastModel: messages.findLast((m) => m.model)?.model,
    send,
    stop,
    loadOlder,
  };
}

// Local ids only key the list: the server assigns its own on save.
function createMessage(role: ChatMessage['role'], text?: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    parts: text ? [{ type: 'text', text }] : [],
    createdAt: new Date().toISOString(),
  };
}

function appendPart(
  message: ChatMessage,
  type: MessagePart['type'],
  text: string,
): ChatMessage {
  const parts = [...message.parts];
  const index = parts.findIndex((p) => p.type === type);

  if (index === -1) parts.push({ type, text });
  else parts[index] = { type, text: parts[index].text + text };

  return { ...message, parts };
}

// Reasoning is shown to the user but never sent back to the model.
function toInput(message: ChatMessage) {
  return {
    role: message.role,
    parts: message.parts.flatMap((p) =>
      p.type === 'text' && p.text ? [{ type: 'text' as const, text: p.text }] : [],
    ),
  };
}
