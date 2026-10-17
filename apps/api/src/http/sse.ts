import type { Response } from 'express';

type SseMessage = {
  event?: string;
  data: string | object;
};

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

export function writeSse(res: Response, { event, data }: SseMessage) {
  const eventLine = event ? `event: ${event}\n` : '';
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  res.write(`${eventLine}data: ${payload}\n\n`);
}

export function abortOnDisconnect(res: Response, onAbort?: () => void) {
  const controller = new AbortController();

  res.on('close', () => {
    if (res.writableEnded) return;

    controller.abort();
    onAbort?.();
  });

  return controller.signal;
}
