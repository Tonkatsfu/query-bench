import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Columns2,
  RotateCcw,
  X,
} from 'lucide-react';
import type { GradeResult, QueryResult } from '../types/sql';
import { formatCellValue } from '../utils/grader';
import { DataTable } from './DataTable';

export type ConsoleTab = 'results' | 'expected' | 'feedback';

interface OutputConsoleProps {
  activeTab: ConsoleTab;
  onChangeTab: (tab: ConsoleTab) => void;
  queryResult: QueryResult | null;
  expectedResult: QueryResult | null;
  sqlError: string | null;
  gradeResult: GradeResult | null;
  onResetDatabase: () => void;
}

export function OutputConsole({
  activeTab,
  onChangeTab,
  queryResult,
  expectedResult,
  sqlError,
  gradeResult,
  onResetDatabase,
}: OutputConsoleProps) {
  const [sideBySide, setSideBySide] = useState(false);

  const mismatchMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (gradeResult && !gradeResult.passed) {
      for (const m of gradeResult.mismatches) {
        map.set(`${m.rowIndex}:${m.colIndex}`, true);
      }
    }
    return map;
  }, [gradeResult]);

  const hasErrorOrGrade = Boolean(sqlError || gradeResult);

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-[#22222a] bg-[#0e0e11]">
      {/* Console Underline Tab Bar */}
      <div className="flex h-10 shrink-0 items-end justify-between gap-2 border-b border-[#202028] bg-[#111115] px-4">
        <div
          className="flex items-end gap-5 overflow-x-auto"
          role="tablist"
          aria-label="Output console tabs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'results'}
            onClick={() => onChangeTab('results')}
            className={`flex shrink-0 items-center gap-2 border-b-2 pb-2.5 pt-2 text-xs font-medium transition-colors ${
              activeTab === 'results'
                ? 'border-[#e2a03f] text-[#ececef]'
                : 'border-transparent text-[#71717a] hover:text-[#d4d4d8]'
            }`}
          >
            <span>Query Results</span>
            {queryResult && queryResult.statementType === 'query' && (
              <span className="font-mono text-[10.5px] tabular-nums text-[#71717a]">
                {queryResult.rowCount}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'expected'}
            onClick={() => onChangeTab('expected')}
            className={`flex shrink-0 items-center gap-2 border-b-2 pb-2.5 pt-2 text-xs font-medium transition-colors ${
              activeTab === 'expected'
                ? 'border-[#e2a03f] text-[#ececef]'
                : 'border-transparent text-[#71717a] hover:text-[#d4d4d8]'
            }`}
          >
            <span>Expected Output</span>
            {expectedResult && (
              <span className="font-mono text-[10.5px] tabular-nums text-[#71717a]">
                {expectedResult.rowCount}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'feedback'}
            onClick={() => onChangeTab('feedback')}
            className={`flex shrink-0 items-center gap-2 border-b-2 pb-2.5 pt-2 text-xs font-medium transition-colors ${
              activeTab === 'feedback'
                ? 'border-[#e2a03f] text-[#ececef]'
                : 'border-transparent text-[#71717a] hover:text-[#d4d4d8]'
            }`}
          >
            <span>Grading &amp; Errors</span>
            {sqlError && (
              <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                ERR
              </span>
            )}
            {!sqlError && gradeResult && (
              <span
                className={`inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold ${
                  gradeResult.passed ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    gradeResult.passed ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                {gradeResult.passed ? 'PASS' : 'FAIL'}
              </span>
            )}
          </button>
        </div>

        {/* Right Telemetry / Side-by-Side Toggle */}
        <div className="flex shrink-0 items-center gap-3 pb-2">
          {activeTab === 'expected' && queryResult && queryResult.statementType === 'query' && (
            <button
              type="button"
              onClick={() => setSideBySide((s) => !s)}
              className={`hidden md:flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                sideBySide
                  ? 'border-[#e2a03f]/40 bg-[#e2a03f]/10 text-[#e2a03f]'
                  : 'border-[#25252e] bg-[#141418] text-[#a1a1aa] hover:border-[#343440] hover:text-[#ececef]'
              }`}
              title="Toggle side-by-side comparison with your last query result"
            >
              <Columns2 className="h-3 w-3" />
              <span>Side-by-Side</span>
            </button>
          )}

          {activeTab === 'results' && queryResult && (
            <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-[#71717a]">
              <span>{queryResult.executionTimeMs} ms</span>
              <span>·</span>
              <span>
                {queryResult.statementType === 'mutation'
                  ? `${queryResult.rowsModified ?? 0} modified`
                  : `${queryResult.rowCount} row${queryResult.rowCount === 1 ? '' : 's'}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Console Body */}
      <div className="min-h-0 flex-1 overflow-hidden bg-[#0b0b0e]">
        {/* TAB 1: QUERY RESULTS */}
        {activeTab === 'results' && (
          <div className="h-full">
            {!queryResult && !sqlError && (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <p className="text-xs font-medium text-[#a1a1aa]">
                  No query executed yet
                </p>
                <p className="mt-1 text-xs text-[#63636e]">
                  Press <kbd className="font-mono text-[#a1a1aa]">Ctrl+Enter</kbd> or click{' '}
                  <span className="text-[#ececef]">Run Query</span> to inspect table rows, or{' '}
                  <span className="text-emerald-400">Submit Answer</span> to grade your query.
                </p>
              </div>
            )}

            {!queryResult && sqlError && (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <p className="text-xs font-medium text-rose-400">
                  Query failed with a SQLite error
                </p>
                <button
                  type="button"
                  onClick={() => onChangeTab('feedback')}
                  className="mt-2.5 rounded-[4px] border border-[#2c2c37] bg-[#15151a] px-3 py-1 text-xs text-[#ececef] hover:bg-[#1c1c23]"
                >
                  Inspect Error
                </button>
              </div>
            )}

            {queryResult && queryResult.statementType === 'mutation' && (
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 border-b border-[#202028] pb-4">
                  <div>
                    <p className="text-xs font-semibold text-amber-300">
                      DDL/DML Statement Executed ({queryResult.executionTimeMs} ms)
                    </p>
                    <p className="mt-1 text-xs text-[#a1a1aa]">
                      Modified{' '}
                      <span className="font-mono font-medium text-[#ececef]">
                        {queryResult.rowsModified ?? 0}
                      </span>{' '}
                      row(s). Your in-memory database state has changed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onResetDatabase}
                    className="flex shrink-0 items-center gap-1.5 rounded-[4px] border border-[#2c2c37] bg-[#15151a] px-2.5 py-1 text-xs font-medium text-[#ececef] hover:bg-[#1d1d25]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset DB
                  </button>
                </div>
              </div>
            )}

            {queryResult && queryResult.statementType === 'query' && (
              <DataTable result={queryResult} highlightMismatchMap={mismatchMap} />
            )}
          </div>
        )}

        {/* TAB 2: EXPECTED OUTPUT */}
        {activeTab === 'expected' && (
          <div className="h-full">
            {!expectedResult ? (
              <div className="flex h-full items-center justify-center text-xs text-[#63636e]">
                Computing reference output…
              </div>
            ) : sideBySide && queryResult && queryResult.statementType === 'query' ? (
              <div className="grid h-full grid-cols-2 divide-x divide-[#202028]">
                <div className="flex min-h-0 flex-col">
                  <div className="flex items-center justify-between border-b border-[#1c1c23] bg-[#121216] px-3 py-1.5 text-[11px] font-medium text-[#e2a03f]">
                    <span>Your Output</span>
                    <span className="font-mono tabular-nums text-[#71717a]">
                      {queryResult.rowCount} rows
                    </span>
                  </div>
                  <div className="min-h-0 flex-1">
                    <DataTable result={queryResult} compact highlightMismatchMap={mismatchMap} />
                  </div>
                </div>
                <div className="flex min-h-0 flex-col">
                  <div className="flex items-center justify-between border-b border-[#1c1c23] bg-[#121216] px-3 py-1.5 text-[11px] font-medium text-emerald-400">
                    <span>Expected Output</span>
                    <span className="font-mono tabular-nums text-[#71717a]">
                      {expectedResult.rowCount} rows
                    </span>
                  </div>
                  <div className="min-h-0 flex-1">
                    <DataTable result={expectedResult} compact />
                  </div>
                </div>
              </div>
            ) : (
              <DataTable result={expectedResult} />
            )}
          </div>
        )}

        {/* TAB 3: ERROR / GRADING FEEDBACK */}
        {activeTab === 'feedback' && (
          <div className="h-full overflow-y-auto divide-y divide-[#1d1d24]">
            {!hasErrorOrGrade && (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <p className="text-xs font-medium text-[#a1a1aa]">
                  No submission graded yet
                </p>
                <p className="mt-1 text-xs text-[#63636e]">
                  Click <span className="text-emerald-400 font-medium">Submit Answer</span> to test
                  your query against the reference result set.
                </p>
              </div>
            )}

            {/* SQLite Execution Error */}
            {sqlError && (
              <div role="alert" className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>SQLite Execution Error</span>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-[5px] border border-rose-500/25 bg-[#09090b] p-3.5 font-mono text-xs text-rose-200">
                  {sqlError}
                </pre>
                <p className="text-xs text-[#a1a1aa]">
                  Tip: Verify table/column names in the <span className="text-[#ececef]">Schema</span> tab, and remember SQLite uses{' '}
                  <code className="font-mono text-[#e6c484]">strftime(&apos;%Y-%m&apos;, order_date)</code>{' '}
                  instead of <code className="font-mono text-[#e6c484]">DATE_TRUNC</code>.
                </p>
              </div>
            )}

            {/* Automated Grading Result */}
            {!sqlError && gradeResult && (
              <>
                <div role="status" className="px-5 py-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                          gradeResult.passed
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {gradeResult.passed ? (
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        ) : (
                          <X className="h-3 w-3" strokeWidth={2.5} />
                        )}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          gradeResult.passed ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {gradeResult.passed ? 'Accepted' : 'Wrong Answer'}
                      </span>
                      <span className="text-xs text-[#d4d4d8]">{gradeResult.summary}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums text-[#71717a]">
                      <span>
                        Rows {gradeResult.actualRowCount}/{gradeResult.expectedRowCount}
                      </span>
                      <span>
                        Cols {gradeResult.actualColCount}/{gradeResult.expectedColCount}
                      </span>
                      <span>{gradeResult.executionTimeMs} ms</span>
                    </div>
                  </div>

                  {gradeResult.details.length > 0 && (
                    <ul className="space-y-1.5 text-xs text-[#b4b4bd]">
                      {gradeResult.details.map((msg, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span
                            className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
                              gradeResult.passed ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          <span>{msg}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {!gradeResult.passed && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onChangeTab('results')}
                        className="rounded-[4px] border border-[#272730] bg-[#141418] px-2.5 py-1 text-[11px] font-medium text-[#d4d4d8] hover:border-[#363642] hover:text-white"
                      >
                        Inspect Your Results
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSideBySide(true);
                          onChangeTab('expected');
                        }}
                        className="rounded-[4px] border border-[#272730] bg-[#141418] px-2.5 py-1 text-[11px] font-medium text-[#e2a03f] hover:border-[#363642]"
                      >
                        Compare Side-by-Side
                      </button>
                    </div>
                  )}
                </div>

                {/* Cell Mismatches */}
                {gradeResult.mismatches.length > 0 && (
                  <div className="px-5 py-4">
                    <div className="mb-2 text-xs font-medium text-[#d4d4d8]">
                      First {gradeResult.mismatches.length} Cell Mismatch
                      {gradeResult.mismatches.length === 1 ? '' : 'es'}
                    </div>
                    <div className="overflow-hidden rounded-[5px] border border-[#202028] bg-[#09090b]">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="border-b border-[#202028] bg-[#121216] text-[11px] text-[#71717a]">
                          <tr>
                            <th className="px-3 py-1.5 font-medium">Row</th>
                            <th className="px-3 py-1.5 font-medium">Column</th>
                            <th className="px-3 py-1.5 font-medium text-emerald-400">Expected</th>
                            <th className="px-3 py-1.5 font-medium text-rose-400">Actual</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#17171d]">
                          {gradeResult.mismatches.map((m, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-1.5 text-[#71717a]">#{m.rowIndex + 1}</td>
                              <td className="px-3 py-1.5 text-[#ececef]">{m.columnName}</td>
                              <td className="px-3 py-1.5 text-emerald-300">
                                {formatCellValue(m.expected)}
                              </td>
                              <td className="px-3 py-1.5 text-rose-300">
                                {formatCellValue(m.actual)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tips */}
                {gradeResult.tips.length > 0 && (
                  <div className="px-5 py-3.5 text-xs text-[#a1a1aa]">
                    {gradeResult.tips.map((tip, idx) => (
                      <p key={idx}>{tip}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
