import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  ReceiptText,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { toast, toastError } from '../../stores/ui.js';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  Skeleton,
  StatusBadge,
} from '../../components/ui/primitives.jsx';
import { SUBSCRIPTION_STATUS_LABELS } from '../../utils/constants.js';
import { cn, formatDateOnly, localDateString, money } from '../../utils/format.js';

const STATUS_TONES = { ACTIVE: 'success', PAUSED: 'warning', CANCELLED: 'muted', COMPLETED: 'info' };

export default function CustomerSubscriptionsPage() {
  const queryClient = useQueryClient();
  const [skipTarget, setSkipTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [skipDate, setSkipDate] = useState(localDateString(1));
  const [skipReason, setSkipReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => api('/subscriptions'),
  });

  const subscriptions = data?.data ?? [];

  const action = useMutation({
    mutationFn: ({ id, action: name, body }) => api(`/subscriptions/${id}/${name}`, { method: 'POST', body }),
    onSuccess: (_payload, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      const messages = {
        pause: 'Subscription paused — no deliveries will be generated.',
        resume: 'Subscription resumed. Deliveries continue from the next scheduled day.',
        skip: 'Delivery skipped for that date.',
        cancel: 'Subscription cancelled.',
      };
      toast({ title: 'Subscription updated', message: messages[variables.action], tone: 'success' });
      setSkipTarget(null);
      setCancelTarget(null);
      setSkipReason('');
    },
    onError: (error) => toastError(error, 'Could not update the subscription'),
  });

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="mt-1.5 font-display text-[32px] font-semibold text-brand-primary">Tiffin subscriptions</h1>
          <p className="mt-1 text-[12.5px] text-brand-muted">
            Pause, resume, skip a delivery or review the orders generated from your plan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/account/orders">
            <Button variant="secondary">
              <ReceiptText size={15} /> My orders
            </Button>
          </Link>
          <Link to="/tiffin-plans">
            <Button>
              <UtensilsCrossed size={15} /> Browse plans
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-40" />
        </div>
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No tiffin plans yet"
          description="Start a daily, weekly or monthly plan and the kitchen will generate each delivery automatically."
          action={
            <Link to="/tiffin-plans">
              <Button>Compare tiffin plans</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {subscriptions.map((subscription) => {
            const start = new Date(subscription.startDate);
            const end = new Date(subscription.endDate);
            const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
            const elapsed = Math.min(
              totalDays,
              Math.max(0, Math.round((new Date() - start) / 86400000) + 1),
            );
            const progress = Math.round((elapsed / totalDays) * 100);
            const active = subscription.status === 'ACTIVE';
            const paused = subscription.status === 'PAUSED';
            const closed = ['CANCELLED', 'COMPLETED'].includes(subscription.status);

            return (
              <Card key={subscription.id} className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-border px-5 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-semibold text-brand-primary">
                        {subscription.plan?.name}
                      </h2>
                      <Badge tone={STATUS_TONES[subscription.status] ?? 'muted'} dot>
                        {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                      </Badge>
                      <Badge tone="muted">{subscription.subscriptionNumber}</Badge>
                    </div>
                    <p className="mt-1.5 text-[12px] text-brand-muted">
                      {formatDateOnly(subscription.startDate)} → {formatDateOnly(subscription.endDate)} ·{' '}
                      {subscription.deliverySlot} · {subscription.mealPreference ?? 'Regular veg'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-brand-muted">Demo plan value</p>
                    <p className="font-display text-xl font-semibold text-brand-primary">
                      {money(subscription.totalPrice)}
                    </p>
                    <p className="text-[10px] text-brand-muted">No payment collected</p>
                  </div>
                </div>

                <div className="grid gap-5 px-5 py-4 lg:grid-cols-[1.1fr_1fr]">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-brand-muted">
                      <span>Plan progress</span>
                      <span>
                        Day {elapsed} of {totalDays}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-soft">
                      <div
                        className={cn('h-full rounded-full', paused ? 'bg-brand-warning' : 'bg-brand-secondary')}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
                        Upcoming deliveries
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(subscription.upcomingDeliveries ?? []).length === 0 ? (
                          <p className="text-[11.5px] text-brand-muted">
                            {closed ? 'This plan has ended.' : 'No upcoming deliveries in this period.'}
                          </p>
                        ) : (
                          subscription.upcomingDeliveries.map((date) => (
                            <span
                              key={date}
                              className="rounded-lg bg-brand-background px-2 py-1 text-[11px] font-medium text-brand-text ring-1 ring-brand-border"
                            >
                              {formatDateOnly(date, 'EEE dd MMM')}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {subscription.skips?.length ? (
                      <div className="mt-4">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
                          Skipped dates
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {subscription.skips.map((skip) => (
                            <span
                              key={skip.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#FBF1DD] px-2 py-1 text-[10.5px] font-medium text-[#8a6118]"
                            >
                              <CalendarX size={11} /> {formatDateOnly(skip.date, 'dd MMM')}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {active ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => action.mutate({ id: subscription.id, action: 'pause' })}
                          loading={action.isPending && action.variables?.action === 'pause'}
                        >
                          <Pause size={13} /> Pause plan
                        </Button>
                      ) : null}
                      {paused ? (
                        <Button
                          size="sm"
                          onClick={() => action.mutate({ id: subscription.id, action: 'resume' })}
                          loading={action.isPending && action.variables?.action === 'resume'}
                        >
                          <Play size={13} /> Resume plan
                        </Button>
                      ) : null}
                      {!closed ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSkipTarget(subscription);
                            setSkipDate(localDateString(1));
                          }}
                        >
                          <CalendarX size={13} /> Skip a delivery
                        </Button>
                      ) : null}
                      {!closed ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-brand-danger hover:bg-[#FBEAE5]"
                          onClick={() => setCancelTarget(subscription)}
                        >
                          <XCircle size={13} /> Cancel
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-brand-border bg-brand-background/50 p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
                        Generated orders
                      </p>
                      <Badge tone="muted">{subscription.orders?.length ?? 0}</Badge>
                    </div>
                    <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                      {(subscription.orders ?? []).length === 0 ? (
                        <p className="text-[11px] leading-relaxed text-brand-muted">
                          No deliveries generated yet. The shop generates today&apos;s tiffin orders from the shop
                          dashboard.
                        </p>
                      ) : (
                        subscription.orders.map((order) => (
                          <Link
                            key={order.id}
                            to={`/track/${order.orderNumber}`}
                            className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 text-[11px] ring-1 ring-brand-border transition hover:ring-brand-secondary/40"
                          >
                            <span className="min-w-0">
                              <span className="block font-medium text-brand-text">
                                {formatDateOnly(order.deliveryDate ?? order.scheduledFor, 'dd MMM')}
                              </span>
                              <span className="block truncate text-[10px] text-brand-muted">{order.orderNumber}</span>
                            </span>
                            <StatusBadge status={order.status} />
                          </Link>
                        ))
                      )}
                    </div>
                    <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-brand-muted">
                      <Clock size={11} className="mt-0.5 shrink-0" />
                      Deliveries are generated once per date — re-running generation never duplicates an order.
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(skipTarget)}
        onClose={() => setSkipTarget(null)}
        title="Skip a delivery"
        subtitle={skipTarget ? `${skipTarget.plan?.name} · ${skipTarget.subscriptionNumber}` : ''}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSkipTarget(null)}>
              Keep delivery
            </Button>
            <Button
              onClick={() =>
                action.mutate({
                  id: skipTarget.id,
                  action: 'skip',
                  body: { date: skipDate, reason: skipReason || undefined },
                })
              }
              loading={action.isPending && action.variables?.action === 'skip'}
            >
              Skip this date
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Delivery date to skip" required hint="Must fall inside the subscription period.">
            <Input
              type="date"
              value={skipDate}
              min={localDateString(0)}
              max={skipTarget ? formatDateOnly(skipTarget.endDate, 'yyyy-MM-dd') : undefined}
              onChange={(event) => setSkipDate(event.target.value)}
            />
          </Field>
          <Field label="Reason (optional)">
            <Input
              value={skipReason}
              onChange={(event) => setSkipReason(event.target.value)}
              placeholder="Travelling, working from home…"
            />
          </Field>
          <p className="rounded-lg bg-brand-background px-3 py-2 text-[11px] leading-relaxed text-brand-muted">
            Skipped dates are excluded when the kitchen generates subscription orders.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => action.mutate({ id: cancelTarget.id, action: 'cancel' })}
        loading={action.isPending && action.variables?.action === 'cancel'}
        title="Cancel this subscription?"
        description="Future deliveries will stop. Past generated orders stay in your history. This is a demo cancellation and no refund is processed."
        confirmLabel="Cancel subscription"
        tone="danger"
      />
    </div>
  );
}
