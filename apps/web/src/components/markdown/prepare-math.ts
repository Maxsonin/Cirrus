// remark-math renders `$$…$$` as a block only when the delimiters sit on
// their own lines; models often put a lone formula on a single line.
const loneMath = /^([ \t]*)\$\$(.+?)\$\$[ \t]*$/gm;

// Left as is. Code and block math may be unclosed while streaming.
const keep = [
  /```[\s\S]*?(?:```|$)/, // fenced code
  /`[^`\n]*`/, // inline code
  /(?<=^|\n)[ \t]*\$\$[ \t]*\n[\s\S]*?(?:\n[ \t]*\$\$|$)/, // block math
  /\$\$[^$\n]+?\$\$/, // inline `$$` math
  /\\\$/, // already escaped
];

// Pandoc's rule: no space inside the delimiters, no digit after the closing
// one. Keeps "$10-$15" and "$5 and $7" from parsing as math.
const inlineMath = /\$(?=\S)[^$\n]*?\S\$(?!\d)/;

const dollars = new RegExp(
  `(${keep.map((r) => r.source).join('|')})|${inlineMath.source}|\\$`,
  'g',
);

/** Normalizes model math so prices and stray `$` render as text. */
export function prepareMath(markdown: string) {
  return markdown
    .replace(loneMath, '$1$$$$\n$1$2\n$1$$$$')
    .replace(dollars, (match, kept) =>
      kept || match.length > 1 ? match : '\\$',
    );
}
