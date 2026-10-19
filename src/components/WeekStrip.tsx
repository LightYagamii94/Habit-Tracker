import type { DateKey } from '../types';
import { addDaysKey, dayOfMonth, weekKeys, weekStartKey, WEEKDAY_LETTERS } from '../lib/dates';
import { IconChevronLeft, IconChevronRight } from './icons';
import { ProgressRing } from './ProgressRing';

interface Props {
  selected: DateKey;
  today: DateKey;
  /** Progress 0–1 per day, or null when nothing was due. */
  progress: Record<DateKey, number | null>;
  onSelect: (d: DateKey) => void;
}

export function WeekStrip({ selected, today, progress, onSelect }: Props) {
  const days = weekKeys(selected);
  const canGoNext = weekStartKey(selected) < weekStartKey(today);
  const next = addDaysKey(selected, 7);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onSelect(addDaysKey(selected, -7))}
        className="grid size-9 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-zinc-800"
        aria-label="Settimana precedente"
      >
        <IconChevronLeft />
      </button>
      <div className="grid flex-1 grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          const isSelected = d === selected;
          const p = progress[d];
          return (
            <button
              key={d}
              disabled={d > today}
              onClick={() => onSelect(d)}
              aria-label={d}
              aria-current={isSelected ? 'date' : undefined}
              className={`flex flex-col items-center gap-1 rounded-2xl py-2 transition-colors disabled:opacity-30 ${
                isSelected ? 'bg-zinc-800' : 'hover:bg-zinc-900'
              }`}
            >
              <span className={`text-[11px] font-medium ${d === today ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {WEEKDAY_LETTERS[i]}
              </span>
              <ProgressRing value={p ?? 0} size={34} stroke={3}>
                <span className={`text-xs font-semibold ${p === 1 ? 'text-emerald-300' : ''}`}>{dayOfMonth(d)}</span>
              </ProgressRing>
            </button>
          );
        })}
      </div>
      <button
        disabled={!canGoNext}
        onClick={() => onSelect(next > today ? today : next)}
        className="grid size-9 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
        aria-label="Settimana successiva"
      >
        <IconChevronRight />
      </button>
    </div>
  );
}
