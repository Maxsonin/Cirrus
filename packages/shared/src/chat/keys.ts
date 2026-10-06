export const CHAT_QUEUE = 'chat';

export const ABORT_SIGNAL = '[ABORT]';
export const DONE_SIGNAL = '[DONE]';

export function chatStreamKey(requestId: string) {
  return `chat:${requestId}`;
}

export function chatAbortChannel(requestId: string) {
  return `${chatStreamKey(requestId)}:abort`;
}
