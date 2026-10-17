import type { Response } from 'express';
import { DONE_SIGNAL, type ChatStreamEvent } from '@cirrus/shared';

export function openSse(res: Response) {
  res
    .status(200)
    .set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    .flushHeaders();
}

export function writeSse(
  res: Response,
  event: ChatStreamEvent | 'chat',
  data: string | object,
) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  if (event === 'done') {
    res.write(`data: ${DONE_SIGNAL}\n\n`);
  } else {
    res.write(`event: ${event}\ndata: ${payload}\n\n`);
  }
}
