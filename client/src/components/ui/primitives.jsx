import { forwardRef, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ChevronDown, Inbox, Loader2, X } from 'lucide-react';
import { cn, initials, money } from '../../utils/format.js';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from '../../utils/constants.js';

/* ---------------------------------------------------------------------- button */

const BUTTON_VARIANTS = {
  primary: 'bg-brand-primary text-white hover:bg-brand-secondary shadow-soft',
  secondary: 'bg-white text-brand-primary border border-brand-border hover:border-brand-secondary/40 hover:bg-brand-background',
  gold: 'bg-brand-accent text-brand-primary hover:bg-[#c9aa5c] shadow-soft',
  ghost: 'text-brand-primary hover:bg-brand-primary/5',
  danger: 'bg-brand-danger text-white hover:bg-[#9d3b26]',
  subtle: 'bg-brand-primary/8 text-brand-primary hover:bg-brand-primary/12',
};

const BUTTON_SIZES = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
  icon: 'h-9 w-9 justify-center',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, leftIcon: LeftIcon, rightIcon: RightIcon, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-xl font-semibold transition-all duration-150 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : LeftIcon ? (
        <LeftIcon size={15} />
      ) : null}
      {children}
      {RightIcon && !loading ? <RightIcon size={15} /> : null}
    </button>
  );
});

/* ----------------------------------------------------------------------- badge */

const TONES = {
  success: 'bg-brand-secondary/10 text-brand-secondary ring-brand-secondary/15',
  gold: 'bg-brand-accent/20 text-[#7c6324] ring-brand-accent/30',
  accent: 'bg-[#E9F2EC] text-brand-secondary ring-brand-secondary/15',
  warning: 'bg-[#FBF1DD] text-[#8a6118] ring-[#E7C77F]/50',
  danger: 'bg-[#FBEAE5] text-brand-danger ring-brand-danger/15',
  info: 'bg-[#EAF1F5] text-brand-info ring-brand-info/15',
  muted: 'bg-brand-soft text-brand-muted ring-brand-border',
  dark: 'bg-brand-primary text-white ring-brand-primary/20',
};

export function Badge({ tone = 'muted', className, children, dot = false }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
        TONES[tone] ?? TONES.muted,
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }) {
  return (
    <Badge tone={ORDER_STATUS_TONES[status] ?? 'muted'} dot className={className}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

/* ------------------------------------------------------------------------ card */

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('min-w-0 rounded-2xl border border-brand-border bg-white shadow-soft', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-brand-border px-5 py-4', className)}>
      <div>
        <h3 className="text-base font-semibold text-brand-text">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-[13px] text-brand-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ----------------------------------------------------------------------- forms */

export function Field({ label, hint, error, required, className, children }) {
  return (
    <label className={cn('block', className)}>
      {label ? (
        <span className="field-label">
          {label}
          {required ? <span className="ml-0.5 text-brand-danger">*</span> : null}
        </span>
      ) : null}
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="mt-1 block text-xs text-brand-muted">{hint}</span> : null}
    </label>
  );
}

export const Input = forwardRef(function Input({ error, className, ...props }, ref) {
  return <input ref={ref} className={cn('field-input', error && 'border-brand-danger', className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ error, className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn('field-input resize-y', error && 'border-brand-danger', className)} {...props} />;
});

export const Select = forwardRef(function Select({ error, className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn('field-input appearance-none pr-9', error && 'border-brand-danger', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted" />
    </div>
  );
});

export function Switch({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 text-left"
      aria-pressed={checked}
    >
      <span>
        <span className="block text-sm font-medium text-brand-text">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-brand-muted">{description}</span> : null}
      </span>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-brand-secondary' : 'bg-brand-border',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}

/* ----------------------------------------------------------------------- modal */

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', closeOnBackdrop = true }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  // Portalled to <body>: page transitions wrap routes in a transformed motion
  // element, which would otherwise turn `fixed` into "fixed to the page".
  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 bg-brand-primary/40 backdrop-blur-[2px]"
            onClick={closeOnBackdrop ? onClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={cn(
              'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-lift sm:rounded-3xl',
              widths[size],
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-brand-border px-5 py-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-brand-primary">{title}</h2>
                {subtitle ? <p className="mt-1 text-sm text-brand-muted">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-brand-muted transition hover:bg-brand-soft hover:text-brand-text"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer ? <div className="border-t border-brand-border bg-brand-background/50 px-5 py-4">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', tone = 'primary', loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-brand-muted">{description}</p>
    </Modal>
  );
}

/* ----------------------------------------------------------------------- table */

export function Table({ className, children, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full min-w-[640px] border-collapse text-left text-[13px]', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, children, ...props }) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-brand-border bg-brand-background/60 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-muted',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className, children, ...props }) {
  return (
    <td className={cn('border-b border-brand-border/70 px-3 py-3 align-middle text-brand-text', className)} {...props}>
      {children}
    </td>
  );
}

/* ---------------------------------------------------------------- misc bits */

export function Spinner({ className }) {
  return <Loader2 className={cn('animate-spin text-brand-secondary', className)} size={20} />;
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-border bg-white/60 px-6 py-14 text-center', className)}>
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/5 text-brand-secondary">
        <Icon size={22} />
      </span>
      <h3 className="text-base font-semibold text-brand-text">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-brand-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-danger/20 bg-[#FBEAE5]/40 px-6 py-12 text-center">
      <AlertCircle className="mb-3 text-brand-danger" size={24} />
      <p className="text-sm font-medium text-brand-text">{error?.message ?? 'We could not load this section'}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function ImageWithFallback({ src, alt, className, imgClassName, fallbackLabel }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn('relative overflow-hidden bg-brand-soft', className)}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={cn('h-full w-full object-cover', imgClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-primary to-brand-secondary text-2xl font-semibold text-white/80">
          {fallbackLabel ?? initials(alt ?? 'NEZTA')}
        </div>
      )}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, action, align = 'left', className }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-5', align === 'center' && 'flex-col items-center text-center', className)}>
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 className="font-display text-3xl font-semibold text-brand-primary sm:text-[34px]">{title}</h2>
        {description ? <p className="mt-3 text-[15px] leading-relaxed text-brand-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Money({ value, className, precise }) {
  return <span className={cn('tabular-nums', className)}>{money(value, { precise })}</span>;
}

export function Tabs({ options, value, onChange, className, size = 'md' }) {
  return (
    <div className={cn('scrollbar-none flex gap-1 overflow-x-auto rounded-xl bg-brand-soft p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'whitespace-nowrap rounded-lg px-3.5 font-medium transition',
            size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-[13px]',
            value === option.value
              ? 'bg-white text-brand-primary shadow-sm'
              : 'text-brand-muted hover:text-brand-text',
          )}
        >
          {option.label}
          {option.count !== undefined ? (
            <span className="ml-1.5 rounded-full bg-brand-primary/5 px-1.5 py-0.5 text-[10px] font-semibold text-brand-muted">
              {option.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, size = 36, className }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-[11px] font-semibold uppercase tracking-wide text-brand-primary',
        className,
      )}
      style={{ width: size, height: size }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'default', trend }) {
  return (
    <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium uppercase tracking-wide text-brand-muted">{label}</p>
        {Icon ? (
          <span
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-xl',
              tone === 'gold' ? 'bg-brand-accent/20 text-[#8a6d26]' : 'bg-brand-primary/5 text-brand-secondary',
            )}
          >
            <Icon size={16} />
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-[26px] font-semibold leading-none text-brand-primary">{value}</p>
      {hint ? <p className="mt-2 text-[12px] text-brand-muted">{hint}</p> : null}
      {trend ? <div className="mt-3">{trend}</div> : null}
    </div>
  );
}

export function Collapse({ open, children }) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
