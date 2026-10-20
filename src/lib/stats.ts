import type { DateKey, Entry, Habit } from '../types';
import { addDaysKey, weekStartKey } from './dates';
import { isActiveOn, isDone, isDoneOn, isScheduledOn } from './habits';
import { rulesOn } from './rules';

export interface HabitStats {
  /** Current streak, in days or weeks (see `period`). */
  current: number;
  best: number;
  period: 'day' | 'week';
  /** Share of completed days/weeks, 0–1; null when nothing can be measured yet. */
  rate: number | null;
  /** Days on which the habit was done (for negative habits: days without relapse). */
  doneCount: number;
  /** Days with a relapse, or over the limit (negative habits only). */
  relapses: number;
}

/** Last day the habit can have data: today, or the day before it was archived. */
const lastDay = (h: Habit, today: DateKey): DateKey => {
  if (h.archivedAt === null) return today;
  const beforeArchive = addDaysKey(h.archivedAt, -1);
  return beforeArchive < today ? beforeArchive : today;
};

function runs(results: boolean[]): { current: number; best: number } {
  let best = 0;
  let run = 0;
  for (const ok of results) {
    run = ok ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { current: run, best };
}

/**
 * Streaks and totals for one habit. `entries` are that habit's entries (any range).
 *
 * - Days outside the schedule are skipped and never break a streak.
 * - Today, if not done yet, is still open: it neither breaks the streak nor lowers the rate.
 *   A relapse logged today is final, though.
 * - "N times per week" habits count weeks. The current week only counts once its goal is met.
 *   A partial first or last week needs at most as many days as it has.
 */
export function habitStats(h: Habit, entries: Entry[], today: DateKey): HabitStats {
  const values = new Map<DateKey, number>();
  for (const e of entries) if (e.habitId === h.id) values.set(e.date, e.value);
  const valueOf = (d: DateKey) => values.get(d) ?? 0;

  const end = lastDay(h, today);
  let relapses = 0;
  let doneCount = 0;

  /** One week judged by the rules in force that week (changes involving weekly goals start on a Monday). */
  const judgeWeek = (ws: DateKey) => {
    const rules = rulesOn(h, ws < h.startDate ? h.startDate : ws);
    let count = 0;
    let activeDays = 0;
    let scheduled = 0;
    let scheduledDone = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDaysKey(ws, i);
      if (!isActiveOn(h, d)) continue;
      activeDays++;
      const ok = d <= end && isDoneOn(h, d, valueOf(d));
      if (ok) count++;
      if (isScheduledOn(h, d)) {
        scheduled++;
        if (ok) scheduledDone++;
      }
    }
    const met =
      rules.schedule.kind === 'timesPerWeek'
        ? count >= Math.min(rules.schedule.times, activeDays)
        : scheduledDone === scheduled; // a week from a daily period succeeds when every scheduled day was done
    return { met, count, open: addDaysKey(ws, 6) >= today && !met };
  };

  // The current rules decide the unit: weeks for "N times per week", days otherwise.
  if (h.schedule.kind === 'timesPerWeek') {
    const weeks: boolean[] = [];
    if (h.startDate <= end) {
      for (let ws = weekStartKey(h.startDate); ws <= end; ws = addDaysKey(ws, 7)) {
        const w = judgeWeek(ws);
        doneCount += w.count;
        if (!w.open) weeks.push(w.met);
      }
    }
    const { current, best } = runs(weeks);
    const met = weeks.filter(Boolean).length;
    return { current, best, period: 'week', rate: weeks.length ? met / weeks.length : null, doneCount, relapses };
  }

  const results: { date: DateKey; done: boolean }[] = [];
  for (let d = h.startDate; d <= end; d = addDaysKey(d, 1)) {
    const rules = rulesOn(h, d);
    const value = valueOf(d);
    const done = isDone(rules, value);

    if (rules.schedule.kind === 'timesPerWeek') {
      // A past weekly period inside a daily streak: done days count, and a missed week counts once, on its last day.
      if (done) {
        doneCount++;
        results.push({ date: d, done: true });
      }
      const ws = weekStartKey(d);
      if (d === addDaysKey(ws, 6) || d === end) {
        const w = judgeWeek(ws);
        if (!w.met && !w.open) results.push({ date: d, done: false });
      }
      continue;
    }

    if (!isScheduledOn(h, d)) continue;
    if (h.type === 'negative' && !done) relapses++;
    if (done) doneCount++;
    results.push({ date: d, done });
  }

  const last = results.at(-1);
  if (last && last.date === today && !last.done && h.type !== 'negative') results.pop();

  const { current, best } = runs(results.map((r) => r.done));
  const done = results.filter((r) => r.done).length;
  return { current, best, period: 'day', rate: results.length ? done / results.length : null, doneCount, relapses };
}

export const streakLabel = (n: number, period: HabitStats['period']): string =>
  period === 'week' ? (n === 1 ? '1 settimana' : `${n} settimane`) : n === 1 ? '1 giorno' : `${n} giorni`;
