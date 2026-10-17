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
