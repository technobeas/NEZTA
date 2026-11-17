import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  ChefHat,
  Circle,
  Clock,
  Info,
  MapPin,
  Phone,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../stores/auth.js';
import { toast, toastError } from '../../stores/ui.js';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Skeleton,
  StatusBadge,
} from '../../components/ui/primitives.jsx';
import { ORDER_FLOW, SOURCE_LABELS } from '../../utils/constants.js';
import { cn, formatDateTime, formatTime, money } from '../../utils/format.js';

const ACTIVE_STATUSES = ['NEW', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'];

export default function OrderTrackingPage() {
  const { orderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['order-track', orderNumber],
    queryFn: () => api(`/orders/track/${orderNumber}`),
    enabled: Boolean(orderNumber && user),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return status && ACTIVE_STATUSES.includes(status) ? 6000 : false;
    },
  });

  const order = data?.data;

  const cancelMutation = useMutation({
    mutationFn: () => api(`/orders/${order.id}/status`, { method: 'POST', body: { status: 'CANCELLED', note: 'Cancelled by customer' } }),
    onSuccess: () => {
      toast({ title: 'Order cancelled', message: 'The kitchen has been notified.', tone: 'info' });
      setCancelOpen(false);
      queryClient.invalidateQueries({ queryKey: ['order-track', orderNumber] });
    },
    onError: (cancelError) => toastError(cancelError, 'Could not cancel this order'),
  });

  if (!user) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={ReceiptText}
          title="Sign in to track this order"
          description="Order tracking is linked to your demo customer account so nobody else can see your delivery."
          action={
            <Link to={`/login?next=/track/${orderNumber}`}>
              <Button>Sign in as demo customer</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container-page space-y-4 py-10">
        <Skeleton className="h-24" />
        <Skeleton className="h-56" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={XCircle}
          title="We could not find that order"
          description={error?.message ?? 'Check the order number, or open your order history.'}
          action={
            <Link to="/account/orders">
              <Button>My orders</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const isConfirmedView = searchParams.get('confirmed') === '1';
  const flowIndex = ORDER_FLOW.findIndex((step) => step.status === order.status);
  const cancelled = ['CANCELLED', 'REJECTED', 'DELIVERY_FAILED'].includes(order.status);
  const canCancel = ['NEW', 'CONFIRMED'].includes(order.status);
  const delivered = order.status === 'DELIVERED';

  return (
    <div className="container-page max-w-5xl py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/account/orders" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-muted hover:text-brand-primary">
          <ArrowLeft size={14} /> All orders
        </Link>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-brand-muted">
            <RefreshCw size={11} className={isFetching ? 'animate-spin text-brand-secondary' : ''} />
            {ACTIVE_STATUSES.includes(order.status) ? 'Auto-refreshing' : 'Final status'}
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg border border-brand-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-brand-primary"
          >
            Refresh
          </button>
        </div>
      </div>

      {isConfirmedView && order.status === 'NEW' ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-secondary/25 bg-brand-secondary/8 px-4 py-3.5"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-secondary" />
            <div>
              <p className="text-[13.5px] font-semibold text-brand-primary">Order placed successfully</p>
              <p className="mt-0.5 text-[11.5px] text-brand-muted">
                The kitchen has your order. Estimated delivery 30–40 minutes.
              </p>
            </div>
          </div>
          <Badge tone="success" dot>
            {order.orderNumber}
          </Badge>
        </motion.div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold text-brand-primary">{order.orderNumber}</h1>
                  <StatusBadge status={order.status} />
                  <Badge tone="muted">{SOURCE_LABELS[order.source]}</Badge>
                </div>
                <p className="mt-1.5 text-[12px] text-brand-muted">
                  Placed {formatDateTime(order.placedAt)} · {order.shop?.name ?? 'NEZTA'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-brand-muted">Order total</p>
                <p className="font-display text-2xl font-semibold text-brand-primary">{money(order.total)}</p>
              </div>
            </div>

            {!cancelled ? (
              <div className="mt-6">
                {/* Mobile: a vertical stepper keeps every stage readable */}
                <ol className="space-y-3 sm:hidden">
                  {ORDER_FLOW.map((step, index) => {
                    const complete = index <= flowIndex;
                    const current = index === flowIndex;
                    return (
                      <li key={step.status} className="flex items-start gap-3">
                        <span
                          className={cn(
                            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-semibold',
                            complete
                              ? 'border-brand-secondary bg-brand-secondary text-white'
                              : 'border-brand-border bg-white text-brand-muted',
                            current && !delivered ? 'ring-4 ring-brand-secondary/15' : '',
                          )}
                        >
                          {complete ? <CheckCircle2 size={14} /> : index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-[12.5px] font-semibold leading-tight', complete ? 'text-brand-text' : 'text-brand-muted')}>
                            {step.label}
                          </p>
                          <p className="mt-0.5 text-[10.5px] leading-relaxed text-brand-muted">{step.description}</p>
                        </div>
                        {current ? (
                          <Badge tone={delivered ? 'success' : 'gold'} className="shrink-0">
                            {delivered ? 'Done' : 'Now'}
                          </Badge>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>

                <div className="relative hidden sm:block">
                  <div className="absolute left-0 right-0 top-4 h-0.5 bg-brand-border" />
                  <div
                    className="absolute left-0 top-4 h-0.5 bg-brand-secondary transition-all duration-500"
                    style={{ width: `${flowIndex <= 0 ? 0 : (flowIndex / (ORDER_FLOW.length - 1)) * 100}%` }}
                  />
                  <div className="relative flex justify-between">
                    {ORDER_FLOW.map((step, index) => {
                      const complete = index <= flowIndex;
                      const current = index === flowIndex;
                      return (
                        <div key={step.status} className="flex w-[12.5%] flex-col items-center text-center">
                          <span
                            className={cn(
                              'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white transition',
                              complete
                                ? 'border-brand-secondary bg-brand-secondary text-white'
                                : 'border-brand-border text-brand-border',
                              current && !delivered ? 'ring-4 ring-brand-secondary/15' : '',
                            )}
                          >
                            {complete ? <CheckCircle2 size={15} /> : <Circle size={10} />}
                          </span>
                          <span
                            className={cn(
                              'mt-2 hidden text-[9.5px] font-medium leading-tight sm:block',
                              complete ? 'text-brand-text' : 'text-brand-muted',
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-brand-danger/20 bg-[#FBEAE5]/60 px-3.5 py-3">
                <XCircle size={17} className="mt-0.5 shrink-0 text-brand-danger" />
                <div>
                  <p className="text-[12.5px] font-semibold text-brand-danger">This order was not completed</p>
                  <p className="mt-0.5 text-[11.5px] text-brand-muted">
                    Status: {order.status.replace(/_/g, ' ').toLowerCase()}. Call +91 98200 11223 if you need help.
                  </p>
                </div>
              </div>
            )}

            {order.rider ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-background/60 px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-brand-accent">
                    <Bike size={16} />
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold text-brand-text">{order.rider.name} is delivering</p>
                    <p className="text-[10.5px] text-brand-muted">{order.rider.phone}</p>
                  </div>
                </div>
                <a
                  href={`tel:${order.rider.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-brand-primary"
                >
                  <Phone size={12} /> Call rider
                </a>
              </div>
            ) : null}

            {canCancel ? (
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" className="text-brand-danger hover:bg-[#FBEAE5]" onClick={() => setCancelOpen(true)}>
                  Cancel order
                </Button>
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="border-b border-brand-border px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-brand-primary">Items in this order</h2>
            </div>
            <div className="divide-y divide-brand-border">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold text-brand-text">
                        {item.quantity} × {item.name}
                      </p>
                      {item.itemType === 'MEAL_BOX' ? <Badge tone="gold">Meal box</Badge> : null}
                    </div>
                    {item.customizations?.length ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {item.customizations.map((customization) => (
                          <span
                            key={customization.id}
                            className="rounded-md bg-brand-background px-1.5 py-0.5 text-[10px] text-brand-muted"
                          >
                            {customization.groupLabel}: {customization.valueLabel}
                            {customization.priceDelta > 0 ? ` (+${money(customization.priceDelta)})` : ''}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {item.notes ? <p className="mt-1 text-[10.5px] italic text-brand-muted">“{item.notes}”</p> : null}
                  </div>
                  <p className="shrink-0 text-[12.5px] font-medium text-brand-text">{money(item.lineTotal)}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-brand-border bg-brand-background/40 px-5 py-3.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-brand-muted">Subtotal</span>
                <span>{money(order.subtotal)}</span>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between text-brand-secondary">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span>− {money(order.discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-brand-muted">Delivery</span>
                <span>{order.deliveryFee === 0 ? 'Free' : money(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between border-t border-brand-border pt-2 text-[13px] font-semibold">
                <span>Total</span>
                <span>{money(order.total)}</span>
              </div>
              <p className="text-right text-[10px] text-brand-muted">
                {order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on delivery' : 'UPI on delivery'} ·{' '}
                {order.paymentStatus === 'SIMULATED_PAID' ? 'Simulated payment recorded' : 'Payment pending'}
              </p>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-brand-primary">
              <MapPin size={15} className="text-brand-secondary" /> Delivery details
            </h2>
            <div className="mt-3 space-y-1.5 text-[12px] text-brand-muted">
              <p className="font-medium text-brand-text">{order.delivery.name}</p>
              <p>{order.delivery.line1}</p>
              {order.delivery.line2 ? <p>{order.delivery.line2}</p> : null}
              <p>
                {order.delivery.city} {order.delivery.pincode}
              </p>
              <p className="flex items-center gap-1.5 pt-1">
                <Phone size={12} /> {order.delivery.phone}
              </p>
              {order.delivery.instructions ? (
                <p className="mt-2 rounded-lg bg-brand-background px-2.5 py-2 text-[11px] italic">
                  “{order.delivery.instructions}”
                </p>
              ) : null}
            </div>
          </Card>

          <Card>
            <div className="border-b border-brand-border px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-brand-primary">Status history</h2>
              <p className="mt-0.5 text-[11px] text-brand-muted">Every change is recorded with the actor</p>
            </div>
            <ol className="space-y-0 px-5 py-4">
              {[...order.history].reverse().map((entry, index) => (
                <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < order.history.length - 1 ? (
                    <span className="absolute left-[7px] top-4 h-full w-px bg-brand-border" />
                  ) : null}
                  <span
                    className={cn(
                      'relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 bg-white',
                      index === 0 ? 'border-brand-secondary bg-brand-secondary' : 'border-brand-border',
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold capitalize text-brand-text">
                      {entry.status.replace(/_/g, ' ').toLowerCase()}
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-brand-muted">
                      {formatDateTime(entry.createdAt)}
                      {entry.actorName ? ` · ${entry.actorName}` : ''}
                    </p>
                    {entry.note ? <p className="mt-0.5 text-[10.5px] italic text-brand-muted">{entry.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <div className="rounded-2xl border border-brand-accent/40 bg-brand-accent/10 p-4 text-[11px] leading-relaxed text-[#6f5a20]">
            <p className="flex items-start gap-1.5 font-semibold">
              <Info size={13} className="mt-0.5 shrink-0" /> Demonstration tracking
            </p>
            <p className="mt-1.5">
              This page polls the demo API every few seconds. There is no GPS or live location tracking — the
              delivery stage reflects the rider&apos;s workflow actions.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
        loading={cancelMutation.isPending}
        title="Cancel this order?"
        description="The kitchen will stop preparing this order. This demo cancellation is permanent for this record."
        confirmLabel="Yes, cancel order"
        tone="danger"
      />
    </div>
  );
}
