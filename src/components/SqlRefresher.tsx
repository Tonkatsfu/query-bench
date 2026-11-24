import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Play,
  Search,
} from 'lucide-react';
import {
  REFRESHER_TOPICS,
  SQL_EXECUTION_ORDER,
  getRelevantRefresherTopics,
  type RefresherCategory,
  type RefresherTopic,
} from '../data/sqlRefresher';
import type { Problem, QueryResult } from '../types/sql';
import { TOKEN_CLASSES, tokenizeSql } from '../utils/sqlHighlighter';
import { DataTable } from './DataTable';
import { InlineCodeText } from './InlineCodeText';

interface SqlRefresherProps {
  currentProblem: Problem;
  focusedTopicId?: string | null;
  onRunExampleSql: (sql: string) => QueryResult | null;
  onLoadSqlIntoEditor: (sql: string) => void;
}

type CategoryFilter = 'All' | RefresherCategory;

const CATEGORIES: CategoryFilter[] = [
  'All',
  'Fundamentals',
  'Joins & NULLs',
  'Intermediate Analytics',
  'Window Functions & Time-Series',
];

function HighlightedSqlBlock({ sql }: { sql: string }) {
  const tokens = tokenizeSql(sql);
  return (
    <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[11.5px] leading-relaxed bg-[#09090b]">
      <code>
        {tokens.map((tok, idx) => (
          <span key={idx} className={TOKEN_CLASSES[tok.type]}>
            {tok.value}
          </span>
        ))}
      </code>
    </pre>
  );
}

export function SqlRefresher({
  currentProblem,
  focusedTopicId,
  onRunExampleSql,
  onLoadSqlIntoEditor,
}: SqlRefresherProps) {
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [search, setSearch] = useState('');
  const [showOrderGuide, setShowOrderGuide] = useState(true);
  const recommendedTopics = getRelevantRefresherTopics(currentProblem);
  const recommendedIds = new Set(recommendedTopics.map((t) => t.id));

  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const id of recommendedIds) {
      initial[id] = true;
    }
    return initial;
  });
  const [exampleResults, setExampleResults] = useState<Record<string, QueryResult | null>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (focusedTopicId) {
      setCategory('All');
      setExpandedTopics((prev) => ({ ...prev, [focusedTopicId]: true }));
      const el = document.getElementById(`refresher-topic-${focusedTopicId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusedTopicId]);

  const filteredTopics = REFRESHER_TOPICS.filter((t) => {
    const matchesCat = category === 'All' || t.category === category;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.badge.toLowerCase().includes(q) ||
      t.summary.toLowerCase().includes(q) ||
      t.syntaxBlueprint.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const focusAndOpenTopic = (topic: RefresherTopic) => {
    setCategory('All');
    setSearch('');
    setExpandedTopics((prev) => ({ ...prev, [topic.id]: true }));
    requestAnimationFrame(() => {
      const el = document.getElementById(`refresher-topic-${topic.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleRunExample = (key: string, sql: string) => {
    if (exampleResults[key]) {
      setExampleResults((prev) => ({ ...prev, [key]: null }));
      return;
    }
    const res = onRunExampleSql(sql);
    setExampleResults((prev) => ({ ...prev, [key]: res }));
  };

  const handleCopyToEditor = (key: string, sql: string) => {
    onLoadSqlIntoEditor(sql);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="divide-y divide-[#1d1d24] text-[13px] text-[#a1a1aa]">
      {/* Header & Problem-Relevant Jump Links */}
      <header className="px-5 py-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[#ececef]">
            SQL Command Reference &amp; Live Examples
          </h2>
          <p className="mt-1 max-w-[65ch] text-xs leading-relaxed text-[#8e8e98]">
            Review syntax patterns and run live queries against the in-memory database without
            leaving your problem draft.
          </p>
        </div>

        {recommendedTopics.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-xs">
            <span className="text-[#71717a]">For Problem #{currentProblem.number}:</span>
            {recommendedTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => focusAndOpenTopic(topic)}
                className="inline-flex items-center gap-0.5 font-mono text-[11.5px] text-[#e2a03f] underline decoration-[#e2a03f]/35 underline-offset-4 hover:text-[#f3be6b] hover:decoration-[#e2a03f]"
              >
                <span>{topic.badge}</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Query Execution Order Mental Model */}
      <section>
        <button
          type="button"
          onClick={() => setShowOrderGuide((v) => !v)}
          aria-expanded={showOrderGuide}
          className="flex w-full items-center justify-between px-5 py-3 text-left text-xs font-semibold text-[#ececef] hover:bg-[#131318] transition-colors"
        >
          <span>SQL Clause Write Order vs. Engine Execution Order</span>
          {showOrderGuide ? (
            <ChevronDown className="h-3.5 w-3.5 text-[#71717a]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[#71717a]" />
          )}
        </button>

        {showOrderGuide && (
          <div className="px-5 pb-4 space-y-3">
            <p className="max-w-[65ch] text-xs leading-relaxed text-[#a1a1aa]">
              Write clauses top-to-bottom (<code className="font-mono text-[#e6c484]">SELECT → FROM → WHERE</code>),
              but remember the engine runs <code className="font-mono text-[#e6c484]">FROM → JOIN → WHERE → GROUP BY</code> first.
              That is why aggregate filters belong in <code className="font-mono text-[#e6c484]">HAVING</code>, not{' '}
              <code className="font-mono text-[#e6c484]">WHERE</code>.
            </p>

            <div className="overflow-hidden rounded-[5px] border border-[#202028] bg-[#0b0b0e]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#202028] bg-[#121216] text-[11px] text-[#71717a]">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">Write</th>
                    <th className="px-3 py-1.5 font-medium">Clause</th>
                    <th className="px-3 py-1.5 font-medium">Executes</th>
                    <th className="px-3 py-1.5 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#17171d]">
                  {SQL_EXECUTION_ORDER.map((item) => (
                    <tr key={item.clause}>
                      <td className="px-3 py-1.5 font-mono text-[11px] tabular-nums text-[#63636e]">
                        {item.writeOrder}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[11.5px] font-medium text-[#e2a03f]">
                        {item.clause}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[11px] tabular-nums text-emerald-400">
                        #{item.execOrder}
                      </td>
                      <td className="px-3 py-1.5 text-[11.5px] text-[#b4b4bd]">
                        {item.purpose}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Search & Filter Bar */}
      <section className="px-5 pt-3 pb-0 space-y-2.5 bg-[#0c0c0f]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#63636e]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands (WHERE, GROUP BY, LEFT JOIN, LAG, CTE)…"
            aria-label="Search SQL refresher commands"
            className="w-full rounded-[5px] border border-[#24242c] bg-[#121216] py-1.5 pl-8 pr-3 text-xs text-[#ececef] placeholder-[#63636e] focus:border-[#3b3b47] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-4 overflow-x-auto text-[11.5px]">
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`shrink-0 border-b-2 pb-2 font-medium transition-colors ${
                  active
                    ? 'border-[#e2a03f] text-[#ececef]'
                    : 'border-transparent text-[#71717a] hover:text-[#d4d4d8]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Topic Accordions */}
      <div className="divide-y divide-[#1d1d24]">
        {filteredTopics.map((topic) => {
          const isOpen = !!expandedTopics[topic.id];
          const isRecommended = recommendedIds.has(topic.id);

          return (
            <section key={topic.id} id={`refresher-topic-${topic.id}`}>
              <button
                type="button"
                onClick={() => toggleTopic(topic.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-[#131318]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#71717a]" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#71717a]" />
                  )}
                  <span className="truncate text-xs font-semibold text-[#ececef]">
                    {topic.title}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isRecommended && (
                    <span className="text-[10.5px] font-medium text-[#e2a03f]">
                      Used in #{currentProblem.number}
                    </span>
                  )}
                  <span className="font-mono text-[10.5px] text-[#63636e]">
                    {topic.badge}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="bg-[#0b0b0e] px-5 pb-5 pt-2 space-y-4">
                  <div className="max-w-[65ch] space-y-2 text-[13px] leading-relaxed text-[#d4d4d8]">
                    <p>
                      <InlineCodeText text={topic.summary} />
                    </p>
                    <p className="text-xs text-[#a1a1aa]">
                      <strong className="font-semibold text-[#ececef]">When to use: </strong>
                      <InlineCodeText text={topic.whenToUse} />
                    </p>
                  </div>

                  {/* Syntax Blueprint */}
                  <div className="overflow-hidden rounded-[5px] border border-[#202028]">
                    <div className="border-b border-[#1c1c23] bg-[#121216] px-3.5 py-1.5 text-[11px] font-medium text-[#71717a]">
                      Syntax Pattern
                    </div>
                    <HighlightedSqlBlock sql={topic.syntaxBlueprint} />
                  </div>

                  {/* Key Rules */}
                  <ul className="max-w-[65ch] space-y-1.5 text-xs text-[#b4b4bd]">
                    {topic.keyRules.map((rule, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#e2a03f]" />
                        <InlineCodeText text={rule} />
                      </li>
                    ))}
                  </ul>

                  {/* Runnable Examples */}
                  <div className="space-y-3 pt-1">
                    {topic.examples.map((ex, exIdx) => {
                      const exKey = `${topic.id}-ex-${exIdx}`;
                      const previewRes = exampleResults[exKey];
                      const isCopied = copiedKey === exKey;

                      return (
                        <div
                          key={exKey}
                          className="overflow-hidden rounded-[5px] border border-[#22222b] bg-[#09090b]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c1c23] bg-[#121216] px-3.5 py-2">
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-[#ececef]">
                                {ex.title}
                              </div>
                              <div className="text-[11px] text-[#71717a]">{ex.description}</div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleRunExample(exKey, ex.sql)}
                                className={`flex items-center gap-1 rounded-[4px] border px-2 py-1 text-[11px] font-medium transition-colors ${
                                  previewRes
                                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                    : 'border-[#2c2c37] bg-[#18181f] text-[#ececef] hover:border-[#3c3c4a] hover:bg-[#202029]'
                                }`}
                              >
                                <Play className="h-2.5 w-2.5 fill-current" />
                                {previewRes ? 'Hide Output' : 'Run Example'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyToEditor(exKey, ex.sql)}
                                className="flex items-center gap-1 rounded-[4px] border border-[#25252e] bg-[#141418] px-2 py-1 text-[11px] font-medium text-[#a1a1aa] transition-colors hover:border-[#343440] hover:text-[#ececef]"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-400" />
                                    <span className="text-emerald-400">Loaded</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Try in Editor</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <HighlightedSqlBlock sql={ex.sql} />

                          {previewRes && (
                            <div className="border-t border-[#1e1e26]">
                              <div className="flex items-center justify-between bg-[#111115] px-3.5 py-1 text-[11px] text-emerald-400 border-b border-[#1c1c23]">
                                <span>Live output · {previewRes.rowCount} rows</span>
                                <span className="font-mono tabular-nums text-[#71717a]">
                                  {previewRes.executionTimeMs} ms
                                </span>
                              </div>
                              <DataTable result={previewRes} compact maxHeightClass="max-h-52" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
