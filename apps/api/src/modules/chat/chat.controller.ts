import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import {
  ABORT_SIGNAL,
  chatAbortChannel,
  chatStreamKey,
  DONE_SIGNAL,
  type AiRequest,
} from '@cirrus/shared';

import { streamClient } from '../../config/redis';
import { pubsubPublisher } from '../../config/pubsub';
import { generateChat } from './chat.service';

export async function chatController(req: Request, res: Response) {
  const requestId = randomUUID();

  const streamKey = chatStreamKey(requestId);
  const abortChannel = chatAbortChannel(requestId);

  let aborted = false;

  try {
    // User abortion handler
    res.on('close', () => {
      if (res.writableEnded) return;

      aborted = true;
      pubsubPublisher.publish(abortChannel, ABORT_SIGNAL);
      console.log(`Client disconnected: ${requestId}`);
    });

    res
      .status(200)
      .set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })
      .flushHeaders();

    const request = req.body as AiRequest; // TODO: add Zod middleware for validation and prevent incorrect models from starting a job in worker

    await generateChat(requestId, request);

    let lastId = '0';
    while (!aborted) {
      const result = await streamClient.xRead(
        [{ key: streamKey, id: lastId }],
        { BLOCK: 10000 },
      );

      if (!result) {
        continue;
      }

      for (const stream of result) {
        for (const message of stream.messages) {
          lastId = message.id;

          const { event, data } = message.message;

          if (event === 'done') {
            res.write(`data: ${DONE_SIGNAL}\n\n`);
          } else {
            res.write(`event: ${event}\ndata: ${data}\n\n`);
          }

          if (event !== 'done' && event !== 'error') {
            continue;
          }

          res.end();

          await streamClient.del(streamKey);

          return;
        }
      }
    }

    await streamClient.del(streamKey);
  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Something went wrong',
      });
    } else {
      res.write('data: [ERROR]\n\n');
      res.end();
    }
  }
}
