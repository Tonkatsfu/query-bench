import { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { getRelevantRefresherTopics } from '../data/sqlRefresher';
import type { Problem, QueryResult } from '../types/sql';
import { TOKEN_CLASSES, tokenizeSql } from '../utils/sqlHighlighter';
import { DataTable } from './DataTable';
import { DifficultyBadge } from './DifficultyBadge';
import { InlineCodeText } from './InlineCodeText';

interface ProblemViewProps {
  problem: Problem;
  isSolved: boolean;
  expectedResult: QueryResult | null;
  onLoadSqlIntoEditor: (sql: string) => void;
  onOpenRefresherTopic: (topicId?: string) => void;
}

export function ProblemView({
  problem,
  isSolved,
  expectedResult,
  onLoadSqlIntoEditor,
  onOpenRefresherTopic,
}: ProblemViewProps) {
  const [openHints, setOpenHints] = useState<Record<number, boolean>>({});
  const [showSolution, setShowSolution] = useState(false);

  const relevantRefresherTopics = getRelevantRefresherTopics(problem);

  const toggleHint = (idx: number) => {
    setOpenHints((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const previewResult: QueryResult | null = expectedResult
    ? {
        ...expectedResult,
        values: expectedResult.values.slice(0, 3),
        rowCount: Math.min(3, expectedResult.values.length),
      }
    : null;

  const solutionTokens = showSolution ? tokenizeSql(problem.solutionSql) : [];

  return (
    <article className="divide-y divide-[#1d1d24] text-[13.5px] leading-[1.65] text-[#a1a1aa]">
      {/* Header & Metadata */}
      <header className="px-5 pt-5 pb-4">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <DifficultyBadge difficulty={problem.difficulty} />
          <span className="text-[#3f3f46]">·</span>
          <span className="text-[#a1a1aa]">{problem.stakeholder}</span>
          {isSolved && (
            <>
              <span className="text-[#3f3f46]">·</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Solved
              </span>
            </>
          )}
        </div>

        <h1 className="mt-2 text-[19px] font-semibold tracking-[-0.02em] text-[#ececef] leading-snug">
          {problem.number}. {problem.title}
        </h1>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {problem.concepts.map((concept) => (
            <span
              key={concept}
              className="rounded-[3px] bg-[#16161b] px-2 py-0.5 font-mono text-[11px] text-[#a1a1aa]"
            >
              {concept}
            </span>
          ))}
        </div>

        {/* Inline Refresher Quick Links */}
        {relevantRefresherTopics.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            <span className="text-[#71717a]">Syntax refresher:</span>
            {relevantRefresherTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => onOpenRefresherTopic(topic.id)}
                className="inline-flex items-center gap-0.5 font-mono text-[11.5px] text-[#e2a03f] underline decoration-[#e2a03f]/35 underline-offset-4 transition-colors hover:text-[#f3be6b] hover:decoration-[#e2a03f]"
              >
                <span>{topic.badge}</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Business Scenario */}
      <section className="px-5 py-4">
        <h2 className="text-xs font-semibold tracking-tight text-[#ececef]">
          Stakeholder Request
        </h2>
        <p className="mt-2 max-w-[65ch] text-[#d4d4d8]">
          <InlineCodeText text={problem.scenario} />
        </p>

        <h3 className="mt-5 text-xs font-semibold tracking-tight text-[#ececef]">
          Output Requirements
        </h3>
        <ul className="mt-2 max-w-[65ch] space-y-2 text-[13px] text-[#b4b4bd]">
          {problem.requirements.map((req, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#e2a03f]" />
              <InlineCodeText text={req} />
            </li>
          ))}
        </ul>
      </section>

      {/* Expected Output Schema */}
      <section className="px-5 py-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold tracking-tight text-[#ececef]">
            Expected Columns
          </h2>
          {expectedResult && (
            <span className="font-mono text-[11px] tabular-nums text-[#71717a]">
              {expectedResult.rowCount} rows × {expectedResult.columns.length} cols
            </span>
          )}
        </div>

        <div className="mt-2.5 divide-y divide-[#1a1a21] border-y border-[#1d1d24]">
          {problem.expectedColumns.map((col) => (
            <div
              key={col.name}
              className="grid grid-cols-1 sm:grid-cols-[minmax(140px,auto)_1fr] items-baseline gap-x-4 gap-y-0.5 py-2 text-xs"
            >
              <div className="flex items-baseline gap-2">
                <code className="font-mono font-medium text-[#ececef]">{col.name}</code>
                <span className="font-mono text-[10.5px] text-[#63636e]">{col.type}</span>
              </div>
              <span className="text-[#8e8e98] text-[12px] sm:text-right">
                {col.description}
              </span>
            </div>
          ))}
        </div>

        {previewResult && previewResult.rowCount > 0 && (
          <div className="mt-3.5">
            <div className="mb-1.5 text-[11px] text-[#63636e]">
              Sample format (first {previewResult.rowCount} of {expectedResult?.rowCount} rows)
            </div>
            <div className="overflow-hidden rounded-[5px] border border-[#202028] bg-[#0b0b0e]">
              <DataTable result={previewResult} compact maxHeightClass="max-h-40" />
            </div>
          </div>
        )}
      </section>

      {/* Progressive Hints */}
      <section className="divide-y divide-[#1a1a21]">
        {problem.hints.map((hint, idx) => {
          const isOpen = !!openHints[idx];
          return (
            <div key={idx}>
              <button
                type="button"
                onClick={() => toggleHint(idx)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between px-5 py-3 text-left text-xs font-medium text-[#d4d4d8] transition-colors hover:bg-[#131318] hover:text-[#ececef]"
              >
                <span>Hint {idx + 1}</span>
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-[#71717a]" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-[#71717a]" />
                )}
              </button>
              {isOpen && (
                <div className="bg-[#0b0b0e] px-5 pb-4 pt-1 text-[13px] text-[#b4b4bd] max-w-[65ch]">
                  <InlineCodeText text={hint} />
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Reference Solution & Explanation */}
      <section>
        <div className="flex items-center justify-between px-5 py-3 hover:bg-[#131318] transition-colors">
          <button
            type="button"
            onClick={() => setShowSolution((v) => !v)}
            aria-expanded={showSolution}
            className="flex flex-1 items-center gap-2 text-left text-xs font-medium text-[#d4d4d8] hover:text-[#ececef]"
          >
            {showSolution ? (
              <EyeOff className="h-3.5 w-3.5 text-[#71717a]" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-[#e2a03f]" />
            )}
            <span>{showSolution ? 'Hide Reference Solution' : 'Reveal Reference Solution'}</span>
          </button>

          {showSolution && (
            <button
              type="button"
              onClick={() => onLoadSqlIntoEditor(problem.solutionSql)}
              className="flex items-center gap-1.5 rounded-[4px] border border-[#2a2a35] bg-[#16161c] px-2.5 py-1 text-[11px] font-medium text-[#ececef] transition-colors hover:border-[#3a3a47] hover:bg-[#1e1e26]"
            >
              <Copy className="h-3 w-3 text-[#a1a1aa]" />
              Load in Editor
            </button>
          )}
        </div>

        {showSolution && (
          <div className="border-t border-[#1d1d24] bg-[#0a0a0c]">
            <pre className="overflow-x-auto px-5 py-3.5 font-mono text-[12px] leading-relaxed">
              <code>
                {solutionTokens.map((tok, i) => (
                  <span key={i} className={TOKEN_CLASSES[tok.type]}>
                    {tok.value}
                  </span>
                ))}
              </code>
            </pre>
            <div className="border-t border-[#1a1a21] bg-[#0e0e11] px-5 py-3.5">
              <div className="text-xs font-semibold text-emerald-400">Why this works</div>
              <p className="mt-1.5 max-w-[65ch] text-[13px] text-[#b4b4bd]">
                <InlineCodeText text={problem.explanation} />
              </p>
            </div>
          </div>
        )}
      </section>
    </article>
  );
}
