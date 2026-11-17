/**
 * PWA plumbing for the NEZTA demo: service worker registration plus the
 * "install app" prompt that Chrome/Edge expose through beforeinstallprompt.
 *
 * iOS Safari never fires that event, so the UI falls back to instructions.
 */

const SW_URL = '/sw.js';

let deferredPrompt = null;
let installed = false;
let started = false;
const listeners = new Set();

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.matchMedia?.('(display-mode: window-controls-overlay)')?.matches ||
    window.navigator.standalone === true
  );
}

export function getInstallState() {
  return {
    installed: installed || isStandalone(),
    canPrompt: Boolean(deferredPrompt),
  };
}

function emit() {
  const snapshot = getInstallState();
  listeners.forEach((listener) => listener(snapshot));
}

export function subscribeInstallState(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Asks the browser to show its native install dialog. */
export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  const prompt = deferredPrompt;
  deferredPrompt = null;
  emit();
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    return outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'dismissed';
  } finally {
    emit();
  }
}

/** Registers the service worker and listens for installability changes. */
export function startPwa() {
  if (started || typeof window === 'undefined') return;
  started = true;

  installed = isStandalone();

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
    emit();
  });

  if (window.matchMedia) {
    const query = window.matchMedia('(display-mode: standalone)');
    query.addEventListener?.('change', () => {
      installed = isStandalone();
      emit();
    });
  }

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(SW_URL).catch(() => {
        /* a failed registration must never break the demo */
      });
    });
  }
}
