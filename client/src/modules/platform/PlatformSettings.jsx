import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Database, Percent, RotateCcw, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader } from '../../layouts/PortalLayout.jsx';
import { Badge, Button, Card, CardHeader, Field, Input, Skeleton } from '../../components/ui/primitives.jsx';
import { ConfirmDialog } from '../../components/ui/primitives.jsx';
import { useAuth } from '../../stores/auth.js';
import { toast, toastError } from '../../stores/ui.js';
import { formatDateTime, money } from '../../utils/format.js';

const LIMITATIONS = [
  'Demo authentication — every account shares the password demo1234 and tokens are signed locally; there is no identity provider.',
  'M-Pesa, card and cash are captured as pending payment states; no gateway is contacted.',
  'Notifications are in-app toasts only; no SMS, email or push is delivered.',
  'Maps and rider routing are illustrative; no live location service is used.',
  'One active demo shop is seeded. Multi-shop support exists in the schema, not the seeded data.',
  'All money, ratings and performance figures are demo data for presentation purposes.',
];

export default function PlatformSettings() {
  const queryClient = useQueryClient();
  const setSession = useAuth((state) => state.setSession);
  const [rate, setRate] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['platform-settings'], queryFn: () => api('/platform/settings') });
  const settings = data?.data;

  useEffect(() => {
    if (settings) setRate(String(settings.commissionRate));
  }, [settings]);

  const save = useMutation({
    mutationFn: (commissionRate) => api('/platform/settings', { method: 'PATCH', body: { commissionRate } }),
    onSuccess: (payload) => {
      toast({ title: 'Settings saved', message: `Commission set to ${payload.data.commissionRate}%`, tone: 'success' });
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      queryClient.invalidateQueries({ queryKey: ['platform-overview'] });
    },
    onError: (error) => toastError(error, 'Could not save settings'),
  });

  const reset = useMutation({
    mutationFn: () => api('/platform/reset-demo', { method: 'POST' }),
    onSuccess: (payload) => {
      if (payload.data?.token && payload.data?.user) {
        setSession({ token: payload.data.token, user: payload.data.user });
      }
      toast({ title: 'Demo data refreshed', message: 'Seed data restored and your demo session kept alive.', tone: 'success' });
      setConfirmReset(false);
      queryClient.invalidateQueries();
    },
    onError: (error) => toastError(error, 'Could not reset demo data'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Marketplace"
        title="Settings"
        description="Marketplace configuration for the demo. Changes apply across every dashboard immediately."
        actions={<Badge tone="muted"><ShieldCheck size={10} /> Platform admin</Badge>}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Commission" subtitle="Illustrative platform fee applied to order value" />
          <div className="p-4">
            <Field label="Default commission rate (%)" hint="Allowed range 0–50%. Shops can override this rate.">
              <Input type="number" min={0} max={50} step="0.5" value={rate} onChange={(event) => setRate(event.target.value)} />
            </Field>
            <div className="mt-3 flex items-center gap-3">
              <Button leftIcon={Percent} loading={save.isPending} onClick={() => save.mutate(Number(rate))}>
                Save rate
              </Button>
              <p className="text-[11px] text-brand-muted">
                Last updated {formatDateTime(settings.updatedAt)}
              </p>
            </div>
            <div className="mt-4 rounded-lg bg-brand-background px-3 py-2.5 text-[11px] text-brand-muted">
              On {money(5000)} of order value, a {settings.commissionRate}% rate equals{' '}
              <span className="font-semibold text-brand-primary">{money((5000 * settings.commissionRate) / 100)}</span> in
              platform fees. This is a demo calculation, not a payout.
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Demo data" subtitle="Reset the seeded marketplace to its initial state" />
          <div className="p-4">
            <div className="rounded-lg border border-brand-border bg-brand-surface px-3 py-3">
              <p className="flex items-center gap-2 text-[12px] font-semibold text-brand-text">
                <Database size={14} className="text-brand-secondary" /> Seed dataset
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-brand-muted">
                Refreshing re-runs the demo seed: 1 shop, 3 customers, 20 orders, 3 tiffin plans, 4 corporate enquiries
                and 2 confirmed bulk orders. Any orders created during the demo will be replaced.
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="flex items-start gap-1.5 text-[10.5px] text-brand-muted">
                <AlertTriangle size={12} className="mt-0.5 shrink-0 text-brand-warning" />
                Recording a demo? Refresh before you start, not during.
              </p>
              <Button variant="secondary" leftIcon={RotateCcw} onClick={() => setConfirmReset(true)}>
                Refresh demo data
              </Button>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="What this demo does not do" subtitle="Set expectations with the client up front" />
          <ul className="grid gap-2 p-4 sm:grid-cols-2">
            {LIMITATIONS.map((item) => (
              <li key={item} className="flex items-start gap-2 rounded-lg bg-brand-background px-3 py-2 text-[11.5px] leading-relaxed text-brand-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => reset.mutate()}
        loading={reset.isPending}
        title="Refresh demo data?"
        description="This re-runs the seed script and replaces orders, enquiries, subscriptions and activity created during this demo session."
        confirmLabel="Refresh data"
        tone="danger"
      />
    </div>
  );
}
