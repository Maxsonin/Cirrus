import type { ModelId } from '../models';

export const CHAT_QUEUE = 'chat';

export type ModelMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type GenerationRequest = {
  model: ModelId;
  think: boolean;
  input: ModelMessage[];
};

export type ChatJobData = {
  requestId: string;
  chatId: string | null; // null for stateless chats: nothing is persisted
  request: GenerationRequest;
};
