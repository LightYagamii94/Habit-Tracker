import type { DateKey, DayNote, Entry, Habit } from '../types';
import { addDaysKey, addMonthsKey, fromKey, isoWeekday, monthStartKey, weekStartKey } from './dates';
import { buildDayItems, dayProgress, indexEntries } from './habits';
import { habitStats } from './stats';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export type RangeKey = '7d' | '30d' | '90d' | '1y';

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '7 giorni' },
  { key: '30d', label: '30 giorni' },
  { key: '90d', label: '3 mesi' },
  { key: '1y', label: 'Anno' },
];

export interface Bucket {
  start: DateKey;
  end: DateKey;
  /** Short axis label. */
  label: string;
  /** Long label for the tooltip. */
  title: string;
  done: number;
  due: number;
}

export interface HabitInsight {
  habit: Habit;
  /** Completion in the range, 0–1, null when nothing to measure. */
  rate: number | null;
  streak: number;
  period: 'day' | 'week';
}

export interface Insights {
  start: DateKey;
  end: DateKey;
  /** One bar each: days for 7/30 days, weeks for 3 months, months for a year. */
  buckets: Bucket[];
  /** done / due over the counted days. */
  rate: number | null;
  /** Days with something due and everything done. */
  perfectDays: number;
  /** Totals per weekday, Monday first. */
  weekdays: { done: number; due: number }[];
  habits: HabitInsight[];
  mood: { date: DateKey; mood: number }[];
  avgMood: number | null;
  /** Notes with text in the range, newest first. */
  notes: DayNote[];
}

export function rangeStart(range: RangeKey, today: DateKey): DateKey {
  switch (range) {
    case '7d':
      return addDaysKey(today, -6);
    case '30d':
      return addDaysKey(today, -29);
    case '90d':
      return weekStartKey(addDaysKey(today, -7 * 12));
    case '1y':
      return addMonthsKey(today, -11);
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (d: DateKey, pattern: string) => format(fromKey(d), pattern, { locale: it });

function makeBuckets(range: RangeKey, start: DateKey, today: DateKey): Bucket[] {
  const buckets: Bucket[] = [];
  const push = (s: DateKey, e: DateKey, label: string, title: string) =>
    buckets.push({ start: s, end: e > today ? today : e, label, title, done: 0, due: 0 });

  if (range === '7d' || range === '30d') {
    for (let d = start; d <= today; d = addDaysKey(d, 1)) {
      push(d, d, range === '7d' ? cap(fmt(d, 'EEEEEE')) : String(fromKey(d).getDate()), cap(fmt(d, 'EEEE d MMMM')));
    }
  } else if (range === '90d') {
    for (let d = start; d <= today; d = addDaysKey(d, 7)) {
      push(d, addDaysKey(d, 6), fmt(d, 'd/M'), `Settimana dal ${fmt(d, 'd MMMM')}`);
    }
  } else {
    for (let d = monthStartKey(start); d <= today; d = addMonthsKey(d, 1)) {
      push(d, addDaysKey(addMonthsKey(d, 1), -1), cap(fmt(d, 'LLLLL')), cap(fmt(d, 'LLLL yyyy')));
    }
  }
  return buckets;
}

/**
 * Summary of a period, from `range` back from today.
 * Today counts in the totals only once everything due is done, so an unfinished day does not drag the averages down.
 * The bars show today's progress anyway.
 */
export function computeInsights(
  habits: Habit[],
  entries: Entry[],
  notes: DayNote[],
  range: RangeKey,
  today: DateKey,
): Insights {
  const start = rangeStart(range, today);
  const index = indexEntries(entries);
  const buckets = makeBuckets(range, start, today);
  const weekdays = Array.from({ length: 7 }, () => ({ done: 0, due: 0 }));
  let done = 0;
  let due = 0;
  let perfectDays = 0;

  let b = 0;
  for (let d = start; d <= today; d = addDaysKey(d, 1)) {
    while (buckets[b] && d > buckets[b].end) b++;
    const p = dayProgress(buildDayItems(habits, index, d));
    if (buckets[b]) {
      buckets[b].done += p.done;
      buckets[b].due += p.due;
    }
    const counted = d < today || (p.due > 0 && p.done === p.due);
    if (!counted || p.due === 0) continue;
    done += p.done;
    due += p.due;
    if (p.done === p.due) perfectDays++;
    const w = weekdays[isoWeekday(d) - 1];
    w.done += p.done;
    w.due += p.due;
  }

  const habitInsights = habits
    .filter((h) => h.archivedAt === null)
    .sort((a, c) => a.order - c.order)
    .map((habit) => {
      const all = habitStats(habit, entries, today);
      const inRange = habitStats({ ...habit, startDate: habit.startDate > start ? habit.startDate : start }, entries, today);
      return { habit, rate: inRange.rate, streak: all.current, period: all.period };
    });

  const inRange = notes.filter((n) => n.date >= start && n.date <= today);
  const mood = inRange
    .filter((n): n is DayNote & { mood: number } => typeof n.mood === 'number')
    .map((n) => ({ date: n.date, mood: n.mood }))
    .sort((a, c) => (a.date < c.date ? -1 : 1));

  return {
    start,
    end: today,
    buckets,
    rate: due ? done / due : null,
    perfectDays,
    weekdays,
    habits: habitInsights,
    mood,
    avgMood: mood.length ? mood.reduce((s, m) => s + m.mood, 0) / mood.length : null,
    notes: inRange.filter((n) => n.text.trim()).sort((a, c) => (a.date < c.date ? 1 : -1)),
  };
}

export const MOODS = [
  { value: 1, emoji: '😞', label: 'Pessimo' },
  { value: 2, emoji: '🙁', label: 'Giù' },
  { value: 3, emoji: '😐', label: 'Così così' },
  { value: 4, emoji: '🙂', label: 'Bene' },
  { value: 5, emoji: '😄', label: 'Ottimo' },
];

export const moodEmoji = (m: number) => MOODS[Math.min(4, Math.max(0, Math.round(m) - 1))].emoji;

