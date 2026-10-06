import type { StreamEventType } from '@cirrus/shared';

type ProviderEvent = {
  type?: string;
  delta?: string;
};

export type StreamEvent = {
  type: StreamEventType;
  value: string;
};

const EVENT_TYPE_MAP: Record<string, StreamEventType> = {
  'response.output_text.delta': 'delta',
  'response.reasoning_summary_text.delta': 'thinking',
};

export function parseProviderEvent(data: string): StreamEvent | null {
  if (data === '[DONE]') {
    return null;
  }

  try {
    const { type, delta } = JSON.parse(data) as ProviderEvent;
    const eventType = type ? EVENT_TYPE_MAP[type] : undefined;

    return eventType && delta ? { type: eventType, value: delta } : null;
  } catch {
    return null;
  }
}
