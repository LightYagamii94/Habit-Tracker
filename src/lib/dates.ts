import { addDays, addMonths, format, parseISO, startOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import type { DateKey } from '../types';

export const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const toKey = (d: Date): DateKey => format(d, 'yyyy-MM-dd');
/** parseISO reads a date-only string as local midnight. */
export const fromKey = (k: DateKey): Date => parseISO(k);
export const todayKey = (): DateKey => toKey(new Date());
export const addDaysKey = (k: DateKey, n: number): DateKey => toKey(addDays(fromKey(k), n));

/** Weeks start on Monday. */
export const weekStartKey = (k: DateKey): DateKey => toKey(startOfWeek(fromKey(k), { weekStartsOn: 1 }));
export const weekKeys = (k: DateKey): DateKey[] => {
  const start = weekStartKey(k);
  return Array.from({ length: 7 }, (_, i) => addDaysKey(start, i));
};

/** 1 = Monday … 7 = Sunday */
export const isoWeekday = (k: DateKey): number => {
  const d = fromKey(k).getDay();
  return d === 0 ? 7 : d;
};

export const WEEKDAY_LETTERS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export const dayOfMonth = (k: DateKey): number => fromKey(k).getDate();

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const formatLong = (k: DateKey): string => capitalize(format(fromKey(k), 'EEEE d MMMM', { locale: it }));
export const formatLongWithYear = (k: DateKey): string =>
  capitalize(format(fromKey(k), 'EEEE d MMMM yyyy', { locale: it }));

/** "Oggi", "Ieri", or the full date. */
export const relativeDayLabel = (k: DateKey, today: DateKey): string => {
  if (k === today) return 'Oggi';
  if (k === addDaysKey(today, -1)) return 'Ieri';
  return k.slice(0, 4) === today.slice(0, 4) ? formatLong(k) : formatLongWithYear(k);
};

/** First day of the month, as a date key. */
export const monthStartKey = (k: DateKey): DateKey => `${k.slice(0, 7)}-01`;
export const addMonthsKey = (k: DateKey, n: number): DateKey => toKey(addMonths(fromKey(monthStartKey(k)), n));
export const formatMonth = (k: DateKey): string => capitalize(format(fromKey(k), 'LLLL yyyy', { locale: it }));

/** Days of the month in a Monday-first grid, padded with nulls. */
export const monthGrid = (k: DateKey): (DateKey | null)[] => {
  const first = monthStartKey(k);
  const cells: (DateKey | null)[] = Array.from({ length: isoWeekday(first) - 1 }, () => null);
  for (let d = first; d.slice(0, 7) === first.slice(0, 7); d = addDaysKey(d, 1)) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
};
