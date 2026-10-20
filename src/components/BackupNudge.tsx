import { useEffect, useState } from 'react';
import { isBackupDue } from '../lib/backup';
import { canShareBackup, downloadBackup, isSnoozedToday, lastBackupDate, shareBackup, snoozeToday } from '../lib/backupFile';
import type { DateKey } from '../types';

/** Monthly backup reminder on the Today page, with the same rule as the Spese app. */
export function BackupNudge({ today, hasData }: { today: DateKey; hasData: boolean }) {
  const [last, setLast] = useState(lastBackupDate);
  const [hidden, setHidden] = useState(isSnoozedToday);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setLast(lastBackupDate());
    window.addEventListener('backup-done', update);
    return () => window.removeEventListener('backup-done', update);
  }, []);

  if (note) {
    return (
      <p role="status" className="rounded-3xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200 ring-1 ring-emerald-400/30">
        {note}
      </p>
    );
  }
  if (hidden || !isBackupDue(today, last, hasData)) return null;

  const save = async () => {
    if (canShareBackup()) {
      const r = await shareBackup();
      if (r === 'cancelled') return;
      setNote(r === 'shared' ? 'Backup salvato. 👍' : 'Backup scaricato nella cartella Download. 👍');
    } else {
      await downloadBackup();
      setNote('Backup scaricato nella cartella Download. 👍');
    }
  };

  return (
    <section className="rounded-3xl bg-sky-400/10 p-4 ring-1 ring-sky-400/30">
      <p className="font-semibold">💾 {last ? 'È il momento del backup' : 'Fai il tuo primo backup'}</p>
      <p className="mt-1 text-sm text-zinc-400">
        Salva una copia dei tuoi dati: se il telefono o il browser li cancellassero, potrai recuperarli da
        Impostazioni → Importa.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => void save()}
          className="h-10 rounded-full bg-sky-400 px-5 text-sm font-semibold text-zinc-950 hover:bg-sky-300"
        >
          Fai backup
        </button>
        <button
          onClick={() => {
            snoozeToday();
            setHidden(true);
          }}
          className="h-10 rounded-full px-4 text-sm font-medium text-zinc-400 hover:bg-white/5"
        >
          Più tardi
        </button>
      </div>
    </section>
  );
}
