import type { ComponentProps } from 'react';
import { createMathPlugin } from '@streamdown/math';
import 'katex/dist/katex.min.css';
import {
  Streamdown,
  defaultRemarkPlugins,
  type Components,
  type ExtraProps,
} from 'streamdown';

import { cn } from '@/lib/utils';

import { MarkdownCodeBlock } from './MarkdownCodeBlock';
import { prepareMath } from './prepare-math';

const plugins = { math: createMathPlugin({ singleDollarTextMath: true }) };

const components: Components = {
  inlineCode: InlineCode,
  code: ({ className, children }) => (
    <MarkdownCodeBlock
      code={String(children)}
      language={languageOf(className)}
    />
  ),
};

type MarkdownProps = {
  children: string;
  streaming?: boolean;
  className?: string;
};

export function Markdown({
  children,
  streaming = false,
  className,
}: MarkdownProps) {
  return (
    <Streamdown
      mode={streaming ? 'streaming' : 'static'}
      isAnimating={streaming}
      remarkPlugins={[...Object.values(defaultRemarkPlugins)]}
      plugins={plugins}
      components={components}
      className={cn(
        'min-w-0 text-sm leading-relaxed [&_.katex-display]:my-6!',
        className,
      )}
    >
      {prepareMath(children)}
    </Streamdown>
  );
}

function InlineCode({
  node,
  className,
  ...props
}: ComponentProps<'code'> & ExtraProps) {
  return (
    <code
      className={cn(
        'rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.9em]',
        className,
      )}
      {...props}
    />
  );
}

function languageOf(className?: string) {
  return /language-(\S+)/.exec(className ?? '')?.[1] ?? '';
}
