import { models, type Model, type ModelId } from '@cirrus/shared';

export const modelService = {
  getAvailableModels() {
    return models;
  },

  findModelById(modelId: ModelId): Model | undefined {
    return models.find((model) => model.id === modelId);
  },
};
