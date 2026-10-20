import { exportAll } from '../data/repo';
import { makeBackup } from './backup';
import { todayKey } from './dates';

const LAST_BACKUP_KEY = 'last-backup';
const SNOOZE_KEY = 'backup-snooze';

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the reminder may show again.
  }
};

export const lastBackupDate = () => read(LAST_BACKUP_KEY);
export const isSnoozedToday = () => read(SNOOZE_KEY) === todayKey();
export const snoozeToday = () => write(SNOOZE_KEY, todayKey());
const markDone = () => {
  write(LAST_BACKUP_KEY, todayKey());
  window.dispatchEvent(new Event('backup-done'));
};

async function backupJson() {
  const { habits, entries, notes } = await exportAll();
  return {
    json: JSON.stringify(makeBackup(habits, entries, notes), null, 2),
    name: `habit-tracker-backup-${todayKey()}`,
  };
}

/** Saves the backup to the Downloads folder. */
export async function downloadBackup() {
  const { json, name } = await backupJson();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = `${name}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  markDone();
}

// Chrome on Android shares only some file types, and .json is not one of them:
// for sharing the backup becomes a .txt with the same content, which Import accepts too.
const probe = () => new File(['{}'], 'backup.txt', { type: 'text/plain' });

export function canShareBackup(): boolean {
  try {
    return typeof navigator.share === 'function' && Boolean(navigator.canShare?.({ files: [probe()] }));
  } catch {
    return false;
  }
}

/** Opens the share sheet (Drive, WhatsApp…); falls back to a download if sharing fails. */
export async function shareBackup(): Promise<'shared' | 'cancelled' | 'downloaded'> {
  const { json, name } = await backupJson();
  const file = new File([json], `${name}.txt`, { type: 'text/plain' });
  try {
    await navigator.share({ files: [file], title: file.name });
    markDone();
    return 'shared';
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return 'cancelled';
    await downloadBackup();
    return 'downloaded';
  }
}
