export const STREAM_TTL_SECONDS = 45;

export function chatStreamKey(requestId: string) {
  return `chat:${requestId}`;
}

export function chatAbortChannel(requestId: string) {
  return `${chatStreamKey(requestId)}:abort`;
}

export function chatActiveKey(chatId: string) {
  return `chat:active:${chatId}`;
}
