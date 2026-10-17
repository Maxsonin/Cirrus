import { randomUUID } from 'node:crypto';
import type { ChatMessage, InputMessage, ModelMessage } from '@cirrus/shared';

export type MessageContent = Pick<ChatMessage, 'role' | 'parts'>;

const TITLE_WORDS = 4;

export function toChatMessage(input: InputMessage): ChatMessage {
  return {
    id: randomUUID(),
    role: input.role,
    parts: input.parts,
    createdAt: new Date().toISOString(),
  };
}

// TODO: make fast LLM generate a title
export function titleFrom(message: ChatMessage) {
  const words = textOf(message).trim().split(/\s+/);
  const title = words.slice(0, TITLE_WORDS).join(' ');
  return words.length > TITLE_WORDS ? `${title}…` : title;
}

export function toModelInput(messages: MessageContent[]): ModelMessage[] {
  return messages
    .map((m) => ({ role: m.role, content: textOf(m) }))
    .filter((m) => m.content);
}

function textOf(message: Pick<ChatMessage, 'parts'>) {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('');
}
