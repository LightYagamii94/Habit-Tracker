import { db } from '../db';
import type { DateKey, Habit } from '../types';

export type HabitInput = Omit<Habit, 'id' | 'order' | 'createdAt' | 'archivedAt'>;

/** Ask the browser not to evict our data under storage pressure. */
async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Not supported: nothing to do.
  }
}

export async function createHabit(input: HabitInput): Promise<string> {
  const last = await db.habits.orderBy('order').last();
  const habit: Habit = {
    ...input,
    id: crypto.randomUUID(),
    order: (last?.order ?? -1) + 1,
    createdAt: new Date().toISOString(),
    archivedAt: null,
  };
  await db.habits.add(habit);
  void requestPersistentStorage();
  return habit.id;
}

export async function updateHabit(id: string, input: Partial<HabitInput>) {
  await db.habits.update(id, input);
}

export async function setArchived(id: string, archivedAt: DateKey | null) {
  await db.habits.update(id, { archivedAt });
}

export async function deleteHabit(id: string) {
  await db.transaction('rw', db.habits, db.entries, async () => {
    await db.entries.where('habitId').equals(id).delete();
    await db.habits.delete(id);
  });
}

/** Swaps a habit with its neighbour among the given ordered list. */
export async function moveHabit(ordered: Habit[], id: string, direction: -1 | 1) {
  const i = ordered.findIndex((h) => h.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= ordered.length) return;
  const a = ordered[i];
  const b = ordered[j];
  await db.transaction('rw', db.habits, async () => {
    await db.habits.update(a.id, { order: b.order });
    await db.habits.update(b.id, { order: a.order });
  });
}

/** Stores a day's value; 0 removes the entry. */
export async function setEntry(habitId: string, date: DateKey, value: number) {
  if (value <= 0) await db.entries.delete([habitId, date]);
  else await db.entries.put({ habitId, date, value });
}

/** Saves the day's note; an empty note without mood is removed. */
export async function saveNote(date: DateKey, text: string, mood: number | undefined) {
  if (!text.trim() && mood === undefined) await db.notes.delete(date);
  else await db.notes.put({ date, text, mood });
}
