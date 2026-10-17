import { appendChatMessage } from '@cirrus/db/chat';
import type { ChatMessage } from '@cirrus/shared';

import { prisma } from '../../infra/prisma';

const LIST_LIMIT = 30;

export function createChat(
  userId: string,
  title: string,
  message: ChatMessage,
) {
  return prisma.chat.create({
    data: {
      userId,
      title,
      messages: [message],
    },
    select: { id: true, title: true },
  });
}

export function getChat(userId: string, id: string) {
  return prisma.chat.findFirst({
    where: { id, userId },
    select: { id: true, title: true },
  });
}

export async function getAllMessages(id: string) {
  const chat = await prisma.chat.findUnique({
    where: { id },
    select: { messages: true },
  });
  return (chat?.messages ?? []) as unknown as ChatMessage[];
}

export function appendMessage(
  id: string,
  message: ChatMessage,
  unread: boolean,
) {
  return appendChatMessage(prisma, id, message, unread);
}

export async function listChats(userId: string, cursor?: string) {
  const chats = await prisma.chat.findMany({
    where: { userId },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: LIST_LIMIT + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: { id: true, title: true, unread: true, updatedAt: true },
  });

  const hasMore = chats.length > LIST_LIMIT;
  const page = hasMore ? chats.slice(0, LIST_LIMIT) : chats;

  return { chats: page, nextCursor: hasMore ? page.at(-1)!.id : null };
}

// Messages are append-only, so a 1-based position is a stable cursor.
export async function getMessages(
  userId: string,
  id: string,
  before: number | null,
  limit: number,
) {
  const rows = await prisma.$queryRaw<{ message: ChatMessage; idx: number }[]>`
    SELECT m.value AS message, m.idx::int AS idx
    FROM "chat" c,
      jsonb_array_elements(c."messages") WITH ORDINALITY AS m(value, idx)
    WHERE c."id" = ${id}
      AND c."userId" = ${userId}
      AND (${before}::int IS NULL OR m.idx < ${before}::int)
    ORDER BY m.idx DESC
    LIMIT ${limit}
  `;

  const oldest = rows.at(-1)?.idx;

  return {
    messages: rows.reverse().map((r) => r.message),
    nextCursor: oldest && oldest > 1 ? oldest : null,
  };
}

// Raw SQL so `updatedAt` doesn't change and the chat keeps its list position.
export function markRead(userId: string, id: string) {
  return prisma.$executeRaw`
    UPDATE "chat" SET "unread" = false
    WHERE "id" = ${id} AND "userId" = ${userId} AND "unread"
  `;
}

export async function deleteChat(userId: string, id: string) {
  const { count } = await prisma.chat.deleteMany({ where: { id, userId } });
  return count > 0;
}
