import type { ModelId } from '../models';

export type AiInput = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type AiRequest = {
  model: ModelId;
  input: AiInput[];
  think: boolean;
};

export type ChatJobData = {
  requestId: string;
  request: AiRequest;
};

export type GenerationStreamEventType = 'delta' | 'thinking';

export type ChatStreamEvent = GenerationStreamEventType | 'done' | 'error';
