import { Router } from 'express';

import {
  chatMessagesQuerySchema,
  chatParamsSchema,
  chatRequestSchema,
  listChatsQuerySchema,
} from '@cirrus/shared';

import { loadSession, requireUser } from '../../auth/session';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../http/validate';

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
  validateParams(chatParamsSchema),
  validateQuery(chatMessagesQuerySchema),
  chatController.messages,
);
router.get(
  '/chats/:id/stream',
  requireUser,
  validateParams(chatParamsSchema),
  chatController.resume,
);
router.post(
  '/chats/:id/abort',
  requireUser,
  validateParams(chatParamsSchema),
  chatController.abort,
);
router.delete(
  '/chats/:id',
  requireUser,
  validateParams(chatParamsSchema),
  chatController.remove,
);

export default router;
