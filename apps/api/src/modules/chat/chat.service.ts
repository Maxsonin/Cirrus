import { randomUUID } from 'node:crypto';

import {
  ANON_MESSAGE_LIMIT,
  toModelInput,
  type ChatMessage,
  type ChatRequest,
  type InputMessage,
} from '@cirrus/shared';

import { HttpError } from '../../lib/http-error';
import {
  abortChat,
  enqueueChat,
  getActiveRequest,
  getGeneratingChats,
  lockChat,
  stopChat,
  unlockChat,
} from './chat.generation';
import * as repo from './chat.repository';

const MESSAGES_LIMIT = 10;

export async function submitStatelessChat(
  body: ChatRequest,
  anonymous: boolean,
  requestId: string,
) {
  const userMessagesCount = body.messages.filter(
    (m) => m.role === 'user',
  ).length;

  if (anonymous && userMessagesCount > ANON_MESSAGE_LIMIT) {
    throw new HttpError(
      403,
      'Your message limit has been reached, please sign in or create a new chat',
    );
  }

  await enqueueChat({
    requestId,
    chatId: null,
    request: {
      model: body.model,
      think: body.think,
      input: toModelInput(body.messages),
    },
  });
}

export async function submitPersistentChat(userId: string, body: ChatRequest) {
  if (body.messages.length !== 1) {
    throw new HttpError(400, 'Send only the new message');
  }
  const message = toChatMessage(body.messages[0]);

  const requestId = randomUUID();

  let chat: { id: string; title: string };
  if (body.chatId) {
    chat = await getChat(userId, body.chatId);

    if (!(await lockChat(chat.id, requestId))) {
      throw new HttpError(
        409,
        'A response generation is already in progress. Check other opened instances or this conversation.',
      );
    }

    await repo.appendMessage(chat.id, message, false);
  } else {
    chat = await repo.createChat(userId, titleFrom(message), message);
    await lockChat(chat.id, requestId);
  }

  try {
    await enqueueChat({
      requestId,
      chatId: chat.id,
      request: {
        model: body.model,
        think: body.think,
        input: toModelInput(await repo.getAllMessages(chat.id)),
      },
    });
  } catch (error) {
    await unlockChat(chat.id);
    throw error;
  }

  return { chat, requestId };
}

export function cancelGeneration(requestId: string) {
  return abortChat(requestId);
}

export async function listChats(userId: string, cursor?: string) {
  const page = await repo.listChats(userId, cursor);
  const generating = await getGeneratingChats(page.chats.map((c) => c.id));

  return {
    chats: page.chats.map((c) => ({ ...c, generating: generating.has(c.id) })),
    nextCursor: page.nextCursor,
  };
}

export async function getMessages(
  userId: string,
  chatId: string,
  before: number | null,
) {
  await getChat(userId, chatId);

  const page = await repo.getMessages(userId, chatId, before, MESSAGES_LIMIT);
  await repo.markRead(userId, chatId);

  return page;
}

// The requestId of a generation still running for this chat, if any.
export async function getActiveGeneration(userId: string, chatId: string) {
  await getChat(userId, chatId);
  return getActiveRequest(chatId);
}

export function markRead(userId: string, chatId: string) {
  return repo.markRead(userId, chatId);
}

export async function stopGeneration(userId: string, chatId: string) {
  await getChat(userId, chatId);
  await stopChat(chatId);
}

export async function deleteChat(userId: string, chatId: string) {
  if (!(await repo.deleteChat(userId, chatId))) {
    throw new HttpError(404, 'Chat not found');
  }
  await stopChat(chatId);
}

async function getChat(userId: string, chatId: string) {
  const chat = await repo.getChat(userId, chatId);
  if (!chat) throw new HttpError(404, 'Chat not found');
  return chat;
}

function toChatMessage(input: InputMessage): ChatMessage {
  return {
    id: randomUUID(),
    role: input.role,
    parts: input.parts,
    createdAt: new Date().toISOString(),
  };
}

// TODO: make fast LLM generate a title
function titleFrom(message: ChatMessage) {
  const TITLE_WORDS = 4;
  const words = (message.parts[0] as { text: string }).text.trim().split(/\s+/);
  const title = words.slice(0, TITLE_WORDS).join(' ');
  return words.length > TITLE_WORDS ? `${title}…` : title;
}
