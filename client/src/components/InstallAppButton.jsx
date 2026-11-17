import { useEffect, useState } from 'react';
import { Download, MonitorSmartphone, Share2, Smartphone } from 'lucide-react';
import { Button, Modal } from './ui/primitives.jsx';
import { getInstallState, promptInstall, subscribeInstallState } from '../services/pwa.js';
import { cn } from '../utils/format.js';

/**
 * "Install app" control used by the customer site and every portal.
 *
 * Chrome/Edge give us a native install prompt. Safari (iOS + macOS) never fires
 * beforeinstallprompt, so those users get the manual Add-to-Home-Screen steps.
 */
export function InstallAppButton({ variant = 'secondary', size = 'sm', compact = false, className, label = 'Install app' }) {
  const [state, setState] = useState(getInstallState);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeInstallState(setState);
    setState(getInstallState());
    return unsubscribe;
  }, []);

  if (state.installed) return null;

  const handleClick = async () => {
    const outcome = await promptInstall();
    if (outcome === 'unavailable') setHelpOpen(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn('shrink-0', className)}
        onClick={handleClick}
        title={state.canPrompt ? 'Install NEZTA on this device' : 'How to install NEZTA on this device'}
        aria-label={state.canPrompt ? 'Install the NEZTA app' : 'How to install the NEZTA app'}
      >
        <Download size={compact ? 15 : 14} />
        {compact ? null : <span className="ml-1.5">{label}</span>}
      </Button>

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Install NEZTA"
        subtitle="Add the demo to your home screen or desktop for a full-screen, app-like experience."
        size="sm"
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setHelpOpen(false)}>
              Got it
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-[12.5px] leading-relaxed text-brand-muted">
          <div className="flex gap-2.5 rounded-xl border border-brand-border bg-brand-background px-3 py-2.5">
            <Smartphone size={16} className="mt-0.5 shrink-0 text-brand-secondary" />
            <p>
              <span className="font-semibold text-brand-text">iPhone / iPad:</span> tap the Share button in Safari, then
              choose <span className="font-medium text-brand-text">Add to Home Screen</span>.
            </p>
          </div>
          <div className="flex gap-2.5 rounded-xl border border-brand-border bg-brand-background px-3 py-2.5">
            <Share2 size={16} className="mt-0.5 shrink-0 text-brand-secondary" />
            <p>
              <span className="font-semibold text-brand-text">Android:</span> open the browser menu and tap{' '}
              <span className="font-medium text-brand-text">Install app</span> or{' '}
              <span className="font-medium text-brand-text">Add to Home screen</span>.
            </p>
          </div>
          <div className="flex gap-2.5 rounded-xl border border-brand-border bg-brand-background px-3 py-2.5">
            <MonitorSmartphone size={16} className="mt-0.5 shrink-0 text-brand-secondary" />
            <p>
              <span className="font-semibold text-brand-text">Desktop:</span> click the install icon in the address bar,
              or open the browser menu and choose <span className="font-medium text-brand-text">Install NEZTA</span>.
            </p>
          </div>
          <p className="text-[11px]">
            Installation is available over HTTPS (and on localhost) once the production build is being served.
          </p>
        </div>
      </Modal>
    </>
  );
}
