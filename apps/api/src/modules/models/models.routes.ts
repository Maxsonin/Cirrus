import { Router } from 'express';
import { getModelsController } from './model.controller';

const router = Router();

router.get('/models', getModelsController);

export default router;
