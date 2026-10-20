import type { DateKey, Habit, RuleChange, Rules } from '../types';
import { weekStartKey } from './dates';

/** The habit with the rules (schedule, target, limit) that applied on `date`. */
export function rulesOn(h: Habit, date: DateKey): Habit {
  if (!h.history?.length) return h;
  for (const c of h.history) {
    if (date < c.until) return { ...h, schedule: c.schedule, target: c.target, limit: c.limit };
  }
  return h;
}

const pickRules = (r: Rules): Rules => ({
  schedule: r.schedule.kind === 'weekdays' ? { kind: 'weekdays', days: [...r.schedule.days].sort() } : r.schedule,
  target: r.target,
  limit: r.limit,
});

export const sameRules = (a: Rules, b: Rules): boolean => {
  const x = pickRules(a);
  const y = pickRules(b);
  return JSON.stringify(x.schedule) === JSON.stringify(y.schedule) && x.target === y.target && (x.limit ?? 0) === (y.limit ?? 0);
};

/**
 * History after editing a habit on `today`: new rules apply from today on, earlier days keep the old ones.
 * When "N times per week" is involved, the change applies from the start of the current week,
 * so that a week is always judged by one rule.
 */
export function nextHistory(old: Habit, next: Habit, today: DateKey): RuleChange[] | undefined {
  const history = old.history ?? [];
  if (sameRules(old, next)) return old.history;

  const weekly = old.schedule.kind === 'timesPerWeek' || next.schedule.kind === 'timesPerWeek';
  const until = weekly ? weekStartKey(today) : today;

  // Rules in force on the day before `until`, and the changes before it.
  const i = history.findIndex((c) => c.until >= until);
  const before = pickRules(i >= 0 ? history[i] : old);
  const kept = i >= 0 ? history.slice(0, i) : history;

  // Nothing to remember when the old rules never applied, or the edit restores them (e.g. two edits the same day).
  if (until <= next.startDate || sameRules(before, next)) return kept.length ? kept : undefined;
  return [...kept, { until, ...before }];
}
