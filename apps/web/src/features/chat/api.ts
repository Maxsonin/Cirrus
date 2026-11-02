import {
  DONE_SIGNAL,
  type ChatRequestBody,
  type ChatsPage,
  type MessagesPage,
  type Model,
} from '@cirrus/shared';

import { apiFetch, apiJson, GENERIC_ERROR } from '@/lib/api';

import { readSse } from './sse';

export type ChatStreamEvent =
  | { type: 'chat'; chatId: string }
  | { type: 'text' | 'reasoning'; text: string }
  | { type: 'error'; message: string };

export function fetchModels() {
  return apiJson<Model[]>('/models');
}

export function fetchChats(cursor?: string) {
  const query = cursor ? `?cursor=${cursor}` : '';
  return apiJson<ChatsPage>(`/chats${query}`);
}

export function fetchMessages(chatId: string, before?: number) {
  const query = before ? `?before=${before}` : '';
  return apiJson<MessagesPage>(`/chats/${chatId}/messages${query}`);
}

export function postChat(body: ChatRequestBody, signal: AbortSignal) {
  return apiFetch('/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal,
  });
}

/** Reattaches to a running generation. Resolves to null when nothing is running. */
export async function resumeChat(chatId: string, signal: AbortSignal) {
  const response = await apiFetch(`/chats/${chatId}/stream`, { signal });
  return response.status === 204 ? null : response;
}

export async function abortChat(chatId: string) {
  await apiFetch(`/chats/${chatId}/abort`, { method: 'POST' });
}

export async function* readChatStream(
  response: Response,
): AsyncGenerator<ChatStreamEvent> {
  for await (const { event, data } of readSse(response)) {
    if (data === DONE_SIGNAL) return;

    const payload = JSON.parse(data);
    switch (event) {
      case 'chat':
        yield { type: 'chat', chatId: payload.id };
        break;
      case 'delta':
        if (payload.v) yield { type: 'text', text: payload.v };
        break;
      case 'thinking':
        if (payload.v) yield { type: 'reasoning', text: payload.v };
        break;
      case 'error':
        yield { type: 'error', message: payload.message ?? GENERIC_ERROR };
        return;
    }
  }
}
