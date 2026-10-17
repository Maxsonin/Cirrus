import type { Request, Response } from 'express';

import * as modelsService from './models.service';

export function list(req: Request, res: Response) {
  res.json(modelsService.getAvailableModels());
}
