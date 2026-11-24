import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import type { Difficulty, Problem } from '../types/sql';

interface ProblemSidebarProps {
  isOpen: boolean;
  problems: Problem[];
  currentProblemId: string;
  solvedIds: Set<string>;
  onSelectProblem: (problemId: string) => void;
  onCloseMobile: () => void;
}

type FilterOption = 'All' | Difficulty;

const PAGE_SIZE = 120;

const DIFFICULTY_DOT: Record<Difficulty, string> = {
  Easy: 'bg-emerald-400',
  Medium: 'bg-amber-400',
  Hard: 'bg-rose-400',
};

function SidebarContent({
  problems,
  currentProblemId,
  solvedIds,
  onSelectProblem,
  onClose,
  showCloseButton,
  closeBtnRef,
}: {
  problems: Problem[];
  currentProblemId: string;
  solvedIds: Set<string>;
  onSelectProblem: (problemId: string) => void;
  onClose: () => void;
  showCloseButton: boolean;
  closeBtnRef?: React.RefObject<HTMLButtonElement>;
}) {
  const [filter, setFilter] = useState<FilterOption>('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const counts = useMemo(() => {
    let easy = 0;
    let med = 0;
    let hard = 0;
    for (const p of problems) {
      if (p.difficulty === 'Easy') easy++;
      else if (p.difficulty === 'Medium') med++;
      else hard++;
    }
    return { All: problems.length, Easy: easy, Medium: med, Hard: hard };
  }, [problems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const numericSearch = q.startsWith('#') ? q.slice(1) : q;
    const isNumQuery = /^\d+$/.test(numericSearch);

    return problems.filter((p) => {
      if (filter !== 'All' && p.difficulty !== filter) return false;
      if (!q) return true;
      if (isNumQuery && String(p.number).startsWith(numericSearch)) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.concepts.some((c) => c.toLowerCase().includes(q)) ||
        p.stakeholder.toLowerCase().includes(q)
      );
    });
  }, [problems, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const pageItems = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  // Keep page synced if filter/search changes
  const handleFilterChange = (next: FilterOption) => {
    setFilter(next);
    setPage(0);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  // Jump page to currently selected problem when clicking "Locate current"
  const locateCurrent = () => {
    setFilter('All');
    setSearch('');
    const idx = problems.findIndex((p) => p.id === currentProblemId);
    if (idx >= 0) {
      setPage(Math.floor(idx / PAGE_SIZE));
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#0b0b0e]">
      {/* Top Heading */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#202028] px-3">
        <span className="text-xs font-semibold tracking-tight text-[#ececef]">
          Curriculum
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={locateCurrent}
            className="font-mono text-[11px] tabular-nums text-[#71717a] hover:text-[#e2a03f]"
            title="Jump to active problem"
          >
            {solvedIds.size}/{problems.length}
          </button>
          {showCloseButton && (
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="rounded p-1 text-[#a1a1aa] hover:bg-[#1a1a20] hover:text-[#ececef]"
              aria-label="Close problem list"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Search + Flat Filter Tabs */}
      <div className="border-b border-[#202028] px-3 pt-2.5 pb-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#63636e]" />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search #number, title, or SQL…"
            aria-label="Search problems"
            className="w-full rounded-[5px] border border-[#24242c] bg-[#121216] py-1.5 pl-8 pr-2.5 text-xs text-[#ececef] placeholder-[#63636e] focus:border-[#3b3b47] focus:outline-none"
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
          {(['All', 'Easy', 'Medium', 'Hard'] as FilterOption[]).map((opt) => {
            const active = filter === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleFilterChange(opt)}
                className={`border-b-2 pb-2 font-medium transition-colors ${
                  active
                    ? 'border-[#e2a03f] text-[#ececef]'
                    : 'border-transparent text-[#71717a] hover:text-[#d4d4d8]'
                }`}
              >
                {opt}{' '}
                <span className="font-mono text-[10px] tabular-nums text-[#63636e]">
                  {counts[opt]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Problem Rows */}
      <nav
        aria-label="SQL problem curriculum"
        className="min-h-0 flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5"
      >
        {pageItems.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-[#63636e]">
            No problems match &ldquo;{search}&rdquo;.
          </div>
        ) : (
          pageItems.map((problem) => {
            const isSolved = solvedIds.has(problem.id);
            const isSelected = problem.id === currentProblemId;
            return (
              <button
                key={problem.id}
                type="button"
                onClick={() => {
                  onSelectProblem(problem.id);
                  onClose();
                }}
                className={`group flex w-full items-start gap-2.5 rounded-[5px] px-2.5 py-2 text-left transition-colors ${
                  isSelected
                    ? 'bg-[#1c1c23] text-[#ececef]'
                    : 'text-[#a1a1aa] hover:bg-[#141419] hover:text-[#ececef]'
                }`}
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  {isSolved ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
                  ) : (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSelected ? 'bg-[#e2a03f]' : DIFFICULTY_DOT[problem.difficulty]
                      } opacity-80`}
                    />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate text-[12.5px] leading-snug ${
                        isSelected ? 'font-medium text-[#ececef]' : 'font-normal'
                      }`}
                    >
                      <span className="mr-1.5 font-mono text-[11px] tabular-nums text-[#63636e]">
                        {String(problem.number).padStart(3, '0')}
                      </span>
                      {problem.title}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-[#63636e]">
                    <span>{problem.difficulty}</span>
                    <span>·</span>
                    <span className="truncate font-mono">{problem.concepts[0]}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </nav>

      {/* Pagination Footer */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex h-9 shrink-0 items-center justify-between border-t border-[#202028] bg-[#0e0e11] px-3 font-mono text-[11px] tabular-nums text-[#71717a]">
          <span>
            {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of{' '}
            {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              aria-label="Previous problem page"
              className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-[#24242c] bg-[#131317] text-[#a1a1aa] hover:bg-[#1b1b22] hover:text-[#ececef] disabled:opacity-35"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              aria-label="Next problem page"
              className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-[#24242c] bg-[#131317] text-[#a1a1aa] hover:bg-[#1b1b22] hover:text-[#ececef] disabled:opacity-35"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProblemDrawer({
  isOpen,
  problems,
  currentProblemId,
  solvedIds,
  onSelectProblem,
  onCloseMobile,
}: ProblemSidebarProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCloseMobile]);

  if (!isOpen) return null;

  return (
    <>
      {/* Desktop (>=1280px): Docked Persistent Curriculum Rail */}
      <aside className="hidden xl:block w-[264px] shrink-0 border-r border-[#22222a] h-full overflow-hidden">
        <SidebarContent
          problems={problems}
          currentProblemId={currentProblemId}
          solvedIds={solvedIds}
          onSelectProblem={onSelectProblem}
          onClose={() => {}}
          showCloseButton={false}
        />
      </aside>

      {/* Tablet / Mobile (<1280px): Slide-Over Drawer */}
      <div
        className="xl:hidden fixed inset-0 z-50 flex"
        role="dialog"
        aria-modal="true"
        aria-label="SQL Interview Problems"
      >
        <div
          className="fixed inset-0 bg-black/70"
          onClick={onCloseMobile}
        />
        <aside className="relative z-10 h-full w-full max-w-[300px] border-r border-[#24242c] shadow-2xl">
          <SidebarContent
            problems={problems}
            currentProblemId={currentProblemId}
            solvedIds={solvedIds}
            onSelectProblem={onSelectProblem}
            onClose={onCloseMobile}
            showCloseButton
            closeBtnRef={closeBtnRef}
          />
        </aside>
      </div>
    </>
  );
}
