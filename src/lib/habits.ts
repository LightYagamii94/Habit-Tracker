import type { DateKey, Entry, Habit, Schedule } from '../types';
import { isoWeekday, weekKeys, WEEKDAY_SHORT } from './dates';

export const isActiveOn = (h: Habit, date: DateKey): boolean =>
  h.startDate <= date && (h.archivedAt === null || date < h.archivedAt);

/** Whether the schedule includes this day. "N times per week" habits can be done on any day. */
export const isScheduledOn = (h: Habit, date: DateKey): boolean => {
  switch (h.schedule.kind) {
    case 'daily':
    case 'timesPerWeek':
      return true;
    case 'weekdays':
      return h.schedule.days.includes(isoWeekday(date));
  }
};

/** Whether the day counts as a success for the habit, given that day's value (0 if no entry). */
export const isDone = (h: Habit, value: number): boolean => {
  switch (h.type) {
    case 'boolean':
      return value > 0;
    case 'quantity':
      return value >= (h.target ?? 1);
    case 'negative':
      return value === 0;
  }
};

export const scheduleLabel = (s: Schedule): string => {
  switch (s.kind) {
    case 'daily':
      return 'Ogni giorno';
    case 'weekdays':
      if (s.days.length === 7) return 'Ogni giorno';
      return [...s.days].sort().map((d) => WEEKDAY_SHORT[d - 1]).join(', ');
    case 'timesPerWeek':
      return s.times === 1 ? '1 volta a settimana' : `${s.times} volte a settimana`;
  }
};

export interface DayItem {
  habit: Habit;
  value: number;
  done: boolean;
  /** Counts toward the day's progress. */
  due: boolean;
  /** For "N times per week": days done in this week, including this one. */
  weekCount: number | null;
}

const entryKey = (habitId: string, date: DateKey) => `${habitId}|${date}`;

/** Entry values by habit and day, for fast repeated lookups. */
export type EntryIndex = Map<string, number>;
export const indexEntries = (entries: Entry[]): EntryIndex =>
  new Map(entries.map((e) => [entryKey(e.habitId, e.date), e.value]));

/**
 * Builds the state of every habit active on `date`.
 * `entries` must contain at least the entries of the week (Mon–Sun) that holds `date`.
 */
export function buildDayItems(habits: Habit[], entries: Entry[] | EntryIndex, date: DateKey): DayItem[] {
  const values = entries instanceof Map ? entries : indexEntries(entries);
  const valueOf = (h: Habit, d: DateKey) => values.get(entryKey(h.id, d)) ?? 0;
  const week = weekKeys(date);

  return habits
    .filter((h) => isActiveOn(h, date))
    .sort((a, b) => a.order - b.order)
    .map((habit) => {
      const value = valueOf(habit, date);
      const done = isDone(habit, value);

      if (habit.schedule.kind === 'timesPerWeek') {
        const weekCount = week.filter((d) => isActiveOn(habit, d) && isDone(habit, valueOf(habit, d))).length;
        const doneOnOtherDays = weekCount - (done ? 1 : 0);
        // Due until the weekly goal is reached on other days; always counted when done today.
        const due = done || doneOnOtherDays < habit.schedule.times;
        return { habit, value, done, due, weekCount };
      }

      return { habit, value, done, due: isScheduledOn(habit, date), weekCount: null };
    });
}

export function dayProgress(items: DayItem[]): { done: number; due: number } {
  const due = items.filter((i) => i.due);
  return { done: due.filter((i) => i.done).length, due: due.length };
}
