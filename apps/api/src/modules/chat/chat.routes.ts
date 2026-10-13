import { Router } from 'express';

import { chatRequestSchema } from '@cirrus/shared';

import { validateBody } from '../../lib/validate';
import * as chat from './chat.controller';

const router = Router();

router.post('/chat', validateBody(chatRequestSchema), chat.stream);

export default router;
