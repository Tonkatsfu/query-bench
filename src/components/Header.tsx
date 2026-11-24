import { ChevronLeft, ChevronRight, PanelLeft, RotateCcw } from 'lucide-react';
import type { Problem } from '../types/sql';
import { DifficultyBadge } from './DifficultyBadge';

interface HeaderProps {
  currentProblem: Problem;
  totalProblems: number;
  solvedIds: Set<string>;
  dbReady: boolean;
  dbModified: boolean;
  resetFlash: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onPrevProblem: () => void;
  onNextProblem: () => void;
  onResetDatabase: () => void;
}

export function Header({
  currentProblem,
  totalProblems,
  solvedIds,
  dbReady,
  dbModified,
  resetFlash,
  sidebarOpen,
  onToggleSidebar,
  onPrevProblem,
  onNextProblem,
  onResetDatabase,
}: HeaderProps) {
  const progressPct = Math.round((solvedIds.size / totalProblems) * 100);

  return (
    <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-[#22222a] bg-[#0e0e11] px-3">
      {/* Left: Rail Toggle + Brand + Active Problem Stepper */}
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-pressed={sidebarOpen}
          aria-label="Toggle curriculum sidebar"
          title="Toggle problem list"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
            sidebarOpen
              ? 'border-[#32323d] bg-[#1c1c23] text-[#ececef]'
              : 'border-transparent text-[#a1a1aa] hover:bg-[#18181e] hover:text-[#ececef]'
          }`}
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {/* Custom Brand Mark */}
        <div className="flex shrink-0 items-center gap-2">
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="text-[#e2a03f]"
          >
            <rect
              x="2.5"
              y="3.5"
              width="15"
              height="13"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M2.5 8H17.5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M6.5 11.5L8.75 13.5L6.5 15.5"
              stroke="#ececef"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11 15H14"
              stroke="#ececef"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <span className="hidden sm:inline text-[13px] font-semibold tracking-tight text-[#ececef]">
            QueryBench
          </span>
        </div>

        <div className="h-4 w-px bg-[#24242c]" aria-hidden="true" />

        {/* Problem Stepper */}
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="flex items-center">
            <button
              type="button"
              onClick={onPrevProblem}
              disabled={currentProblem.number <= 1}
              className="flex h-6 w-6 items-center justify-center rounded-l-[4px] border border-[#24242c] bg-[#131317] text-[#a1a1aa] transition-colors hover:bg-[#1b1b22] hover:text-[#ececef] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Previous problem"
              title="Previous problem"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onNextProblem}
              disabled={currentProblem.number >= totalProblems}
              className="-ml-px flex h-6 w-6 items-center justify-center rounded-r-[4px] border border-[#24242c] bg-[#131317] text-[#a1a1aa] transition-colors hover:bg-[#1b1b22] hover:text-[#ececef] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Next problem"
              title="Next problem"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex min-w-0 items-center gap-2 rounded-[4px] px-1.5 py-1 text-left transition-colors hover:bg-[#17171d]"
            title="Switch problem"
          >
            <span className="font-mono text-[11.5px] tabular-nums text-[#63636e]">
              {currentProblem.number}/{totalProblems}
            </span>
            <span className="truncate text-xs font-medium text-[#ececef] max-w-[180px] sm:max-w-[300px]">
              {currentProblem.title}
            </span>
            <span className="hidden md:inline-flex shrink-0">
              <DifficultyBadge difficulty={currentProblem.difficulty} compact />
            </span>
          </button>
        </div>
      </div>

      {/* Right: Progress + Engine Status + Reset DB */}
      <div className="flex shrink-0 items-center gap-3">
        {/* Progress Meter */}
        <div
          className="hidden sm:flex items-center gap-2 text-[11.5px]"
          title={`${solvedIds.size} of ${totalProblems} interview problems solved`}
        >
          <div className="h-1 w-14 overflow-hidden rounded-full bg-[#202028]">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="font-mono tabular-nums text-[#a1a1aa]">
            {solvedIds.size}/{totalProblems}
          </span>
        </div>

        <div className="hidden h-4 w-px bg-[#24242c] sm:block" aria-hidden="true" />

        {/* DB Status */}
        <div
          className="hidden md:flex items-center gap-1.5 text-[11.5px]"
          title={
            dbModified
              ? 'Database has been altered by DDL/DML statements. Click Reset DB to restore.'
              : 'In-memory SQLite engine ready'
          }
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              !dbReady
                ? 'bg-amber-400 animate-pulse'
                : dbModified
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
            }`}
          />
          <span className={dbModified ? 'text-amber-300 font-medium' : 'text-[#a1a1aa]'}>
            {!dbReady ? 'Loading…' : dbModified ? 'Modified' : 'SQLite Ready'}
          </span>
        </div>

        {/* Reset Database Action */}
        <button
          type="button"
          onClick={onResetDatabase}
          disabled={!dbReady}
          className={`flex h-7 items-center gap-1.5 rounded-[5px] border px-2.5 text-[11.5px] font-medium transition-colors disabled:opacity-45 ${
            resetFlash
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
              : dbModified
                ? 'border-amber-500/45 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                : 'border-[#272730] bg-[#141418] text-[#d4d4d8] hover:border-[#363642] hover:bg-[#1b1b21] hover:text-white'
          }`}
          title="Restore all 9 tables and seed rows to their original state"
        >
          <RotateCcw className={`h-3 w-3 ${resetFlash ? 'animate-spin' : ''}`} />
          <span>{resetFlash ? 'Restored' : 'Reset DB'}</span>
        </button>
      </div>
    </header>
  );
}
