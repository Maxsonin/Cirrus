import { z } from 'zod';

import { modelIds, supportsThinking } from '../models';

export const ANON_MESSAGE_LIMIT = 15;

const textPartSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1),
});

export const inputMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  parts: z.array(textPartSchema).min(1),
});

export type InputMessage = z.infer<typeof inputMessageSchema>;

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

export const listChatsQuerySchema = z.object({ cursor: z.uuid().optional() });

export type ListChatsQuery = z.infer<typeof listChatsQuerySchema>;

export const chatParamsSchema = z.object({ id: z.uuid() });

export type ChatParams = z.infer<typeof chatParamsSchema>;

export const chatMessagesQuerySchema = z.object({
  before: z.coerce.number().int().positive().optional(),
});

export type ChatMessagesQuery = z.infer<typeof chatMessagesQuerySchema>;
