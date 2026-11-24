interface InlineCodeTextProps {
  text: string;
  className?: string;
}

/**
 * Renders prose with backtick-delimited inline code snippets cleanly integrated into dark text.
 */
export function InlineCodeText({ text, className = '' }: InlineCodeTextProps) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
          return (
            <code
              key={idx}
              className="mx-0.5 rounded-[3px] bg-[#18181e] px-1.5 py-[1px] font-mono text-[12px] text-[#e6c484] border border-[#26262f]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
}
