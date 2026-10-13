import { z } from 'zod';

import { modelIds, supportsThinking } from '../models';

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

export const chatRequestSchema = z
  .object({
    model: z.enum(modelIds),
    input: z.array(chatMessageSchema).min(1),
    think: z.boolean().default(false),
  })
  .refine((req) => !req.think || supportsThinking(req.model), {
    message: 'Selected model does not support thinking',
    path: ['think'],
  });

export type ChatRequest = z.infer<typeof chatRequestSchema>;
