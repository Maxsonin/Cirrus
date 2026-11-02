import { ChevronRightIcon } from 'lucide-react';

import type { ChatMessage as ChatMessageData } from '@cirrus/shared';

import { Markdown } from '@/components/markdown/Markdown';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { CodeBlockCopyButton } from '@/components/ui/code-block';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Message,
  MessageContent,
  MessageFooter,
} from '@/components/ui/message';

type ChatMessageProps = {
  message: ChatMessageData;
  streaming: boolean;
};

export function ChatMessage({ message, streaming }: ChatMessageProps) {
  const text = message.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('');

  if (message.role === 'user') {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble variant="muted" align="end">
            <BubbleContent>
              <Markdown>{text}</Markdown>
            </BubbleContent>
          </Bubble>
          <MessageFooter className="px-0 transition-opacity focus-within:opacity-100 group-hover/message:opacity-100 [@media(hover:hover)]:opacity-0">
            <CodeBlockCopyButton value={text} size="icon-sm" />
          </MessageFooter>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message>
      <MessageContent>
        {message.parts.map((part, index) =>
          part.type === 'reasoning' ? (
            <Reasoning
              key={index}
              text={part.text}
              streaming={streaming && !text}
            />
          ) : (
            <Markdown key={index} streaming={streaming}>
              {part.text}
            </Markdown>
          ),
        )}

        {text && !streaming && (
          <MessageFooter className="px-0">
            <CodeBlockCopyButton value={text} size="icon-sm" />
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
}

type ReasoningProps = { text: string; streaming: boolean };

function Reasoning({ text, streaming }: ReasoningProps) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        {streaming ? 'Thinking…' : 'Thoughts'}
        <ChevronRightIcon className="size-3.5 transition-transform group-data-panel-open:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 border-l-2 pl-3 text-muted-foreground">
        <Markdown streaming={streaming} className="text-xs">
          {text}
        </Markdown>
      </CollapsibleContent>
    </Collapsible>
  );
}
