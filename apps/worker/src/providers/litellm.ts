import { getModel, type GenerationRequest } from '@cirrus/shared';

import { env } from '../config/env';
import { readSseData } from '../lib/sse';
import { parseProviderEvent, type StreamEvent } from './litellm.events';

export async function* streamResponse(
  request: GenerationRequest,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const model = getModel(request.model);

  if (request.think && !model.thinking.supported) {
    throw new Error(`Model "${model.id}" does not support thinking`);
  }

  const response = await fetch(`${env.LITELLM_URL}/v1/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model: model.id,
      input: request.input,
      stream: true,
      reasoning: {
        effort: request.think ? 'medium' : 'none', // TODO: make user choose effort
      },
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    const body = await response.text();
    throw new Error(
      `LiteLLM error ${response.status} ${response.statusText}: ${body}`,
    );
  }

  for await (const data of readSseData(response.body)) {
    const event = parseProviderEvent(data);
    if (event) yield event;
  }
}
