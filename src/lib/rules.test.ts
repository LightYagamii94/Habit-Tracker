import { describe, expect, it } from 'vitest';
import type { Entry, Habit } from '../types';
import { buildDayItems } from './habits';
import { nextHistory, rulesOn } from './rules';
import { habitStats } from './stats';

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h',
  name: 'Palestra',
  icon: '💪',
  color: '#34d399',
  type: 'boolean',
  schedule: { kind: 'timesPerWeek', times: 2 },
  startDate: '2026-09-28',
  archivedAt: null,
  order: 0,
  createdAt: '',
  ...over,
});
const done = (...dates: string[]): Entry[] => dates.map((date) => ({ habitId: 'h', date, value: 1 }));

// 2026-10-19 is a Monday; 2026-10-21 a Wednesday.
describe('nextHistory', () => {
  it('keeps the old rules until the change', () => {
    const old = habit({ type: 'quantity', target: 8, schedule: { kind: 'daily' } });
    const h = nextHistory(old, { ...old, target: 10 }, '2026-10-21');
    expect(h).toEqual([{ until: '2026-10-21', schedule: { kind: 'daily' }, target: 8, limit: undefined }]);
  });

  it('starts weekly changes on the Monday of the current week', () => {
    const old = habit();
    const h = nextHistory(old, { ...old, schedule: { kind: 'timesPerWeek', times: 3 } }, '2026-10-21');
    expect(h?.[0]).toMatchObject({ until: '2026-10-19', schedule: { kind: 'timesPerWeek', times: 2 } });
  });

  it('does not record anything when the rules did not change', () => {
    const old = habit();
    expect(nextHistory(old, { ...old, name: 'Gym', color: '#fff' }, '2026-10-21')).toBeUndefined();
  });

  it('merges two edits on the same day and drops an edit that restores the old rules', () => {
    const old = habit({ schedule: { kind: 'daily' } });
    const once = { ...old, schedule: { kind: 'weekdays' as const, days: [1, 2, 3] }, history: nextHistory(old, { ...old, schedule: { kind: 'weekdays', days: [1, 2, 3] } }, '2026-10-21') };
    const twice = nextHistory(once, { ...once, schedule: { kind: 'weekdays', days: [1, 2] } }, '2026-10-21');
    expect(twice).toEqual([{ until: '2026-10-21', schedule: { kind: 'daily' }, target: undefined, limit: undefined }]);
    expect(nextHistory(once, { ...once, schedule: { kind: 'daily' } }, '2026-10-21')).toBeUndefined();
  });

  it('ignores rules that never applied (changed on the first day)', () => {
    const old = habit({ startDate: '2026-10-21', schedule: { kind: 'daily' } });
    expect(nextHistory(old, { ...old, schedule: { kind: 'weekdays', days: [1] } }, '2026-10-21')).toBeUndefined();
  });
});

describe('rules over time', () => {
  // Two weeks at 2 per week, then 3 per week from Monday 12 October.
  const changed = habit({
    schedule: { kind: 'timesPerWeek', times: 3 },
    history: [{ until: '2026-10-12', schedule: { kind: 'timesPerWeek', times: 2 } }],
  });

  it('applies the rules in force on each day', () => {
    expect(rulesOn(changed, '2026-10-11').schedule).toEqual({ kind: 'timesPerWeek', times: 2 });
    expect(rulesOn(changed, '2026-10-12').schedule).toEqual({ kind: 'timesPerWeek', times: 3 });
  });

  it('keeps past weeks successful after raising the goal', () => {
    const e = done('2026-09-28', '2026-09-30', '2026-10-05', '2026-10-07', '2026-10-12', '2026-10-13', '2026-10-15');
    // 2 + 2 under the old goal, then 3 under the new one: three weeks in a row.
    expect(habitStats(changed, e, '2026-10-19')).toMatchObject({ current: 3, best: 3, rate: 1 });
    // The same data judged only by the new goal would have failed the first two weeks.
    const withoutHistory = { ...changed, history: undefined };
    expect(habitStats(withoutHistory, e, '2026-10-19')).toMatchObject({ current: 1, best: 1 });
  });

  it('shows past days with their own target', () => {
    const water = habit({
      type: 'quantity',
      target: 10,
      schedule: { kind: 'daily' },
      history: [{ until: '2026-10-15', schedule: { kind: 'daily' }, target: 8 }],
    });
    const e: Entry[] = [
      { habitId: 'h', date: '2026-10-14', value: 8 },
      { habitId: 'h', date: '2026-10-15', value: 8 },
    ];
    expect(buildDayItems([water], e, '2026-10-14')[0]).toMatchObject({ done: true, habit: { target: 8 } });
    expect(buildDayItems([water], e, '2026-10-15')[0]).toMatchObject({ done: false, habit: { target: 10 } });
  });

  it('handles a switch from weekly to daily', () => {
    const h = habit({
      schedule: { kind: 'daily' },
      history: [{ until: '2026-10-12', schedule: { kind: 'timesPerWeek', times: 2 } }],
    });
    // Week of 5 Oct met (2 times), then every day from the 12th to the 18th.
    const e = done('2026-10-05', '2026-10-06', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18');
    const s = habitStats({ ...h, startDate: '2026-10-05' }, e, '2026-10-19');
    expect(s.period).toBe('day');
    expect(s.current).toBe(9); // 2 weekly days + 7 daily days, nothing missed
  });
});
