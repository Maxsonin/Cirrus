import { z } from 'zod';

export const ANON_MESSAGE_LIMIT = 15;

const textPartSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1),
});

// Server-produced parts. Later: file, tool_call, tool_result.
export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string };

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  model?: string; // assistant only
  createdAt: string;
};

export const inputMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  parts: z.array(textPartSchema).min(1),
});

export type InputMessage = z.infer<typeof inputMessageSchema>;

export type ModelMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

// Reasoning is shown to the user but never sent back to the model.
export function toModelInput(
  messages: Pick<ChatMessage, 'role' | 'parts'>[],
): ModelMessage[] {
  return messages
    .map((m) => ({
      role: m.role,
      content: m.parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join(''),
    }))
    .filter((m) => m.content);
}
