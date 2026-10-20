import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { DateKey } from '../types';
import { addDaysKey, DATE_KEY_RE, formatLongWithYear, relativeDayLabel, weekKeys, weekStartKey } from '../lib/dates';
import { buildDayItems, dayProgress } from '../lib/habits';
import { habitStats } from '../lib/stats';
import { useToday } from '../lib/useToday';
import { HabitCard } from '../components/HabitCard';
import { InstallBanner } from '../components/InstallBanner';
import { DayNoteCard } from '../components/DayNoteCard';
import { ProgressRing } from '../components/ProgressRing';
import { WeekStrip } from '../components/WeekStrip';
import { IconCalendar, IconChevronDown, IconPlus } from '../components/icons';

export function TodayPage() {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const param = params.get('d');
  const selected: DateKey = param && DATE_KEY_RE.test(param) && param <= today ? param : today;
  const select = (d: DateKey) => setParams(d === today ? {} : { d }, { replace: true });

  const weekStart = weekStartKey(selected);
  const weekEnd = addDaysKey(weekStart, 6);
  const habits = useLiveQuery(() => db.habits.toArray(), []);
  // All entries: the week drives the view, the full history drives the streaks.
  const entries = useLiveQuery(() => db.entries.toArray(), []);

  const [showOthers, setShowOthers] = useState(false);

  const view = useMemo(() => {
    if (!habits || !entries) return null;
    const weekEntries = entries.filter((e) => e.date >= weekStart && e.date <= weekEnd);
    const items = buildDayItems(habits, weekEntries, selected);
    const streaks = new Map(
      items.map(({ habit }) => {
        const s = habitStats(habit, entries, today);
        return [habit.id, { value: s.current, period: s.period }];
      }),
    );
    const weekProgress: Record<DateKey, number | null> = {};
    for (const d of weekKeys(selected)) {
      const p = dayProgress(buildDayItems(habits, weekEntries, d));
      weekProgress[d] = d <= today && p.due ? p.done / p.due : null;
    }
    return {
      // Weekly habits stay in the main list while they can still be done this week.
      due: items.filter((i) => i.due || i.optional),
      others: items.filter((i) => !i.due && !i.optional),
      streaks,
      progress: dayProgress(items),
      isEmptyDay: items.length === 0,
      weekProgress,
      hasHabits: habits.some((h) => h.archivedAt === null),
    };
  }, [habits, entries, selected, today, weekStart, weekEnd]);

  if (!view) return null;
  const { due, others, streaks, progress, isEmptyDay, weekProgress, hasHabits } = view;
  const remaining = progress.due - progress.done;
  const label = relativeDayLabel(selected, today);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight">{label}</h1>
          {(selected === today || selected === addDaysKey(today, -1)) && (
            <p className="text-sm text-zinc-500">{formatLongWithYear(selected)}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {selected !== today && (
            <button
              onClick={() => select(today)}
              className="h-9 rounded-full bg-emerald-400/15 px-3.5 text-sm font-medium text-emerald-300"
            >
              Oggi
            </button>
          )}
          <label
            className="relative grid size-9 cursor-pointer place-items-center rounded-full bg-zinc-900 text-zinc-300 ring-1 ring-white/5"
            aria-label="Scegli una data"
          >
            <IconCalendar />
            <input
              type="date"
              max={today}
              value={selected}
              onChange={(e) => e.target.value && select(e.target.value > today ? today : e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </header>

      <InstallBanner />

      <WeekStrip selected={selected} today={today} progress={weekProgress} onSelect={select} />

      {!hasHabits ? (
        <EmptyState />
      ) : isEmptyDay ? (
        <p className="rounded-3xl bg-zinc-900 p-6 text-center text-sm text-zinc-400 ring-1 ring-white/5">
          Nessuna abitudine attiva in questo giorno. Per registrare giorni passati, anticipa la{' '}
          <span className="font-semibold text-zinc-200">data di inizio</span> dell'abitudine.
        </p>
      ) : (
        <>
          <section className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-900/40 p-4 ring-1 ring-white/5">
            <ProgressRing value={progress.due ? progress.done / progress.due : 0} size={72} stroke={7}>
              <span className="text-lg font-bold tabular-nums">
                {progress.done}/{progress.due}
              </span>
            </ProgressRing>
            <div>
              <p className="font-semibold">
                {progress.due === 0
                  ? 'Niente in programma'
                  : remaining === 0
                    ? 'Giornata completata 🎉'
                    : remaining === 1
                      ? 'Ne manca una'
                      : `Ne mancano ${remaining}`}
              </p>
              <p className="text-sm text-zinc-500">
                {progress.due === 0
                  ? 'Goditi la giornata'
                  : remaining === 0
                    ? 'Ottimo lavoro, continua così'
                    : `${Math.round((progress.done / progress.due) * 100)}% completato`}
              </p>
            </div>
          </section>

          <section className="space-y-2.5">
            {due.map((item) => (
              <HabitCard key={item.habit.id} item={item} date={selected} streak={streaks.get(item.habit.id)} />
            ))}
          </section>

          {others.length > 0 && (
            <section className="space-y-2.5">
              <button
                onClick={() => setShowOthers((v) => !v)}
                className="flex w-full items-center justify-between px-1 text-sm font-medium text-zinc-500"
                aria-expanded={showOthers}
              >
                <span>Non in programma oggi ({others.length})</span>
                <IconChevronDown className={`size-4 transition-transform ${showOthers ? 'rotate-180' : ''}`} />
              </button>
              {showOthers && (
                <div className="space-y-2.5 opacity-70">
                  {others.map((item) => (
                    <HabitCard key={item.habit.id} item={item} date={selected} streak={streaks.get(item.habit.id)} />
                  ))}
                </div>
              )}
            </section>
          )}

          <DayNoteCard key={selected} date={selected} />
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-zinc-900 px-6 py-10 text-center ring-1 ring-white/5">
      <span className="text-5xl">🌱</span>
      <h2 className="mt-4 text-xl font-semibold">Inizia da un'abitudine</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Piccoli passi ogni giorno. Crea la tua prima abitudine e segna i progressi da qui.
      </p>
      <Link
        to="/abitudini/nuova"
        className="mt-6 flex h-12 items-center gap-2 rounded-2xl bg-emerald-400 px-5 font-semibold text-zinc-950 hover:bg-emerald-300"
      >
        <IconPlus />
        Nuova abitudine
      </Link>
    </div>
  );
}
