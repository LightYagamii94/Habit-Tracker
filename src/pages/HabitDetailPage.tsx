import { useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { DateKey } from '../types';
import { monthStartKey, relativeDayLabel } from '../lib/dates';
import { hasLimit, scheduleLabel } from '../lib/habits';
import { habitStats, streakLabel } from '../lib/stats';
import { setEntry } from '../data/repo';
import { vibrate } from '../lib/presets';
import { useToday } from '../lib/useToday';
import { MonthCalendar } from '../components/MonthCalendar';
import { QuantityDialog } from '../components/QuantityDialog';
import { IconChevronLeft, IconPencil } from '../components/icons';

const TYPE_LABEL = { boolean: 'Sì/No', quantity: 'Quantità', negative: 'Da evitare' } as const;

export function HabitDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const today = useToday();

  // undefined while loading, null when missing
  const habit = useLiveQuery(async () => (await db.habits.get(id)) ?? null, [id]);
  const entries = useLiveQuery(() => db.entries.where('habitId').equals(id).toArray(), [id]);

  const [month, setMonth] = useState(() => monthStartKey(today));
  const [editingDay, setEditingDay] = useState<DateKey | null>(null);

  const values = useMemo(() => new Map((entries ?? []).map((e) => [e.date, e.value])), [entries]);
  const stats = useMemo(() => (habit && entries ? habitStats(habit, entries, today) : null), [habit, entries, today]);

  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/abitudini', { replace: true }));

  if (habit === undefined || !stats) return null;
  if (habit === null) {
    return (
      <div className="pt-10 text-center text-zinc-400">
        Abitudine non trovata.
        <button onClick={() => navigate('/abitudini')} className="mt-4 block w-full text-emerald-400">
          Torna alle abitudini
        </button>
      </div>
    );
  }

  const onDayClick = (d: DateKey) => {
    const value = values.get(d) ?? 0;
    if (habit.type === 'quantity' || hasLimit(habit)) return setEditingDay(d);
    vibrate();
    void setEntry(habit.id, d, value > 0 ? 0 : 1);
  };

  const isNegative = habit.type === 'negative';
  const limited = hasLimit(habit);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between pt-2">
        <button
          onClick={goBack}
          className="grid size-10 place-items-center rounded-full bg-zinc-900 ring-1 ring-white/5"
          aria-label="Indietro"
        >
          <IconChevronLeft />
        </button>
        <Link
          to={`/abitudini/${habit.id}/modifica`}
          className="flex h-10 items-center gap-1.5 rounded-full bg-zinc-900 px-4 text-sm font-medium ring-1 ring-white/5"
        >
          <IconPencil className="size-4" />
          Modifica
        </Link>
      </header>

      <div className="flex items-center gap-4">
        <span
          className="grid size-16 shrink-0 place-items-center rounded-3xl text-4xl"
          style={{ backgroundColor: `${habit.color}22`, boxShadow: `inset 0 0 0 1px ${habit.color}55` }}
        >
          {habit.icon}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{habit.name}</h1>
          <p className="truncate text-sm text-zinc-500">
            {TYPE_LABEL[habit.type]} · {scheduleLabel(habit.schedule)}
            {habit.type === 'quantity' && ` · ${habit.target} ${habit.unit ?? ''}`}
            {limited && ` · max ${habit.limit} ${habit.unit ?? ''} al giorno`}
          </p>
        </div>
      </div>

      {habit.archivedAt && (
        <p className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-zinc-400 ring-1 ring-white/5">
          Archiviata il {relativeDayLabel(habit.archivedAt, today).toLowerCase()}. Puoi ripristinarla da Modifica.
        </p>
      )}

      <section className="grid grid-cols-2 gap-2.5">
        <StatCard
          icon="🔥"
          label={isNegative ? (limited ? 'Entro il limite' : 'Senza ricadute') : 'Serie attuale'}
          value={stats.current}
          unit={streakLabel(stats.current, stats.period).replace(/^\d+ /, '')}
          color={habit.color}
          highlight
        />
        <StatCard
          icon="🏆"
          label="Record"
          value={stats.best}
          unit={streakLabel(stats.best, stats.period).replace(/^\d+ /, '')}
        />
        <StatCard
          icon="✅"
          label={stats.period === 'week' ? 'Settimane riuscite' : 'Completamento'}
          value={stats.rate === null ? '–' : Math.round(stats.rate * 100)}
          unit={stats.rate === null ? '' : '%'}
        />
        {isNegative ? (
          <StatCard
            icon="⚠️"
            label={limited ? 'Sforamenti' : 'Ricadute'}
            value={stats.relapses}
            unit={limited ? (stats.relapses === 1 ? 'giorno' : 'giorni') : stats.relapses === 1 ? 'volta' : 'volte'}
          />
        ) : (
          <StatCard icon="📅" label="Totale" value={stats.doneCount} unit={stats.doneCount === 1 ? 'giorno' : 'giorni'} />
        )}
      </section>

      <section className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-white/5">
        <MonthCalendar
          habit={habit}
          values={values}
          month={month}
          today={today}
          onMonthChange={setMonth}
          onDayClick={onDayClick}
        />
        <p className="mt-4 text-center text-xs text-zinc-500">
          {isNegative
            ? limited
              ? 'Tocca un giorno per modificare quante volte è successo.'
              : 'Tocca un giorno per segnare o togliere una ricaduta.'
            : habit.type === 'quantity'
              ? 'Tocca un giorno per modificarne il valore.'
              : 'Tocca un giorno per segnarlo come fatto o no.'}
        </p>
      </section>

      {editingDay && (
        <QuantityDialog
          habit={habit}
          title={relativeDayLabel(editingDay, today)}
          initial={values.get(editingDay) ?? 0}
          onClose={() => setEditingDay(null)}
          onSave={(v) => {
            void setEntry(habit.id, editingDay, v);
            setEditingDay(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  color,
  highlight,
}: {
  icon: string;
  label: string;
  value: ReactNode;
  unit: string;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-white/5"
      style={highlight && color ? { background: `linear-gradient(135deg, ${color}26, #18181b 70%)` } : undefined}
    >
      <p className="text-sm text-zinc-400">
        <span className="mr-1.5">{icon}</span>
        {label}
      </p>
      <p className="mt-2">
        <span className="text-3xl font-bold tabular-nums">{value}</span>
        {unit && <span className="ml-1 text-sm text-zinc-500">{unit}</span>}
      </p>
    </div>
  );
}
