import { useSyncExternalStore } from 'react';

/** Chromium's install event (Chrome, Brave, Edge on Android and desktop). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Registered at import time, from main.tsx, because the event can fire before React renders.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // We show our own button instead of the browser's mini banner.
  deferred = e as BeforeInstallPromptEvent;
  emit();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  installedNow = true;
  emit();
});

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useInstall() {
  const event = useSyncExternalStore(subscribe, () => deferred);
  const installed = useSyncExternalStore(subscribe, () => installedNow || isStandalone());

  const install = async () => {
    if (!deferred) return;
    const e = deferred;
    deferred = null;
    emit();
    await e.prompt();
    await e.userChoice;
  };

  return {
    installed,
    /** The browser can show its install dialog. */
    canInstall: event !== null && !installed,
    /** iPhone/iPad: no install dialog, the user adds it from the Share menu. */
    needsIosSteps: !installed && event === null && isIos(),
    install,
  };
}
