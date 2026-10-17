import type { GenerationStreamEventType } from '@cirrus/shared';

export type StreamEvent = {
  type: GenerationStreamEventType;
  value: string;
};

type ProviderEvent = {
  type?: string;
  delta?: string;
};

const PROVIDER_DONE = '[DONE]';

const EVENT_TYPES = new Map<string, GenerationStreamEventType>([
  ['response.output_text.delta', 'delta'],
  ['response.reasoning_summary_text.delta', 'thinking'],
]);

export function parseProviderEvent(data: string): StreamEvent | null {
  if (data === PROVIDER_DONE) return null;

  try {
    const { type, delta } = JSON.parse(data) as ProviderEvent;
    const eventType = type && EVENT_TYPES.get(type);

    return eventType && delta ? { type: eventType, value: delta } : null;
  } catch {
    return null;
  }
}
