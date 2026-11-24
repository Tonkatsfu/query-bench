import { useMemo, useRef, useState, type KeyboardEvent, type UIEvent } from 'react';
import { Check, Play, RotateCcw } from 'lucide-react';
import { TOKEN_CLASSES, tokenizeSql } from '../utils/sqlHighlighter';

interface SqlEditorProps {
  value: string;
  onChange: (next: string) => void;
  onRunQuery: () => void;
  onSubmitAnswer: () => void;
  onResetStarter: () => void;
  disabled?: boolean;
}

function getCursorPosition(text: string, index: number): { line: number; col: number } {
  const before = text.slice(0, index);
  const lines = before.split('\n');
  return {
    line: lines.length,
    col: lines[lines.length - 1].length + 1,
  };
}

export function SqlEditor({
  value,
  onChange,
  onRunQuery,
  onSubmitAnswer,
  onResetStarter,
  disabled = false,
}: SqlEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const [cursor, setCursor] = useState<{ line: number; col: number }>({ line: 1, col: 1 });

  const tokens = useMemo(() => tokenizeSql(value), [value]);
  const lineCount = useMemo(() => Math.max(1, value.split('\n').length), [value]);

  const syncCursor = (target: HTMLTextAreaElement) => {
    setCursor(getCursorPosition(target.value, target.selectionStart ?? 0));
  };

  const handleScroll = (e: UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (disabled) return;
      if (e.shiftKey) {
        onSubmitAnswer();
      } else {
        onRunQuery();
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const next = `${value.slice(0, start)}  ${value.slice(end)}`;
      onChange(next);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
          syncCursor(textareaRef.current);
        }
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0e0e11]">
      {/* Editor Toolbar */}
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-[#202028] bg-[#111115] px-3">
        <div className="flex items-end h-full">
          <div className="flex items-center gap-2 border-b-2 border-[#e2a03f] pb-2.5 pt-2 px-1">
            <span className="font-mono text-xs font-medium text-[#ececef]">query.sql</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetStarter}
            className="flex h-7 items-center gap-1.5 rounded-[5px] border border-[#272730] bg-[#15151a] px-2.5 text-[11.5px] font-medium text-[#a1a1aa] transition-colors hover:border-[#363642] hover:bg-[#1c1c23] hover:text-[#ececef]"
            title="Reset editor to starter template"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Starter</span>
          </button>

          <button
            type="button"
            onClick={onRunQuery}
            disabled={disabled}
            title="Run Query (Ctrl+Enter / Cmd+Enter)"
            className="flex h-7 items-center gap-1.5 rounded-[5px] border border-[#30303b] bg-[#1a1a21] px-3 text-[11.5px] font-medium text-[#ececef] transition-colors hover:border-[#41414f] hover:bg-[#22222b] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Play className="h-3 w-3 fill-current text-[#e2a03f]" />
            <span>Run Query</span>
          </button>

          <button
            type="button"
            onClick={onSubmitAnswer}
            disabled={disabled}
            title="Submit Answer for Grading (Ctrl+Shift+Enter)"
            className="flex h-7 items-center gap-1.5 rounded-[5px] bg-emerald-600 px-3 text-[11.5px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
            <span>Submit Answer</span>
          </button>
        </div>
      </div>

      {/* Editor Surface */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-[#0b0b0e]">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="sql-editor-layer w-11 shrink-0 select-none overflow-hidden border-r border-[#1a1a21] bg-[#0e0e11] py-3 pr-2.5 text-right tabular-nums"
        >
          {Array.from({ length: lineCount }, (_, idx) => {
            const lineNum = idx + 1;
            const isCurrent = lineNum === cursor.line;
            return (
              <div
                key={idx}
                className={isCurrent ? 'text-[#d4d4d8]' : 'text-[#484852]'}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Code Area */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <pre
            ref={preRef}
            aria-hidden="true"
            className="sql-editor-layer pointer-events-none absolute inset-0 m-0 overflow-hidden p-3"
          >
            <code>
              {tokens.map((tok, idx) => (
                <span key={idx} className={TOKEN_CLASSES[tok.type]}>
                  {tok.value}
                </span>
              ))}
              {'\n'}
            </code>
          </pre>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              syncCursor(e.currentTarget);
            }}
            onClick={(e) => syncCursor(e.currentTarget)}
            onKeyUp={(e) => syncCursor(e.currentTarget)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            aria-label="SQL Query Editor"
            placeholder="-- Write your SQLite query here..."
            className="sql-editor-layer absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent p-3 text-transparent caret-[#e2a03f] outline-none"
          />
        </div>
      </div>

      {/* Subtle IDE Status Bar */}
      <div className="flex h-6 shrink-0 items-center justify-between border-t border-[#1a1a21] bg-[#0e0e11] px-3 font-mono text-[10.5px] text-[#63636e]">
        <div className="flex items-center gap-3 tabular-nums">
          <span>
            Ln {cursor.line}, Col {cursor.col}
          </span>
          <span className="hidden sm:inline">SQLite 3</span>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <span>Ctrl+Enter Run</span>
          <span>·</span>
          <span>Ctrl+Shift+Enter Submit</span>
        </div>
      </div>
    </div>
  );
}
