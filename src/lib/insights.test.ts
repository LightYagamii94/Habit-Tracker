import { describe, expect, it } from 'vitest';
import type { DayNote, Entry, Habit } from '../types';
import { computeInsights, rangeStart } from './insights';

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
const done = (id: string, ...dates: string[]): Entry[] => dates.map((date) => ({ habitId: id, date, value: 1 }));

// 2026-10-19 is a Monday.
const TODAY = '2026-10-19';

describe('rangeStart', () => {
  it('computes the first day of each range', () => {
    expect(rangeStart('7d', TODAY)).toBe('2026-10-13');
    expect(rangeStart('30d', TODAY)).toBe('2026-09-20');
    expect(rangeStart('90d', TODAY)).toBe('2026-07-27'); // Monday, 12 weeks back
    expect(rangeStart('1y', TODAY)).toBe('2025-11-01');
  });
});

describe('computeInsights', () => {
  const habits = [habit({ id: 'a' }), habit({ id: 'b', order: 1 })];

  it('sums the last 7 days, leaving out an unfinished today', () => {
    // 13–18: a done every day, b done on 13 and 14. Today: only a done.
    const entries = [
      ...done('a', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', TODAY),
      ...done('b', '2026-10-13', '2026-10-14'),
    ];
    const r = computeInsights(habits, entries, [], '7d', TODAY);
    expect(r.buckets).toHaveLength(7);
    expect(r.buckets.at(-1)).toMatchObject({ start: TODAY, done: 1, due: 2 }); // bars still show today
    expect(r.rate).toBeCloseTo(8 / 12);
    expect(r.perfectDays).toBe(2);
    // Tuesday 13 and Wednesday 14 were perfect
    expect(r.weekdays[1]).toEqual({ done: 2, due: 2 });
    expect(r.weekdays[0]).toEqual({ done: 0, due: 0 }); // Monday is today, not counted yet
  });

  it('counts today once it is complete', () => {
    const r = computeInsights(habits, [...done('a', TODAY), ...done('b', TODAY)], [], '7d', TODAY);
    expect(r.perfectDays).toBe(1);
    expect(r.weekdays[0]).toEqual({ done: 2, due: 2 });
  });

  it('groups by week and by month', () => {
    expect(computeInsights(habits, [], [], '90d', TODAY).buckets).toHaveLength(13);
    const year = computeInsights(habits, [], [], '1y', TODAY).buckets;
    expect(year).toHaveLength(12);
    expect(year[0]).toMatchObject({ start: '2025-11-01', end: '2025-11-30', title: 'Novembre 2025' });
    expect(year.at(-1)).toMatchObject({ start: '2026-10-01', end: TODAY });
  });

  it('gives per-habit rates within the range', () => {
    const r = computeInsights(habits, done('a', '2026-10-17', '2026-10-18'), [], '7d', TODAY);
    expect(r.habits.map((h) => h.habit.id)).toEqual(['a', 'b']);
    expect(r.habits[0].rate).toBeCloseTo(2 / 6);
    expect(r.habits[0].streak).toBe(2);
  });

  it('collects moods and notes in the range', () => {
    const notes: DayNote[] = [
      { date: '2026-10-18', text: 'Bella giornata', mood: 5 },
      { date: '2026-10-15', text: '', mood: 2 },
      { date: '2026-09-01', text: 'Fuori periodo', mood: 1 },
    ];
    const r = computeInsights(habits, [], notes, '7d', TODAY);
    expect(r.mood).toEqual([
      { date: '2026-10-15', mood: 2 },
      { date: '2026-10-18', mood: 5 },
    ]);
    expect(r.avgMood).toBe(3.5);
    expect(r.notes.map((n) => n.date)).toEqual(['2026-10-18']);
  });

  it('has nothing to measure without habits', () => {
    expect(computeInsights([], [], [], '30d', TODAY)).toMatchObject({ rate: null, perfectDays: 0, avgMood: null });
  });
});
