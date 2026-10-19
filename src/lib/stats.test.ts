import { describe, expect, it } from 'vitest';
import type { Entry, Habit } from '../types';
import { habitStats } from './stats';

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h',
  name: 'Test',
  icon: '✅',
  color: '#34d399',
  type: 'boolean',
  schedule: { kind: 'daily' },
  startDate: '2026-10-01',
  archivedAt: null,
  order: 0,
  createdAt: '',
  ...over,
});

const done = (...dates: string[]): Entry[] => dates.map((date) => ({ habitId: 'h', date, value: 1 }));

// 2026-10-19 is a Monday.
const TODAY = '2026-10-19';

describe('habitStats: daily', () => {
  it('counts the current and best streak', () => {
    const h = habit({ startDate: '2026-10-10' });
    const e = done('2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19');
    expect(habitStats(h, e, TODAY)).toMatchObject({ current: 4, best: 4, doneCount: 8, period: 'day' });
  });

  it('keeps the streak open while today is not done yet', () => {
    const h = habit({ startDate: '2026-10-16' });
    const s = habitStats(h, done('2026-10-16', '2026-10-17', '2026-10-18'), TODAY);
    expect(s.current).toBe(3);
    expect(s.rate).toBe(1);
  });

  it('breaks the streak on a missed day', () => {
    const h = habit({ startDate: '2026-10-15' });
    const s = habitStats(h, done('2026-10-15', '2026-10-16', '2026-10-18'), TODAY);
    expect(s).toMatchObject({ current: 1, best: 2 });
    expect(s.rate).toBeCloseTo(3 / 4);
  });

  it('skips days outside a weekday schedule', () => {
    // Mon/Wed/Fri: 12, 14, 16 done, then today (19) open.
    const h = habit({ startDate: '2026-10-12', schedule: { kind: 'weekdays', days: [1, 3, 5] } });
    expect(habitStats(h, done('2026-10-12', '2026-10-14', '2026-10-16'), TODAY)).toMatchObject({ current: 3, best: 3 });
  });

  it('uses the quantity target', () => {
    const h = habit({ type: 'quantity', target: 8, startDate: '2026-10-17' });
    const e: Entry[] = [
      { habitId: 'h', date: '2026-10-17', value: 8 },
      { habitId: 'h', date: '2026-10-18', value: 5 },
    ];
    expect(habitStats(h, e, TODAY)).toMatchObject({ current: 0, best: 1, doneCount: 1 });
  });

  it('stops at the archive date', () => {
    const h = habit({ startDate: '2026-10-10', archivedAt: '2026-10-13' });
    const s = habitStats(h, done('2026-10-10', '2026-10-11', '2026-10-12'), TODAY);
    expect(s).toMatchObject({ current: 3, best: 3, rate: 1 });
  });

  it('returns empty stats before the start date', () => {
    const s = habitStats(habit({ startDate: '2026-11-01' }), [], TODAY);
    expect(s).toMatchObject({ current: 0, best: 0, rate: null });
  });

  it('ignores entries of other habits', () => {
    const h = habit({ startDate: '2026-10-18' });
    const s = habitStats(h, [{ habitId: 'other', date: '2026-10-18', value: 1 }], TODAY);
    expect(s.current).toBe(0);
  });
});

describe('habitStats: negative', () => {
  it('counts days since the last relapse, today included', () => {
    const h = habit({ type: 'negative', startDate: '2026-10-10' });
    const s = habitStats(h, done('2026-10-14'), TODAY);
    expect(s).toMatchObject({ current: 5, best: 5, relapses: 1, doneCount: 9 });
  });

  it('breaks the streak on a relapse today', () => {
    const h = habit({ type: 'negative', startDate: '2026-10-17' });
    expect(habitStats(h, done('2026-10-19'), TODAY)).toMatchObject({ current: 0, best: 2, relapses: 1 });
  });
});

describe('habitStats: times per week', () => {
  const weekly = (over: Partial<Habit> = {}) => habit({ schedule: { kind: 'timesPerWeek', times: 2 }, ...over });

  it('counts consecutive weeks that met the goal', () => {
    const h = weekly({ startDate: '2026-09-28' });
    const e = done(
      '2026-09-28', '2026-09-30', // week 1 ok
      '2026-10-05', // week 2 missed
      '2026-10-12', '2026-10-13', '2026-10-14', // week 3 ok
    );
    const s = habitStats(h, e, TODAY);
    expect(s).toMatchObject({ current: 1, best: 1, period: 'week', doneCount: 6 });
    expect(s.rate).toBeCloseTo(2 / 3);
  });

  it('counts the current week only once met', () => {
    const h = weekly({ startDate: '2026-10-12' });
    expect(habitStats(h, done('2026-10-12', '2026-10-13'), TODAY).current).toBe(1);
    expect(habitStats(h, done('2026-10-12', '2026-10-13', '2026-10-19'), TODAY).current).toBe(1);
    expect(habitStats(h, done('2026-10-12', '2026-10-13', '2026-10-19', '2026-10-20'), '2026-10-20').current).toBe(2);
  });

  it('lowers the goal for a partial first week', () => {
    // Starts on Sunday 18: only one day available that week.
    const h = weekly({ startDate: '2026-10-18' });
    expect(habitStats(h, done('2026-10-18'), TODAY).current).toBe(1);
  });
});
