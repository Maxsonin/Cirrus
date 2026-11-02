import { useState, type KeyboardEvent } from 'react';
import { ArrowUpIcon, BrainIcon, SquareIcon } from 'lucide-react';

import type { Model, ModelId } from '@cirrus/shared';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type ChatInputProps = {
  models: readonly Model[];
  model: ModelId | undefined;
  onModelChange: (model: ModelId) => void;
  think: boolean;
  onThinkChange: (think: boolean) => void;
  streaming: boolean;
  onSubmit: (text: string) => void;
  onStop: () => void;
  className?: string;
};

export function ChatInput({
  models,
  model,
  onModelChange,
  think,
  onThinkChange,
  streaming,
  onSubmit,
  onStop,
  className,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const canSubmit = !streaming && !!model && text.trim().length > 0;
  const supportsThinking =
    models.find((m) => m.id === model)?.thinking.supported ?? false;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(text.trim());
    setText('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }
    event.preventDefault();
    submit();
  };

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <InputGroup className="rounded-3xl shadow-lg shadow-black/5 backdrop-blur-xl has-disabled:opacity-100 dark:bg-card/70 dark:has-disabled:bg-card/70">
        <InputGroupTextarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here"
          aria-label="Message"
          className="max-h-48 min-h-12 px-4 pt-3"
        />

        <InputGroupAddon align="block-end" className="gap-1">
          <Select
            items={models.map((m) => ({ value: m.id, label: m.name }))}
            value={model ?? null}
            onValueChange={(value) => value && onModelChange(value)}
            disabled={streaming}
          >
            <SelectTrigger
              size="sm"
              aria-label="Model"
              className="border-none bg-transparent shadow-none dark:bg-transparent"
            >
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {Object.entries(
                Object.groupBy(models, ({ provider }) => provider),
              ).map(([provider, group = []]) => (
                <SelectGroup key={provider}>
                  <SelectLabel>{provider}</SelectLabel>
                  {group.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

          {supportsThinking && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <InputGroupButton
                    aria-pressed={think}
                    disabled={streaming}
                    onClick={() => onThinkChange(!think)}
                    className={cn(
                      'rounded-full',
                      think && 'bg-accent text-accent-foreground',
                    )}
                  />
                }
              >
                <BrainIcon />
                Think
              </TooltipTrigger>
              <TooltipContent>Reason before answering</TooltipContent>
            </Tooltip>
          )}

          {streaming ? (
            <InputGroupButton
              size="icon-sm"
              variant="default"
              onClick={onStop}
              aria-label="Stop"
              className="ml-auto rounded-full"
            >
              <SquareIcon className="fill-current" />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              size="icon-sm"
              variant="default"
              disabled={!canSubmit}
              aria-label="Send"
              className="ml-auto rounded-full"
            >
              <ArrowUpIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
