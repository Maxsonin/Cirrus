import type { ChatRequest } from './schemas';

export type ChatJobData = {
  requestId: string;
  request: ChatRequest;
};

export type GenerationStreamEventType = 'delta' | 'thinking';

export type ChatStreamEvent = GenerationStreamEventType | 'done' | 'error';
