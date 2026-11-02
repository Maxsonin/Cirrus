import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import type { ChatMessage } from '@cirrus/shared';

import { isDev } from '../config/env';
import { prisma } from '../infra/prisma';

const EMAIL = 'test@cirrus.dev';
const PASSWORD = 'password123';
const CHAT_COUNT = 40;

if (!isDev) throw new Error('Seed runs only in development');

const message = (role: ChatMessage['role'], text: string): ChatMessage => ({
  id: randomUUID(),
  role,
  parts: [{ type: 'text', text }],
  createdAt: new Date().toISOString(),
});

// Cascade removes the previous run's chats and accounts.
await prisma.user.deleteMany({ where: { email: EMAIL } });

const userId = randomUUID();
await prisma.user.create({
  data: {
    id: userId,
    name: 'Test User',
    email: EMAIL,
    emailVerified: true,
    accounts: {
      create: {
        id: randomUUID(),
        accountId: userId,
        providerId: 'credential',
        password: await hashPassword(PASSWORD),
      },
    },
  },
});

const longConversation = Array.from({ length: 30 }, (_, i) =>
  message(i % 2 ? 'assistant' : 'user', `Message ${i + 1}. `.repeat(20)),
);

const markdown = [
  message('user', 'Show me markdown'),
  message(
    'assistant',
    '## Heading\n\n**Bold**, *italic*, `code`, and a list:\n\n- one\n- two\n\n```ts\nconst x: number = 42;\n```\n\nMath: $e^{i\\pi} + 1 = 0$',
  ),
];

const now = Date.now();
await prisma.chat.createMany({
  data: Array.from({ length: CHAT_COUNT }, (_, i) => ({
    userId,
    title:
      i === 0
        ? 'Long conversation'
        : i === 1
          ? 'Markdown rendering'
          : i === 2
            ? 'A very long chat title that should be truncated in the sidebar'
            : `Seeded chat ${i + 1}`,
    messages: i === 0 ? longConversation : i === 1 ? markdown : [],
    unread: i === 3,
    // Spread timestamps so ordering and pagination behave like real data.
    updatedAt: new Date(now - i * 60_000),
  })),
});

console.log(`Seeded ${EMAIL} / ${PASSWORD} with ${CHAT_COUNT} chats`);
await prisma.$disconnect();
