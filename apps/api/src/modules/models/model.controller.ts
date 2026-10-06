import type { Request, Response } from 'express';
import { modelService } from './model.service';

export function getModelsController(_req: Request, res: Response): void {
  res.json(modelService.getAvailableModels());
}
