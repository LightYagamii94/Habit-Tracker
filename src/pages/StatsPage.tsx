import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { fromKey, relativeDayLabel, WEEKDAY_LETTERS, WEEKDAY_SHORT } from '../lib/dates';
import { computeInsights, MOODS, moodEmoji, RANGES, type RangeKey } from '../lib/insights';
import { streakLabel } from '../lib/stats';
import { useToday } from '../lib/useToday';
import { BarChart, MoodChart } from '../components/charts';
import { IconPlus } from '../components/icons';

const ACCENT = '#34d399'; // emerald-400
const MOOD_COLOR = '#a78bfa'; // violet-400
const RANGE_KEY = 'stats-range';

const pct = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)}%`);

const readRange = (): RangeKey => {
  try {
    const v = localStorage.getItem(RANGE_KEY);
    return RANGES.some((r) => r.key === v) ? (v as RangeKey) : '30d';
  } catch {
    return '30d';
  }
};

export function StatsPage() {
  const today = useToday();
  const [range, setRange] = useState<RangeKey>(readRange);
  const habits = useLiveQuery(() => db.habits.toArray(), []);
  const entries = useLiveQuery(() => db.entries.toArray(), []);
  const notes = useLiveQuery(() => db.notes.toArray(), []);

  const data = useMemo(
    () => (habits && entries && notes ? computeInsights(habits, entries, notes, range, today) : null),
    [habits, entries, notes, range, today],
  );

  const chooseRange = (r: RangeKey) => {
    setRange(r);
    try {
      localStorage.setItem(RANGE_KEY, r);
    } catch {
      // Not saved: the default comes back next time.
    }
  };

  if (!data || !habits) return null;

  const header = (
    <header className="pt-2">
      <h1 className="text-3xl font-bold tracking-tight">Statistiche</h1>
    </header>
  );

  if (!habits.some((h) => h.archivedAt === null)) {
    return (
      <div className="space-y-5">
        {header}
        <div className="flex flex-col items-center rounded-3xl bg-zinc-900 px-6 py-10 text-center ring-1 ring-white/5">
          <span className="text-5xl">📊</span>
          <h2 className="mt-4 text-xl font-semibold">Ancora niente da mostrare</h2>
          <p className="mt-1 text-sm text-zinc-400">Crea un'abitudine e segna i progressi: qui vedrai come va.</p>
          <Link
            to="/abitudini/nuova"
            className="mt-6 flex h-12 items-center gap-2 rounded-2xl bg-emerald-400 px-5 font-semibold text-zinc-950"
          >
            <IconPlus />
            Nuova abitudine
          </Link>
        </div>
      </div>
    );
  }

  const daysInRange = Math.round((fromKey(data.end).getTime() - fromKey(data.start).getTime()) / 86_400_000) + 1;
  const best = data.habits.reduce<(typeof data.habits)[number] | null>(
    (acc, h) => (h.streak > (acc?.streak ?? 0) ? h : acc),
    null,
  );

  const bars = data.buckets.map((b) => ({
    label: b.label,
    value: b.due ? b.done / b.due : null,
    detail: b.due ? `${b.title} · ${b.done} su ${b.due} (${pct(b.done / b.due)})` : `${b.title} · niente in programma`,
  }));

  const weekdayBars = data.weekdays.map((w, i) => ({
    label: WEEKDAY_LETTERS[i],
    value: w.due ? w.done / w.due : null,
    detail: w.due ? `${WEEKDAY_SHORT[i]} · ${pct(w.done / w.due)} completato` : `${WEEKDAY_SHORT[i]} · nessun dato`,
  }));
  const bestWeekday = data.weekdays
    .map((w, i) => ({ i, rate: w.due ? w.done / w.due : -1 }))
    .sort((a, b) => b.rate - a.rate)[0];

  const moodPoints = data.mood.map((m) => ({
    x: daysInRange > 1 ? (fromKey(m.date).getTime() - fromKey(data.start).getTime()) / ((daysInRange - 1) * 86_400_000) : 0.5,
    value: m.mood,
    detail: `${relativeDayLabel(m.date, today)} · ${moodEmoji(m.mood)} ${MOODS[m.mood - 1].label}`,
  }));

  return (
    <div className="space-y-5">
      {header}

      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-zinc-900 p-1 ring-1 ring-white/5" role="tablist">
        {RANGES.map((r) => (
          <button
            key={r.key}
            role="tab"
            aria-selected={range === r.key}
            onClick={() => chooseRange(r.key)}
            className={`h-10 rounded-xl text-sm font-medium transition-colors ${
              range === r.key ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <section className="grid grid-cols-2 gap-2.5">
        <Tile label="Completamento" value={pct(data.rate)} accent />
        <Tile label="Giorni perfetti" value={String(data.perfectDays)} sub={`su ${daysInRange}`} />
        <Tile
          label="Serie migliore"
          value={best ? String(best.streak) : '0'}
          sub={best ? `${streakLabel(best.streak, best.period).replace(/^\d+ /, '')} · ${best.habit.icon}` : undefined}
        />
        <Tile
          label="Umore medio"
          value={data.avgMood === null ? '–' : data.avgMood.toLocaleString('it-IT', { maximumFractionDigits: 1 })}
          sub={data.avgMood === null ? undefined : moodEmoji(data.avgMood)}
        />
      </section>

      <Card title="Andamento">
        <BarChart
          title="Completamento nel periodo"
          data={bars}
          color={ACCENT}
          labelEvery={range === '30d' ? 5 : range === '90d' ? 3 : 1}
          hint={
            range === '90d'
              ? 'Completamento per settimana. Tocca una barra.'
              : range === '1y'
                ? 'Completamento per mese. Tocca una barra.'
                : 'Completamento per giorno. Tocca una barra.'
          }
        />
      </Card>

      <Card title="Giorni della settimana">
        <BarChart
          title="Completamento per giorno della settimana"
          data={weekdayBars}
          color={ACCENT}
          height={130}
          hint={
            bestWeekday && bestWeekday.rate >= 0 ? (
              <>
                Il tuo giorno migliore è <span className="font-semibold text-zinc-200">{WEEKDAY_SHORT[bestWeekday.i].toLowerCase()}</span>.
              </>
            ) : (
              'Ancora pochi dati.'
            )
          }
        />
      </Card>

      <Card title="Umore">
        {moodPoints.length ? (
          <MoodChart
            title="Umore nel periodo"
            points={moodPoints}
            color={MOOD_COLOR}
            yLabels={MOODS.map((m) => m.emoji)}
            startLabel={relativeDayLabel(data.start, today)}
            endLabel="Oggi"
            hint="Tocca un punto per vedere il giorno."
          />
        ) : (
          <p className="text-sm text-zinc-400">
            Nessun umore registrato in questo periodo. Puoi segnarlo in fondo alla schermata{' '}
            <Link to="/" className="font-medium text-emerald-300">
              Oggi
            </Link>
            .
          </p>
        )}
      </Card>

      <Card title="Abitudini">
        <ul className="space-y-1">
          {data.habits.map(({ habit, rate, streak, period }) => (
            <li key={habit.id}>
              <Link to={`/abitudini/${habit.id}`} className="flex items-center gap-3 rounded-2xl py-2">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-xl text-xl"
                  style={{ backgroundColor: `${habit.color}22` }}
                >
                  {habit.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{habit.name}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{pct(rate)}</span>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(rate ?? 0) * 100}%`, backgroundColor: habit.color }}
                    />
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    {streak > 0 ? `🔥 ${streakLabel(streak, period)}` : 'Nessuna serie in corso'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {data.notes.length > 0 && (
        <Card title="Note">
          <ul className="divide-y divide-white/5">
            {data.notes.slice(0, 20).map((n) => (
              <li key={n.date}>
                <Link to={n.date === today ? '/' : `/?d=${n.date}`} className="flex gap-3 py-3">
                  <span className="text-xl" aria-hidden="true">
                    {n.mood ? moodEmoji(n.mood) : '📝'}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-zinc-500">{relativeDayLabel(n.date, today)}</span>
                    <span className="mt-0.5 line-clamp-3 block text-sm whitespace-pre-line text-zinc-200">{n.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {data.notes.length > 20 && (
            <p className="pt-2 text-xs text-zinc-500">Mostro le 20 più recenti di {data.notes.length}.</p>
          )}
        </Card>
      )}

      <p className="px-1 text-xs text-zinc-500">
        Periodo: da {relativeDayLabel(data.start, today).toLowerCase()} a oggi. Oggi conta nei totali solo quando hai
        completato tutto.
      </p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-white/5">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-white/5"
      style={accent ? { background: `linear-gradient(135deg, ${ACCENT}26, #18181b 70%)` } : undefined}
    >
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2">
        <span className="text-3xl font-bold">{value}</span>
        {sub && <span className="ml-1.5 text-sm text-zinc-500">{sub}</span>}
      </p>
    </div>
  );
}
