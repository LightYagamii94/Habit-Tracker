import type { DayItem } from './habits';

export const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export type ReminderState = 'upcoming' | 'overdue' | null;

/** Reminder state of a habit for today, given the current time in minutes since midnight. */
export function reminderState(item: DayItem, nowMinutes: number): ReminderState {
  const t = item.habit.reminderTime;
  // Not due also covers "N times per week" habits that can still wait.
  if (!t || item.habit.type === 'negative' || item.done || !item.due) return null;
  return nowMinutes >= timeToMinutes(t) ? 'overdue' : 'upcoming';
}
