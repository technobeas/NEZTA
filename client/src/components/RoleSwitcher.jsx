import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck, UserCog } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../stores/auth.js';
import { toast, toastError } from '../stores/ui.js';
import { ROLE_HOME, ROLE_LABELS } from '../utils/constants.js';
import { Badge, Button, Modal } from './ui/primitives.jsx';
import { cn } from '../utils/format.js';

/**
 * Presentation helper: swap demo roles in one click without retyping passwords.
 */
export function RoleSwitcher({ variant = 'button', className }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const switchRole = useAuth((state) => state.switchRole);

  const { data } = useQuery({
    queryKey: ['demo-accounts'],
    queryFn: () => api('/auth/demo-accounts'),
    staleTime: Infinity,
  });

  const accounts = data?.accounts ?? [];

  async function choose(role) {
    setPending(role);
    try {
      const nextUser = await switchRole(role);
      toast({
        title: `Now viewing as ${ROLE_LABELS[role]}`,
        message: `Signed in as ${nextUser.name}`,
        tone: 'success',
      });
      setOpen(false);
      navigate(ROLE_HOME[role] ?? '/');
    } catch (error) {
      toastError(error, 'Could not switch demo role');
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <Button
        variant={variant === 'light' ? 'secondary' : 'ghost'}
        size="sm"
        className={cn(
          variant === 'sidebar' && 'w-full justify-start gap-2 border border-white/15 bg-white/5 text-white hover:bg-white/10',
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <UserCog size={15} />
        <span>Switch demo role</span>
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Demo role switcher"
        subtitle="Jump between the five experiences in this prototype. No password needed."
      >
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-brand-accent/15 px-3 py-2.5 text-[12px] leading-relaxed text-[#6f5a20]">
          <ShieldCheck size={15} className="mt-0.5 shrink-0" />
          <p>
            Demonstration accounts only. Authentication, payments and notifications are simulated for this
            prototype.
          </p>
        </div>

        <div className="space-y-2">
          {accounts.map((account) => {
            const active = user?.role === account.role;
            return (
              <button
                key={account.role}
                type="button"
                onClick={() => choose(account.role)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition',
                  active
                    ? 'border-brand-secondary/40 bg-brand-secondary/5'
                    : 'border-brand-border bg-white hover:border-brand-secondary/30 hover:bg-brand-background',
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-brand-text">{account.label}</p>
                    {active ? <Badge tone="success">Current</Badge> : null}
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-brand-muted">
                    {account.name} · {account.email}
                  </p>
                  <p className="mt-0.5 text-[11px] text-brand-muted/80">{account.description}</p>
                </div>
                {pending === account.role ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-secondary border-t-transparent" />
                ) : (
                  <ArrowRight size={16} className="shrink-0 text-brand-muted" />
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-[11px] text-brand-muted">
          Demo password for every account: <span className="font-semibold text-brand-text">demo1234</span>
        </p>
      </Modal>
    </>
  );
}
