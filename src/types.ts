/** A calendar day in local time, formatted as YYYY-MM-DD. Sorts correctly as a string. */
export type DateKey = string;

/**
 * boolean: done / not done
 * quantity: a number with a daily target (e.g. 8 glasses of water)
 * negative: something to avoid; a day succeeds unless a relapse is logged
 */
export type HabitType = 'boolean' | 'quantity' | 'negative';

/** Weekdays use ISO numbering: 1 = Monday … 7 = Sunday. */
export type Schedule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] }
  | { kind: 'timesPerWeek'; times: number };

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: HabitType;
  /** Daily target, only for quantity habits. */
  target?: number;
  /** Unit label, only for quantity habits (e.g. "bicchieri"). */
  unit?: string;
  schedule: Schedule;
  /** First day the habit is tracked. Can be in the past to log earlier days. */
  startDate: DateKey;
  /** Day the habit was archived; it is hidden from this day on. */
  archivedAt: DateKey | null;
  order: number;
  createdAt: string;
}

/**
 * One value per habit per day. Days without an entry count as 0.
 * boolean: 1 = done. quantity: the amount. negative: 1 = relapse.
 */
export interface Entry {
  habitId: string;
  date: DateKey;
  value: number;
}

export interface DayNote {
  date: DateKey;
  text: string;
  /** 1–5 */
  mood?: number;
}
