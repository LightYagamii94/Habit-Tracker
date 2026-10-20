import { describe, expect, it } from 'vitest';
import type { Habit } from '../types';
import { BackupError, isBackupDue, makeBackup, parseBackup } from './backup';

const habit: Habit = {
  id: 'h',
  name: 'Acqua',
  icon: '💧',
  color: '#38bdf8',
  type: 'quantity',
  target: 8,
  unit: 'bicchieri',
  schedule: { kind: 'weekdays', days: [1, 3, 5] },
  startDate: '2026-10-01',
  archivedAt: null,
  order: 0,
  createdAt: '2026-10-01T08:00:00.000Z',
  reminderTime: '09:30',
};

describe('backup', () => {
  it('round-trips the data', () => {
    const b = makeBackup([habit], [{ habitId: 'h', date: '2026-10-02', value: 5 }], [{ date: '2026-10-02', text: 'Ok', mood: 4 }]);
    const parsed = parseBackup(JSON.stringify(b));
    expect(parsed.habits).toEqual([habit]);
    expect(parsed.entries).toEqual([{ habitId: 'h', date: '2026-10-02', value: 5 }]);
    expect(parsed.notes).toEqual([{ date: '2026-10-02', text: 'Ok', mood: 4 }]);
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('ciao')).toThrow(BackupError);
    expect(() => parseBackup('{"app":"spese"}')).toThrow('non è un backup di Habit Tracker');
    expect(() => parseBackup(JSON.stringify({ ...makeBackup([], [], []), version: 99 }))).toThrow('più recente');
  });

  it('rejects invalid habits', () => {
    const b = makeBackup([{ ...habit, type: 'quantity', target: 0 }], [], []);
    expect(() => parseBackup(JSON.stringify(b))).toThrow("L'abitudine n. 1");
  });

  it('skips entries of unknown habits and empty notes', () => {
    const b = makeBackup(
      [habit],
      [
        { habitId: 'h', date: '2026-10-02', value: 1 },
        { habitId: 'ghost', date: '2026-10-02', value: 1 },
        { habitId: 'h', date: 'ieri', value: 1 },
      ],
      [{ date: '2026-10-02', text: '  ' }],
    );
    const parsed = parseBackup(JSON.stringify(b));
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.notes).toHaveLength(0);
  });
});

describe('isBackupDue', () => {
  it('asks on the last day of the month', () => {
    expect(isBackupDue('2026-10-31', '2026-09-30', true)).toBe(true);
    expect(isBackupDue('2026-10-31', '2026-10-31', true)).toBe(false);
  });

  it('asks when last month was missed', () => {
    expect(isBackupDue('2026-10-20', '2026-09-15', true)).toBe(true);
    expect(isBackupDue('2026-10-20', '2026-09-30', true)).toBe(false);
    expect(isBackupDue('2026-01-10', '2025-12-31', true)).toBe(false);
    expect(isBackupDue('2026-10-20', null, true)).toBe(true);
  });

  it('never asks without data', () => {
    expect(isBackupDue('2026-10-31', null, false)).toBe(false);
  });
});
