import { describe, expect, it } from 'vitest';
import type { Entry, Habit } from '../types';
import { buildDayItems, dayProgress, isActiveOn, isDone, isScheduledOn, scheduleLabel } from './habits';
import { isoWeekday, relativeDayLabel, weekKeys, weekStartKey } from './dates';

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Test',
  icon: '✅',
  color: '#34d399',
  type: 'boolean',
  schedule: { kind: 'daily' },
  startDate: '2026-10-01',
  archivedAt: null,
  order: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  ...over,
});

// 2026-10-19 is a Monday.
describe('dates', () => {
  it('uses Monday as first day of week', () => {
    expect(weekStartKey('2026-10-25')).toBe('2026-10-19');
    expect(weekStartKey('2026-10-19')).toBe('2026-10-19');
    expect(weekKeys('2026-10-21')).toEqual([
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
    ]);
  });

  it('numbers weekdays ISO style', () => {
    expect(isoWeekday('2026-10-19')).toBe(1);
    expect(isoWeekday('2026-10-25')).toBe(7);
  });

  it('labels relative days', () => {
    expect(relativeDayLabel('2026-10-19', '2026-10-19')).toBe('Oggi');
    expect(relativeDayLabel('2026-10-18', '2026-10-19')).toBe('Ieri');
    expect(relativeDayLabel('2026-10-14', '2026-10-19')).toBe('Mercoledì 14 ottobre');
    expect(relativeDayLabel('2025-10-14', '2026-10-19')).toBe('Martedì 14 ottobre 2025');
  });
});

describe('habit rules', () => {
  it('is active from start date until archive date (excluded)', () => {
    const h = habit({ startDate: '2026-10-10', archivedAt: '2026-10-15' });
    expect(isActiveOn(h, '2026-10-09')).toBe(false);
    expect(isActiveOn(h, '2026-10-10')).toBe(true);
    expect(isActiveOn(h, '2026-10-14')).toBe(true);
    expect(isActiveOn(h, '2026-10-15')).toBe(false);
  });

  it('follows weekday schedules', () => {
    const h = habit({ schedule: { kind: 'weekdays', days: [1, 3, 5] } });
    expect(isScheduledOn(h, '2026-10-19')).toBe(true); // Mon
    expect(isScheduledOn(h, '2026-10-20')).toBe(false); // Tue
  });

  it('decides success per type', () => {
    expect(isDone(habit(), 0)).toBe(false);
    expect(isDone(habit(), 1)).toBe(true);
    const q = habit({ type: 'quantity', target: 8 });
    expect(isDone(q, 7)).toBe(false);
    expect(isDone(q, 8)).toBe(true);
    const n = habit({ type: 'negative' });
    expect(isDone(n, 0)).toBe(true);
    expect(isDone(n, 1)).toBe(false);
  });

  it('labels schedules', () => {
    expect(scheduleLabel({ kind: 'daily' })).toBe('Ogni giorno');
    expect(scheduleLabel({ kind: 'weekdays', days: [5, 1, 3] })).toBe('Lun, Mer, Ven');
    expect(scheduleLabel({ kind: 'timesPerWeek', times: 1 })).toBe('1 volta a settimana');
    expect(scheduleLabel({ kind: 'timesPerWeek', times: 3 })).toBe('3 volte a settimana');
  });
});

describe('buildDayItems', () => {
  it('skips inactive habits and sorts by order', () => {
    const items = buildDayItems(
      [
        habit({ id: 'b', order: 1 }),
        habit({ id: 'a', order: 0 }),
        habit({ id: 'later', startDate: '2026-10-25' }),
      ],
      [],
      '2026-10-19',
    );
    expect(items.map((i) => i.habit.id)).toEqual(['a', 'b']);
  });

  it('does not count unscheduled weekdays as due', () => {
    const h = habit({ schedule: { kind: 'weekdays', days: [1] } });
    const [tue] = buildDayItems([h], [], '2026-10-20');
    expect(tue.due).toBe(false);
  });

  it('counts negative habits as done unless a relapse is logged', () => {
    const h = habit({ type: 'negative' });
    const entries: Entry[] = [{ habitId: 'h1', date: '2026-10-20', value: 1 }];
    expect(buildDayItems([h], entries, '2026-10-19')[0].done).toBe(true);
    expect(buildDayItems([h], entries, '2026-10-20')[0].done).toBe(false);
  });

  it('handles "N times per week"', () => {
    const h = habit({ schedule: { kind: 'timesPerWeek', times: 2 } });
    const entries: Entry[] = [
      { habitId: 'h1', date: '2026-10-19', value: 1 },
      { habitId: 'h1', date: '2026-10-20', value: 1 },
      { habitId: 'h1', date: '2026-10-12', value: 1 }, // previous week
    ];

    const mon = buildDayItems([h], entries, '2026-10-19')[0];
    expect(mon).toMatchObject({ done: true, due: true, weekCount: 2 });

    // Goal already met on other days: not due, so it does not lower the progress.
    const wed = buildDayItems([h], entries, '2026-10-21')[0];
    expect(wed).toMatchObject({ done: false, due: false, weekCount: 2 });

    const nextWeek = buildDayItems([h], entries, '2026-10-26')[0];
    expect(nextWeek).toMatchObject({ done: false, due: true, weekCount: 0 });
  });

  it('computes progress over due habits only', () => {
    const habits = [
      habit({ id: 'a' }),
      habit({ id: 'b', type: 'quantity', target: 3 }),
      habit({ id: 'c', schedule: { kind: 'weekdays', days: [2] } }),
    ];
    const entries: Entry[] = [
      { habitId: 'a', date: '2026-10-19', value: 1 },
      { habitId: 'b', date: '2026-10-19', value: 2 },
    ];
    expect(dayProgress(buildDayItems(habits, entries, '2026-10-19'))).toEqual({ done: 1, due: 2 });
  });
});
