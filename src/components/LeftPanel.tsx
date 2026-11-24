import { useState } from 'react';
import type { Problem, QueryResult } from '../types/sql';
import { ProblemView } from './ProblemView';
import { SchemaExplorer } from './SchemaExplorer';
import { SqlRefresher } from './SqlRefresher';

export type LeftTab = 'problem' | 'refresher' | 'schema';

interface LeftPanelProps {
  activeTab: LeftTab;
  onChangeTab: (tab: LeftTab) => void;
  problem: Problem;
  isSolved: boolean;
  expectedResult: QueryResult | null;
  rowCounts: Record<string, number | null>;
  onPreviewTable: (tableName: string) => QueryResult | null;
  onRunPreviewInConsole: (tableName: string) => void;
  onRunExampleSql: (sql: string) => QueryResult | null;
  onLoadSqlIntoEditor: (sql: string) => void;
}

const TABS: { id: LeftTab; label: string }[] = [
  { id: 'problem', label: 'Description' },
  { id: 'refresher', label: 'SQL Refresher' },
  { id: 'schema', label: 'Schema' },
];

export function LeftPanel({
  activeTab,
  onChangeTab,
  problem,
  isSolved,
  expectedResult,
  rowCounts,
  onPreviewTable,
  onRunPreviewInConsole,
  onRunExampleSql,
  onLoadSqlIntoEditor,
}: LeftPanelProps) {
  const [focusedTopicId, setFocusedTopicId] = useState<string | null>(null);

  const handleOpenRefresherTopic = (topicId?: string) => {
    setFocusedTopicId(topicId ?? null);
    onChangeTab('refresher');
  };

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#0e0e11] border-b lg:border-b-0 lg:border-r border-[#22222a]">
      {/* Underline Tab Bar */}
      <div className="flex h-10 shrink-0 items-end gap-5 border-b border-[#202028] bg-[#111115] px-4">
        <div
          className="flex items-end gap-5"
          role="tablist"
          aria-label="Problem, SQL refresher, and schema tabs"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChangeTab(tab.id)}
                className={`border-b-2 pb-2.5 pt-2 text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'border-[#e2a03f] text-[#ececef]'
                    : 'border-transparent text-[#71717a] hover:text-[#d4d4d8]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === 'problem' && (
          <ProblemView
            key={problem.id}
            problem={problem}
            isSolved={isSolved}
            expectedResult={expectedResult}
            onLoadSqlIntoEditor={onLoadSqlIntoEditor}
            onOpenRefresherTopic={handleOpenRefresherTopic}
          />
        )}

        {activeTab === 'refresher' && (
          <SqlRefresher
            key={problem.id}
            currentProblem={problem}
            focusedTopicId={focusedTopicId}
            onRunExampleSql={onRunExampleSql}
            onLoadSqlIntoEditor={onLoadSqlIntoEditor}
          />
        )}

        {activeTab === 'schema' && (
          <SchemaExplorer
            rowCounts={rowCounts}
            onPreviewTable={onPreviewTable}
            onRunPreviewInConsole={onRunPreviewInConsole}
          />
        )}
      </div>
    </section>
  );
}
