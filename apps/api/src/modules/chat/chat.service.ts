import { randomUUID } from 'node:crypto';

import {
  ANON_MESSAGE_LIMIT,
  type ChatRequest,
  type GenerationRequest,
} from '@cirrus/shared';

import { HttpError } from '../../http/http-error';
import {
  getActiveRequestId,
  getGeneratingChatIds,
  lockChat,
  startGeneration,
  stopChatGeneration,
  unlockChat,
} from '../generation/generation.service';
import {
  titleFrom,
  toChatMessage,
  toModelInput,
  type MessageContent,
} from './chat.messages';
import * as repo from './chat.repository';

export { cancelGeneration } from '../generation/generation.service';

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

  await startGeneration({
    requestId,
    chatId: null,
    request: toGenerationRequest(body, body.messages),
  });
}

export async function submitPersistentChat(userId: string, body: ChatRequest) {
  if (body.messages.length !== 1) {
    throw new HttpError(400, 'Send only the new message');
  }
  const message = toChatMessage(body.messages[0]);

  const requestId = randomUUID();

  const chat = body.chatId
    ? await getChat(userId, body.chatId)
    : await repo.createChat(userId, titleFrom(message), message);

  if (!(await lockChat(chat.id, requestId))) {
    throw new HttpError(
      409,
      'A response generation is already in progress. Check other opened instances of this conversation.',
    );
  }

  try {
    const history = body.chatId
      ? await repo.appendMessage(chat.id, message)
      : [message];
    if (!history) throw new HttpError(404, 'Chat not found');

    await startGeneration({
      requestId,
      chatId: chat.id,
      request: toGenerationRequest(body, history),
    });
  } catch (error) {
    await unlockChat(chat.id);
    throw error;
  }

  return { chat, requestId };
}

export async function listChats(userId: string, cursor?: string) {
  const page = await repo.listChats(userId, cursor);
  const generating = await getGeneratingChatIds(page.chats.map((c) => c.id));

  return {
    chats: page.chats.map((chat) => ({
      ...chat,
      generating: generating.has(chat.id),
    })),
    nextCursor: page.nextCursor,
  };
}

export async function getMessages(
  userId: string,
  chatId: string,
  before: number | null,
) {
  const [, page] = await Promise.all([
    assertChatOwner(userId, chatId),
    repo.getMessages(userId, chatId, before, MESSAGES_LIMIT),
    repo.markRead(userId, chatId),
  ]);
  return page;
}

export async function getActiveGeneration(userId: string, chatId: string) {
  const [, requestId] = await Promise.all([
    assertChatOwner(userId, chatId),
    getActiveRequestId(chatId),
  ]);
  return requestId;
}

export function markRead(userId: string, chatId: string) {
  return repo.markRead(userId, chatId);
}

export async function stopGeneration(userId: string, chatId: string) {
  await assertChatOwner(userId, chatId);
  await stopChatGeneration(chatId);
}

export async function deleteChat(userId: string, chatId: string) {
  if (!(await repo.deleteChat(userId, chatId))) {
    throw new HttpError(404, 'Chat not found');
  }
  await stopChatGeneration(chatId);
}

async function getChat(userId: string, chatId: string) {
  const chat = await repo.getChat(userId, chatId);
  if (!chat) throw new HttpError(404, 'Chat not found');
  return chat;
}

async function assertChatOwner(userId: string, chatId: string) {
  await getChat(userId, chatId);
}

function toGenerationRequest(
  body: ChatRequest,
  history: MessageContent[],
): GenerationRequest {
  return {
    model: body.model,
    think: body.think,
    input: toModelInput(history),
  };
}
