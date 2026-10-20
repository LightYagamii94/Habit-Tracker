import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { clearAll, replaceAll } from '../data/repo';
import { BackupError, parseBackup, type Backup } from '../lib/backup';
import { canShareBackup, downloadBackup, lastBackupDate, shareBackup } from '../lib/backupFile';
import { relativeDayLabel } from '../lib/dates';
import { useToday } from '../lib/useToday';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { InstallButton } from '../components/InstallBanner';
import { IconDownload, IconShare, IconTrash, IconUpload } from '../components/icons';

export function SettingsPage() {
  const today = useToday();
  const navigate = useNavigate();
  const counts = useLiveQuery(
    async () => ({ habits: await db.habits.count(), entries: await db.entries.count(), notes: await db.notes.count() }),
    [],
  );
  const [lastBackup, setLastBackup] = useState(lastBackupDate);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const shareable = canShareBackup();

  useEffect(() => {
    const update = () => setLastBackup(lastBackupDate());
    window.addEventListener('backup-done', update);
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null));
    return () => window.removeEventListener('backup-done', update);
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
      setMessage(null);
    } catch (err) {
      setMessage({ ok: false, text: err instanceof BackupError ? err.message : 'Non riesco a leggere il file.' });
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const hasData = (counts?.habits ?? 0) + (counts?.notes ?? 0) > 0;

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>
      </header>

      <Section
        title="Backup"
        description="I dati sono salvati solo su questo telefono. Salva una copia ogni tanto: se il telefono o il browser li cancellassero, potrai recuperarli con Importa."
      >
        <p className="text-sm">
          Ultimo backup:{' '}
          <span className={lastBackup ? 'font-medium' : 'font-medium text-amber-300'}>
            {lastBackup ? relativeDayLabel(lastBackup, today).toLowerCase() : 'mai'}
          </span>
        </p>
        <div className="grid gap-2">
          {shareable && (
            <Button
              primary
              icon={<IconShare />}
              onClick={async () => {
                const r = await shareBackup();
                if (r === 'shared') setMessage({ ok: true, text: 'Backup salvato.' });
                if (r === 'downloaded')
                  setMessage({ ok: true, text: 'Condivisione non disponibile: backup scaricato nella cartella Download.' });
              }}
            >
              Salva su Drive o altra app
            </Button>
          )}
          <Button
            primary={!shareable}
            icon={<IconDownload />}
            onClick={async () => {
              await downloadBackup();
              setMessage({ ok: true, text: 'Backup scaricato nella cartella Download.' });
            }}
          >
            Scarica sul telefono
          </Button>
          <Button icon={<IconUpload />} onClick={() => fileInput.current?.click()}>
            Importa un backup
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,.txt,application/json,text/plain"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>
        {message && (
          <p
            role="status"
            className={`rounded-2xl px-4 py-3 text-sm ring-1 ${
              message.ok ? 'bg-emerald-400/10 text-emerald-200 ring-emerald-400/30' : 'bg-rose-500/10 text-rose-300 ring-rose-500/30'
            }`}
          >
            {message.text}
          </p>
        )}
      </Section>

      <Section title="Dati">
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Abitudini" value={counts?.habits} />
          <Stat label="Registrazioni" value={counts?.entries} />
          <Stat label="Note" value={counts?.notes} />
        </dl>
        <p className="text-sm text-zinc-400">
          Archiviazione protetta:{' '}
          {persisted === true ? (
            <span className="font-medium text-emerald-300">sì</span>
          ) : persisted === false ? (
            <span className="font-medium text-amber-300">no, installa l'app e fai backup regolari</span>
          ) : (
            <span className="font-medium">non disponibile</span>
          )}
        </p>
      </Section>

      <Section title="App">
        <InstallButton />
        <p className="text-sm text-zinc-400">
          Versione {__APP_VERSION__} · dati salvati solo su questo dispositivo, nessun account.
        </p>
        <Button danger icon={<IconTrash />} onClick={() => setConfirmClear(true)} disabled={!hasData}>
          Cancella tutti i dati
        </Button>
      </Section>

      <ConfirmDialog
        open={pending !== null}
        title="Importare il backup?"
        message={
          pending
            ? `Contiene ${plural(pending.habits.length, 'abitudine', 'abitudini')}, ${plural(pending.entries.length, 'registrazione', 'registrazioni')} e ${plural(pending.notes.length, 'nota', 'note')}${
                pending.exportedAt ? ` (salvato ${new Date(pending.exportedAt).toLocaleDateString('it-IT')})` : ''
              }. I dati attuali di questo telefono verranno sostituiti.`
            : ''
        }
        confirmLabel="Importa"
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          try {
            await replaceAll(pending);
            setMessage({ ok: true, text: 'Backup importato.' });
          } catch {
            setMessage({ ok: false, text: 'Importazione non riuscita: i dati attuali non sono stati toccati.' });
          }
          setPending(null);
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Cancellare tutti i dati?"
        message="Abitudini, registrazioni e note verranno eliminate da questo telefono. Non si può annullare: fai prima un backup."
        confirmLabel="Cancella"
        danger
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          await clearAll();
          setConfirmClear(false);
          navigate('/', { replace: true });
        }}
      />
    </div>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-3xl bg-zinc-900 p-4 ring-1 ring-white/5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-2xl bg-zinc-800/60 py-3">
      <dd className="text-xl font-bold">{value ?? '–'}</dd>
      <dt className="text-xs text-zinc-400">{label}</dt>
    </div>
  );
}

function Button({
  children,
  icon,
  onClick,
  primary,
  danger,
  disabled,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-40 ${
        primary
          ? 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300'
          : danger
            ? 'bg-zinc-800/60 text-rose-400'
            : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
