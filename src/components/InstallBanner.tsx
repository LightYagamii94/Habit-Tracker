import { useState } from 'react';
import { useInstall } from '../lib/install';
import { IconX } from './icons';

const DISMISS_KEY = 'install-banner-dismissed';

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

/** Invites the user to install the app. Shown on the Today page until installed or dismissed. */
export function InstallBanner() {
  const { canInstall, needsIosSteps, install } = useInstall();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed || (!canInstall && !needsIosSteps)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Storage unavailable: the banner just comes back next time.
    }
  };

  return (
    <section className="relative flex items-center gap-3 rounded-3xl bg-emerald-400/10 p-4 pr-10 ring-1 ring-emerald-400/30">
      <span className="text-3xl" aria-hidden="true">
        📲
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Installa l'app</p>
        <p className="text-sm text-zinc-400">
          {canInstall ? (
            'Aprila dalla schermata Home, a tutto schermo e anche offline.'
          ) : (
            <>
              Tocca <span className="font-semibold text-zinc-200">Condividi</span> e poi{' '}
              <span className="font-semibold text-zinc-200">Aggiungi alla schermata Home</span>.
            </>
          )}
        </p>
        {canInstall && (
          <button
            onClick={() => void install()}
            className="mt-3 h-10 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"
          >
            Installa
          </button>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label="Chiudi"
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-full text-zinc-400 hover:bg-white/5"
      >
        <IconX className="size-4" />
      </button>
    </section>
  );
}

/** Compact install button, always available while the app is not installed. */
export function InstallButton() {
  const { canInstall, install } = useInstall();
  if (!canInstall) return null;
  return (
    <button
      onClick={() => void install()}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 text-sm font-medium text-emerald-300 ring-1 ring-white/5"
    >
      📲 Installa l'app sul telefono
    </button>
  );
}
