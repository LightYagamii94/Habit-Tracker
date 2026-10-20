import { describe, expect, it } from 'vitest';
import type { Habit } from '../types';
import type { DayItem } from './habits';
import { reminderState, timeToMinutes } from './reminders';

const item = (over: Partial<DayItem> = {}, habit: Partial<Habit> = {}): DayItem => ({
  habit: {
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
    reminderTime: '08:30',
    ...habit,
  },
  value: 0,
  done: false,
  due: true,
  weekCount: null,
  optional: false,
  ...over,
});

describe('reminders', () => {
  it('parses times', () => expect(timeToMinutes('08:30')).toBe(510));

  it('is upcoming before the time and overdue after', () => {
    expect(reminderState(item(), 509)).toBe('upcoming');
    expect(reminderState(item(), 510)).toBe('overdue');
  });

  it('stays quiet when done, not due, without a time, or for habits to avoid', () => {
    expect(reminderState(item({ done: true }), 600)).toBeNull();
    expect(reminderState(item({ due: false }), 600)).toBeNull();
    expect(reminderState(item({ due: false, optional: true }), 600)).toBeNull();
    expect(reminderState(item({}, { reminderTime: undefined }), 600)).toBeNull();
    expect(reminderState(item({}, { type: 'negative' }), 600)).toBeNull();
  });
});
