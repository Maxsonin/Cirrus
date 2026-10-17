import type { Request, Response } from 'express';

import type {
  ChatMessagesQuery,
  ChatParams,
  ChatRequest,
  ListChatsQuery,
} from '@cirrus/shared';

import { getUserId } from '../../auth/session';
import * as chatService from './chat.service';
import { resumeStream, streamPersistent, streamStateless } from './chat.sse';

/**
 * Temp docs:
 * - Persistent (user should be signed in) chats send only the new user message as other messages are stored in DB
 * - Stateless (Anonymous and Temporary) chats send the whole history
 *
 * - Anonymous have maximum message limit of ANON_MESSAGE_LIMIT (currently 15)
 * - When user leaves from Stateless chat (reload page, close tab, etc.) the generation is aborted and everything is lost
 * - When user leaves from Persistent chat generation keeps running on worker and he can reconnect
 *   to the stream or if the generation is already done see the mark that indicates finished response
 * - Only one chat can be active at a time for anonymous users. This enforced by frontend (should be enforced by backend???)
 * - It is possible to reconnect to the generation as we don't remove generation messages from Redis. Deletion is handled by TTL
 *
 * - Reasoning is shown to the user but never sent back to the model.
 */
export async function stream(
  req: Request<unknown, unknown, ChatRequest>,
  res: Response,
) {
  const user = res.locals.user;

  if (!user || req.body.temporary) {
    await streamStateless(req.body, res, !user);
  } else {
    await streamPersistent(req.body, res, user.id);
  }
}

export async function list(
  req: Request<unknown, unknown, unknown, ListChatsQuery>,
  res: Response,
) {
  const { cursor } = req.query;
  res.json(await chatService.listChats(getUserId(res), cursor));
}

export async function messages(
  req: Request<ChatParams, unknown, unknown, ChatMessagesQuery>,
  res: Response,
) {
  const { before } = req.query;
  res.json(
    await chatService.getMessages(
      getUserId(res),
      req.params.id,
      before ?? null,
    ),
  );
}

export async function resume(req: Request<ChatParams>, res: Response) {
  await resumeStream(res, getUserId(res), req.params.id);
}

export async function abort(req: Request<ChatParams>, res: Response) {
  await chatService.stopGeneration(getUserId(res), req.params.id);
  res.status(204).end();
}

export async function remove(req: Request<ChatParams>, res: Response) {
  await chatService.deleteChat(getUserId(res), req.params.id);
  res.status(204).end();
}
