import type { Difficulty } from '../types/sql';

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  compact?: boolean;
}

const STYLES: Record<Difficulty, { dot: string; text: string }> = {
  Easy: { dot: 'bg-emerald-400', text: 'text-emerald-400' },
  Medium: { dot: 'bg-amber-400', text: 'text-amber-400' },
  Hard: { dot: 'bg-rose-400', text: 'text-rose-400' },
};

export function DifficultyBadge({ difficulty, compact = false }: DifficultyBadgeProps) {
  const s = STYLES[difficulty];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium tracking-tight ${
        compact ? 'text-[11px]' : 'text-xs'
      } ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      <span>{difficulty}</span>
    </span>
  );
}
