// Later: file, tool_call, tool_result.
export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string };

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  model?: string; // assistant only
  createdAt: string;
};

export type ChatSummary = {
  id: string;
  title: string;
  unread: boolean;
  generating: boolean;
};

export type ChatsPage = {
  chats: ChatSummary[];
  nextCursor: string | null;
};

export type MessagesPage = {
  messages: ChatMessage[];
  nextCursor: number | null;
};
