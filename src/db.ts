import Dexie, { type EntityTable, type Table } from 'dexie';
import type { DayNote, Entry, Habit } from './types';

class HabitDB extends Dexie {
  habits!: EntityTable<Habit, 'id'>;
  entries!: Table<Entry, [string, string]>;
  notes!: EntityTable<DayNote, 'date'>;

  constructor() {
    super('habit-tracker');
    this.version(1).stores({
      habits: 'id, order',
      entries: '[habitId+date], date, habitId',
      notes: 'date',
    });
  }
}

export const db = new HabitDB();
