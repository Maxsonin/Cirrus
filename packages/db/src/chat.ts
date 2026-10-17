import type { ChatMessage } from '@cirrus/shared';

import { Prisma, type PrismaClient } from './generated/prisma/client';

type AppendOptions = { unread: boolean };

function appendMessageSql(
  chatId: string,
  message: ChatMessage,
  { unread }: AppendOptions,
) {
  return Prisma.sql`
    UPDATE "chat"
    SET "messages" = "messages" || ${JSON.stringify([message])}::jsonb,
        "unread" = ${unread},
        "updatedAt" = now()
    WHERE "id" = ${chatId}
  `;
}

export function appendChatMessage(
  prisma: PrismaClient,
  chatId: string,
  message: ChatMessage,
  options: AppendOptions,
) {
  return prisma.$executeRaw(appendMessageSql(chatId, message, options));
}

export async function appendChatMessageAndGetHistory(
  prisma: PrismaClient,
  chatId: string,
  message: ChatMessage,
  options: AppendOptions,
) {
  const [row] = await prisma.$queryRaw<{ messages: ChatMessage[] }[]>`
    ${appendMessageSql(chatId, message, options)}
    RETURNING "messages"
  `;
  return row?.messages ?? null;
}
