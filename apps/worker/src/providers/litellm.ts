import {
  models,
  type AiRequest,
  type ModelId,
  type Model,
} from '@cirrus/shared';

import { env } from '../config/env';

function findModelById(modelId: ModelId): Model {
  const model = models.find((model) => model.id === modelId);

  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  return model;
}

export async function createResponseStream(
  request: AiRequest,
  signal: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
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

  return response.body;
}
