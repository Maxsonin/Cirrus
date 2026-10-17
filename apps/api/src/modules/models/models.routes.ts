import { Router } from 'express';

import * as modelsController from './models.controller';

const router = Router();

router.get('/models', modelsController.list);

export default router;
