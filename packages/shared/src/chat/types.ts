import type { ModelId } from '../models';
import type { ModelMessage } from './messages';

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

export type GenerationStreamEventType = 'delta' | 'thinking';

export type ChatStreamEvent = GenerationStreamEventType | 'done' | 'error';
