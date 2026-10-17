export type GenerationStreamEventType = 'delta' | 'thinking';

export type ChatStreamEvent = GenerationStreamEventType | 'done' | 'error';

export const DONE_SIGNAL = '[DONE]';

export const ABORT_SIGNAL = '[ABORT]';
