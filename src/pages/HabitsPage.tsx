import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Habit } from '../types';
import { scheduleLabel } from '../lib/habits';
import { moveHabit } from '../data/repo';
import { IconChevronDown, IconChevronRight, IconChevronUp, IconPlus } from '../components/icons';

const TYPE_LABEL: Record<Habit['type'], string> = {
  boolean: 'Sì/No',
  quantity: 'Quantità',
  negative: 'Da evitare',
};

export function HabitsPage() {
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray(), []);
  if (!habits) return null;

  const active = habits.filter((h) => h.archivedAt === null);
  const archived = habits.filter((h) => h.archivedAt !== null);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-3xl font-bold tracking-tight">Abitudini</h1>
        <Link
          to="/abitudini/nuova"
          className="flex h-10 items-center gap-1.5 rounded-full bg-emerald-400 pl-3 pr-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"
        >
          <IconPlus />
          Nuova
        </Link>
      </header>

      {active.length === 0 ? (
        <p className="rounded-3xl bg-zinc-900 p-6 text-center text-sm text-zinc-400 ring-1 ring-white/5">
          Nessuna abitudine attiva. Tocca <span className="font-semibold text-zinc-200">Nuova</span> per crearne una.
        </p>
      ) : (
        <ul className="space-y-2">
          {active.map((h, i) => (
            <li key={h.id} className="flex items-center gap-2 rounded-3xl bg-zinc-900 p-2 pr-3 ring-1 ring-white/5">
              <div className="flex flex-col">
                <button
                  onClick={() => moveHabit(active, h.id, -1)}
                  disabled={i === 0}
                  aria-label={`Sposta su ${h.name}`}
                  className="grid size-7 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-800 disabled:opacity-20"
                >
                  <IconChevronUp className="size-4" />
                </button>
                <button
                  onClick={() => moveHabit(active, h.id, 1)}
                  disabled={i === active.length - 1}
                  aria-label={`Sposta giù ${h.name}`}
                  className="grid size-7 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-800 disabled:opacity-20"
                >
                  <IconChevronDown className="size-4" />
                </button>
              </div>
              <HabitLink habit={h} />
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-medium text-zinc-500">Archiviate</h2>
          <ul className="space-y-2 opacity-60">
            {archived.map((h) => (
              <li key={h.id} className="rounded-3xl bg-zinc-900 p-2 pr-3 ring-1 ring-white/5">
                <HabitLink habit={h} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function HabitLink({ habit }: { habit: Habit }) {
  return (
    <Link to={`/abitudini/${habit.id}`} className="flex min-w-0 flex-1 items-center gap-3">
      <span
        className="grid size-11 shrink-0 place-items-center rounded-2xl text-xl"
        style={{ backgroundColor: `${habit.color}22` }}
      >
        {habit.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{habit.name}</span>
        <span className="block truncate text-sm text-zinc-500">
          {TYPE_LABEL[habit.type]} · {scheduleLabel(habit.schedule)}
        </span>
      </span>
      <IconChevronRight className="size-5 shrink-0 text-zinc-600" />
    </Link>
  );
}
