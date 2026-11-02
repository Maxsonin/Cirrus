import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from '@/components/ui/code-block';
import { useHighlightedCode } from '@/hooks/use-highlighted-code';

type MarkdownCodeBlockProps = {
  code: string;
  language: string;
};

export function MarkdownCodeBlock({ code, language }: MarkdownCodeBlockProps) {
  const lines = useHighlightedCode(code, language);

  return (
    <CodeBlock size="sm" className="my-2">
      <CodeBlockHeader>
        <CodeBlockTitle>{language || 'text'}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent>
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  );
}
