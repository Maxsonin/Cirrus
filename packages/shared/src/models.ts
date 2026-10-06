export const models = [
  {
    id: 'qwen3.5:9b',
    name: 'Qwen 3.5 9B',
    description: 'Best for complex task requiring deep thinking',
    provider: 'Ollama',
    thinking: {
      supported: true,
    },
  },
  {
    id: 'gemma3:4b',
    name: 'Gemma 3.0 4B',
    description: 'Fastest for quick answers',
    provider: 'Ollama',
    thinking: {
      supported: false,
    },
  },
] as const;

export type Model = (typeof models)[number];
export type ModelId = Model['id'];
