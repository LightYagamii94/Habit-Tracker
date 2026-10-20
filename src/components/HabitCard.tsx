import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { DateKey } from '../types';
import type { DayItem } from '../lib/habits';
import { hasLimit, scheduleLabel } from '../lib/habits';
import { setEntry } from '../data/repo';
import type { ReminderState } from '../lib/reminders';
import { vibrate } from '../lib/presets';
import { IconCheck, IconMinus, IconPlus, IconX } from './icons';

interface Props {
  item: DayItem;
  date: DateKey;
  /** Current streak, shown as a badge when above zero. */
  streak?: { value: number; period: 'day' | 'week' };
  /** Reminder for today, if the habit has a time set. */
  reminder?: ReminderState;
}

const formatNumber = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 2 });

export function HabitCard({ item, date, streak, reminder }: Props) {
  const { habit, value, done, weekCount } = item;
  const save = (v: number) => {
    vibrate();
    void setEntry(habit.id, date, Math.max(0, v));
  };

  let subtitle: string;
  switch (habit.type) {
    case 'quantity':
      subtitle = `${formatNumber(value)} / ${formatNumber(habit.target ?? 1)} ${habit.unit ?? ''}`.trim();
      break;
    case 'negative':
      if (hasLimit(habit)) {
        subtitle = done
          ? `${formatNumber(value)} / max ${habit.limit} ${habit.unit ?? ''}`.trim()
          : 'Oltre il limite';
      } else {
        subtitle = value > 0 ? 'Ricaduta registrata' : 'Nessuna ricaduta';
      }
      break;
    default:
      subtitle =
        habit.schedule.kind === 'timesPerWeek' && weekCount !== null
          ? `${weekCount}/${habit.schedule.times} questa settimana${item.due && !done ? ' · serve oggi' : ''}`
          : scheduleLabel(habit.schedule);
  }
  if (habit.type === 'quantity' && habit.schedule.kind === 'timesPerWeek' && weekCount !== null) {
    subtitle += ` · ${weekCount}/${habit.schedule.times} sett.`;
  }

  const limited = hasLimit(habit);
  const progress =
    habit.type === 'quantity' ? Math.min(1, value / (habit.target ?? 1)) : limited ? Math.min(1, value / habit.limit!) : 0;
  const barColor = limited && !done ? '#f43f5e' : habit.color;

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-zinc-900 transition-shadow"
      style={{ boxShadow: `inset 0 0 0 1px ${done ? `${habit.color}66` : 'rgb(255 255 255 / 0.05)'}` }}
    >
      <div className="flex items-center gap-3 p-3">
        <Link to={`/abitudini/${habit.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl"
            style={{ backgroundColor: `${habit.color}22` }}
          >
            {habit.icon}
          </span>
          <span className="min-w-0">
            <span className={`block truncate font-semibold ${done && habit.type === 'boolean' ? 'text-zinc-400' : ''}`}>
              {habit.name}
            </span>
            <span className="flex items-center gap-1.5">
              {streak && streak.value > 0 && (
                <span
                  className="shrink-0 rounded-full bg-orange-400/10 px-1.5 text-xs font-semibold tabular-nums text-orange-300"
                  aria-label={`Serie di ${streak.value} ${streak.period === 'week' ? 'settimane' : 'giorni'}`}
                >
                  🔥 {streak.value}
                  {streak.period === 'week' ? ' sett.' : ''}
                </span>
              )}
              {reminder && (
                <span
                  className={`shrink-0 rounded-full px-1.5 text-xs font-semibold tabular-nums ${
                    reminder === 'overdue' ? 'bg-amber-400/15 text-amber-300' : 'bg-zinc-800 text-zinc-400'
                  }`}
                  aria-label={reminder === 'overdue' ? `In ritardo, promemoria alle ${habit.reminderTime}` : `Promemoria alle ${habit.reminderTime}`}
                >
                  ⏰ {habit.reminderTime}
                </span>
              )}
              <span
                className={`truncate text-sm ${habit.type === 'negative' && !done ? 'text-rose-400' : 'text-zinc-500'}`}
              >
                {subtitle}
              </span>
            </span>
          </span>
        </Link>

        {habit.type === 'boolean' && (
          <button
            onClick={() => save(done ? 0 : 1)}
            aria-label={done ? 'Segna come non fatta' : 'Segna come fatta'}
            aria-pressed={done}
            className="grid size-12 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-90"
            style={
              done
                ? { backgroundColor: habit.color, borderColor: habit.color, color: '#09090b' }
                : { borderColor: '#3f3f46', color: 'transparent' }
            }
          >
            <IconCheck className="size-6" />
          </button>
        )}

        {(habit.type === 'quantity' || limited) && (
          <QuantityControl
            value={value}
            color={barColor}
            done={habit.type === 'quantity' && done}
            onChange={save}
          />
        )}

        {habit.type === 'negative' && !limited && (
          <button
            onClick={() => save(value > 0 ? 0 : 1)}
            aria-pressed={value > 0}
            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-all active:scale-95 ${
              value > 0 ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {value > 0 && <IconX className="size-4" />}
            Ricaduta
          </button>
        )}
      </div>

      {(habit.type === 'quantity' || limited) && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-zinc-800/60">
          <div
            className="h-full transition-[width] duration-300"
            style={{ width: `${progress * 100}%`, backgroundColor: barColor }}
          />
        </div>
      )}
    </div>
  );
}

function QuantityControl({
  value,
  color,
  done,
  onChange,
}: {
  value: number;
  color: string;
  done: boolean;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);

  const commit = (raw: string) => {
    setEditing(false);
    const n = Number(raw.replace(',', '.'));
    if (Number.isFinite(n) && n >= 0 && n !== value) onChange(n);
  };

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        aria-label="Diminuisci"
        className="grid size-10 place-items-center rounded-full bg-zinc-800 text-zinc-300 transition-transform active:scale-90 disabled:opacity-30"
      >
        <IconMinus />
      </button>
      {editing ? (
        <input
          autoFocus
          inputMode="decimal"
          defaultValue={value || ''}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="h-10 w-12 rounded-xl bg-zinc-800 text-center font-semibold outline-none"
          style={{ boxShadow: `inset 0 0 0 2px ${color}` }}
          aria-label="Valore"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="h-10 min-w-12 rounded-xl px-1 text-center text-lg font-semibold tabular-nums"
          style={done ? { color } : undefined}
          aria-label="Inserisci valore"
        >
          {value.toLocaleString('it-IT', { maximumFractionDigits: 2 })}
        </button>
      )}
      <button
        onClick={() => onChange(value + 1)}
        aria-label="Aumenta"
        className="grid size-10 place-items-center rounded-full transition-transform active:scale-90"
        style={{ backgroundColor: color, color: '#09090b' }}
      >
        <IconPlus />
      </button>
    </div>
  );
}
