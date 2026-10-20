/** A calendar day in local time, formatted as YYYY-MM-DD. Sorts correctly as a string. */
export type DateKey = string;

/**
 * boolean: done / not done
 * quantity: a number with a daily target (e.g. 8 glasses of water)
 * negative: something to avoid; a day succeeds while the count stays within the daily limit (0 by default)
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
  /** Unit label, for quantity habits and negative habits with a limit (e.g. "bicchieri", "dolci"). */
  unit?: string;
  /** Negative habits only: how many times a day are allowed. Missing or 0: any time is a relapse. */
  limit?: number;
  schedule: Schedule;
  /** First day the habit is tracked. Can be in the past to log earlier days. */
  startDate: DateKey;
  /** Day the habit was archived; it is hidden from this day on. */
  archivedAt: DateKey | null;
  order: number;
  createdAt: string;
  /** "HH:MM": from this time the app shows a reminder if the habit is not done yet. */
  reminderTime?: string;
  /**
   * Earlier rules, oldest first. Each one applied to the days before its `until` date
   * (and after the previous change); `schedule`, `target` and `limit` above apply from the last `until` on.
   */
  history?: RuleChange[];
}

/** The settings that decide whether a day succeeds. */
export interface Rules {
  schedule: Schedule;
  target?: number;
  limit?: number;
}

export interface RuleChange extends Rules {
  /** First day on which these rules no longer applied. */
  until: DateKey;
}

/**
 * One value per habit per day. Days without an entry count as 0.
 * boolean: 1 = done. quantity: the amount. negative: how many times it happened.
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
