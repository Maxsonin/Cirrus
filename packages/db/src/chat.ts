import type { ChatMessage } from '@cirrus/shared';
import type { PrismaClient } from './generated/prisma/client';

export function appendChatMessage(
  prisma: PrismaClient,
  chatId: string,
  message: ChatMessage,
  unread: boolean,
) {
  return prisma.$executeRaw`
    UPDATE "chat"
    SET "messages" = "messages" || ${JSON.stringify([message])}::jsonb,
        "unread" = ${unread},
        "updatedAt" = now()
    WHERE "id" = ${chatId}
  `;
}
