import { z } from 'zod';

import { modelIds, supportsThinking } from '../models';
import { inputMessageSchema } from './messages';

export const chatRequestSchema = z
  .object({
    chatId: z.uuid().optional(),
    temporary: z.boolean().default(false),
    model: z.enum(modelIds),
    think: z.boolean().default(false),
    messages: z.array(inputMessageSchema).min(1),
  })
  .refine((req) => !req.think || supportsThinking(req.model), {
    message: 'Selected model does not support thinking',
    path: ['think'],
  })
  .refine((req) => req.messages.at(-1)?.role === 'user', {
    message: 'Last message must be from the user',
    path: ['messages'],
  });

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const listChatsQuerySchema = z.object({ cursor: z.string().optional() });

export type ListChatsQuery = z.infer<typeof listChatsQuerySchema>;

export const chatMessagesQuerySchema = z.object({
  before: z.coerce.number().int().positive().optional(),
});

export type ChatMessagesQuery = z.infer<typeof chatMessagesQuerySchema>;
