import {
  models,
  type AiRequest,
  type ModelId,
  type Model,
} from '@cirrus/shared';

import { env } from '../config/env';
import { parseProviderEvent, type StreamEvent } from './litellm.events';

function findModelById(modelId: ModelId): Model {
  const model = models.find((model) => model.id === modelId);

  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  return model;
}

async function* readSseData(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });

    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? '';

    for (const event of events) {
      if (event.startsWith('data:')) {
        yield event.slice(5).trimStart();
      }
    }
  }
}

export async function* streamResponse(
  request: AiRequest,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const model = findModelById(request.model);

  if (request.think && !model.thinking.supported) {
    throw new Error(`Model "${model.id}" does not support thinking`);
  }

  const response = await fetch(`${env.liteLlmUrl}/v1/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model: request.model,
      input: request.input,
      stream: true,
      reasoning: {
        effort: request.think ? 'medium' : 'none', // TODO: make user choose effort
      },
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    const error = await response.text();

    console.error('LiteLLM error:', {
      status: response.status,
      statusText: response.statusText,
      body: error,
    });

    throw new Error('LiteLLM error: ' + error);
  }

  for await (const data of readSseData(response.body)) {
    const event = parseProviderEvent(data);

    if (event) {
      yield event;
    }
  }
}
