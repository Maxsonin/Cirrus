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

export type StreamEventType = 'delta' | 'thinking';
