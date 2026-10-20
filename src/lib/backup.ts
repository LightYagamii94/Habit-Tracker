import type { DateKey, DayNote, Entry, Habit, Schedule } from '../types';
import { DATE_KEY_RE } from './dates';

export const BACKUP_APP = 'habit-tracker';
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  habits: Habit[];
  entries: Entry[];
  notes: DayNote[];
}

export function makeBackup(habits: Habit[], entries: Entry[], notes: DayNote[], now = new Date()): Backup {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), habits, entries, notes };
}

/** A backup file that cannot be imported; the message is shown to the user. */
export class BackupError extends Error {}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isDate = (v: unknown): v is DateKey => isStr(v) && DATE_KEY_RE.test(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseSchedule(v: unknown): Schedule | null {
  if (!isObj(v)) return null;
  if (v.kind === 'daily') return { kind: 'daily' };
  if (v.kind === 'weekdays' && Array.isArray(v.days)) {
    const days = [...new Set(v.days)].filter((d): d is number => Number.isInteger(d) && (d as number) >= 1 && (d as number) <= 7);
    return days.length ? { kind: 'weekdays', days: days.sort() } : null;
  }
  if (v.kind === 'timesPerWeek' && Number.isInteger(v.times) && (v.times as number) >= 1 && (v.times as number) <= 7) {
    return { kind: 'timesPerWeek', times: v.times as number };
  }
  return null;
}

function parseHabit(v: unknown, i: number): Habit {
  const bad = () => new BackupError(`L'abitudine n. ${i + 1} nel file non è valida.`);
  if (!isObj(v) || !isStr(v.id) || !v.id || !isStr(v.name) || !isDate(v.startDate)) throw bad();
  if (v.type !== 'boolean' && v.type !== 'quantity' && v.type !== 'negative') throw bad();
  const schedule = parseSchedule(v.schedule);
  if (!schedule) throw bad();
  if (v.type === 'quantity' && !(isNum(v.target) && v.target > 0)) throw bad();
  const limit = v.type === 'negative' && Number.isInteger(v.limit) && (v.limit as number) > 0 ? (v.limit as number) : undefined;
  return {
    id: v.id,
    name: v.name,
    icon: isStr(v.icon) && v.icon ? v.icon : '✅',
    color: isStr(v.color) && /^#[0-9a-f]{6}$/i.test(v.color) ? v.color : '#34d399',
    type: v.type,
    target: v.type === 'quantity' ? (v.target as number) : undefined,
    unit: (v.type === 'quantity' || limit) && isStr(v.unit) ? v.unit : undefined,
    limit,
    schedule,
    startDate: v.startDate,
    archivedAt: isDate(v.archivedAt) ? v.archivedAt : null,
    order: isNum(v.order) ? v.order : i,
    createdAt: isStr(v.createdAt) ? v.createdAt : new Date().toISOString(),
    reminderTime: isStr(v.reminderTime) && TIME_RE.test(v.reminderTime) ? v.reminderTime : undefined,
  };
}

/** Reads a backup file's text. Throws BackupError with a message for the user. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('Il file non è un backup valido.');
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) throw new BackupError('Questo file non è un backup di Habit Tracker.');
  if (!isNum(raw.version) || raw.version > BACKUP_VERSION) {
    throw new BackupError("Il backup è stato fatto con una versione più recente dell'app. Aggiorna l'app e riprova.");
  }
  if (!Array.isArray(raw.habits) || !Array.isArray(raw.entries) || !Array.isArray(raw.notes)) {
    throw new BackupError('Il backup è incompleto.');
  }

  const habits = raw.habits.map(parseHabit);
  const ids = new Set(habits.map((h) => h.id));
  if (ids.size !== habits.length) throw new BackupError('Il backup contiene abitudini duplicate.');

  // Entries and notes that cannot be read are skipped rather than blocking the whole import.
  const entries = raw.entries.filter(
    (e): e is Entry => isObj(e) && isStr(e.habitId) && ids.has(e.habitId) && isDate(e.date) && isNum(e.value) && e.value > 0,
  );
  const notes = raw.notes
    .filter((n): n is Obj => isObj(n) && isDate(n.date))
    .map((n) => ({
      date: n.date as DateKey,
      text: isStr(n.text) ? n.text : '',
      mood: Number.isInteger(n.mood) && (n.mood as number) >= 1 && (n.mood as number) <= 5 ? (n.mood as number) : undefined,
    }))
    .filter((n) => n.text.trim() || n.mood !== undefined);

  return {
    app: BACKUP_APP,
    version: raw.version,
    exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : '',
    habits,
    entries: entries.map(({ habitId, date, value }) => ({ habitId, date, value })),
    notes,
  };
}

const lastDayOfMonth = (k: DateKey): DateKey => {
  const [y, m] = k.split('-').map(Number);
  return `${k.slice(0, 7)}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};

/**
 * Same rule as the Spese app: a backup is due on the last day of the month (if not done that day),
 * or when the one for the end of last month is missing.
 */
export function isBackupDue(today: DateKey, lastBackup: DateKey | null, hasData: boolean): boolean {
  if (!hasData) return false;
  const last = lastBackup ?? '';
  if (today === lastDayOfMonth(today) && last < today) return true;
  const [y, m] = today.split('-').map(Number);
  const prevMonthEnd = lastDayOfMonth(`${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}-01`);
  return last < prevMonthEnd;
}
