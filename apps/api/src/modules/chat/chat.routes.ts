import { Router } from 'express';

import {
  chatMessagesQuerySchema,
  chatRequestSchema,
  listChatsQuerySchema,
} from '@cirrus/shared';

import { loadSession, requireUser } from '../../lib/session';
import { validateBody, validateQuery } from '../../lib/validate';

import * as chatController from './chat.controller';

const router = Router();

router.post(
  '/chat',
  loadSession,
  validateBody(chatRequestSchema),
  chatController.stream,
);

router.get(
  '/chats',
  requireUser,
  validateQuery(listChatsQuerySchema),
  chatController.list,
);
router.get(
  '/chats/:id/messages',
  requireUser,
  validateQuery(chatMessagesQuerySchema),
  chatController.messages,
);
router.get('/chats/:id/stream', requireUser, chatController.resume);
router.post('/chats/:id/abort', requireUser, chatController.abort);
router.delete('/chats/:id', requireUser, chatController.remove);

export default router;
