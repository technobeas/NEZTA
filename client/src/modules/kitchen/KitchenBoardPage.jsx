import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  ChefHat,
  CheckCircle2,
  Clock,
  Layers,
  Play,
  RefreshCw,
  Utensils,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { PageHeader } from '../../layouts/PortalLayout.jsx';
import { Badge, Button, Card, Input, Skeleton } from '../../components/ui/primitives.jsx';
import { toast, toastError } from '../../stores/ui.js';
import { SOURCE_LABELS } from '../../utils/constants.js';
import { cn, formatTime, localDateString, money } from '../../utils/format.js';

const COLUMNS = [
  { key: 'new', title: 'New tickets', tone: 'gold', hint: 'Accept then start preparing' },
  { key: 'preparing', title: 'On the stove', tone: 'warning', hint: 'In preparation' },
  { key: 'ready', title: 'Ready for pickup', tone: 'success', hint: 'Waiting for a rider' },
];

export default function KitchenBoardPage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(localDateString(0));
  const [pending, setPending] = useState(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['kitchen-board', date],
    queryFn: () => api('/kitchen/board', { query: { date } }),
    refetchInterval: 15000,
  });

  const stats = useQuery({ queryKey: ['kitchen-stats'], queryFn: () => api('/kitchen/stats'), refetchInterval: 20000 });
  const bulk = useQuery({ queryKey: ['kitchen-bulk'], queryFn: () => api('/kitchen/bulk') });

  const prepare = useMutation({
    mutationFn: (id) => api(`/kitchen/orders/${id}/prepare`, { method: 'POST' }),
    onSuccess: (payload) => {
      toast({ title: `${payload.data.orderNumber} in preparation`, tone: 'success' });
      queryClient.invalidateQueries({ queryKey: ['kitchen-board'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-stats'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => toastError(error, 'Could not start preparation'),
    onSettled: () => setPending(null),
  });

  const ready = useMutation({
    mutationFn: (id) => api(`/kitchen/orders/${id}/ready`, { method: 'POST' }),
    onSuccess: (payload) => {
      toast({ title: `${payload.data.orderNumber} ready for pickup`, message: 'The shop can now assign a rider.', tone: 'success' });
      queryClient.invalidateQueries({ queryKey: ['kitchen-board'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-stats'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => toastError(error, 'Could not mark the order ready'),
    onSettled: () => setPending(null),
  });

  const board = data?.data;
  const bulkData = bulk.data?.data;

  return (
    <div>
      <PageHeader
        eyebrow="Kitchen display"
        title="Preparation board"
        description="Large, touch-friendly tickets. Status changes flow straight to the shop dashboard and the customer's tracking page."
        actions={
          <>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-40" />
            <Button variant="secondary" onClick={() => refetch()} loading={isFetching}>
              <RefreshCw size={15} /> Refresh
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {[
          ['New', stats.data?.data?.newOrders ?? 0],
          ['Preparing', stats.data?.data?.preparing ?? 0],
          ['Ready', stats.data?.data?.ready ?? 0],
          ['Tiffins today', stats.data?.data?.subscriptionToday ?? 0],
        ].map(([label, value]) => (
          <Card key={label} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">{label}</p>
              <p className="font-display text-2xl font-semibold text-brand-primary">{value}</p>
            </div>
            <ChefHat size={18} className="text-brand-secondary/40" />
          </Card>
        ))}
      </div>

      {bulkData?.totals?.orders ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-accent/40 bg-brand-accent/10 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#8a6d26]">
              <Layers size={16} />
            </span>
            <div>
              <p className="text-[12.5px] font-semibold text-brand-primary">
                {bulkData.totals.orders} bulk production {bulkData.totals.orders === 1 ? 'order' : 'orders'} ·{' '}
                {bulkData.totals.meals} meals
              </p>
              <p className="text-[10.5px] text-[#6f5a20]">
                {bulkData.aggregate.slice(0, 2).map((row) => `${row.quantity} × ${row.label}`).join(' · ')}
              </p>
            </div>
          </div>
          <Link to="/app/kitchen/bulk">
            <Button size="sm" variant="secondary">
              Open bulk production <ArrowUpRight size={13} />
            </Button>
          </Link>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const orders = board?.[column.key] ?? [];
          return (
            <div key={column.key} className="flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      column.tone === 'gold' ? 'bg-brand-accent' : column.tone === 'warning' ? 'bg-brand-warning' : 'bg-brand-secondary',
                    )}
                  />
                  <h2 className="text-[13px] font-semibold text-brand-primary">{column.title}</h2>
                  <Badge tone="muted">{orders.length}</Badge>
                </div>
                <p className="text-[10px] text-brand-muted">{column.hint}</p>
              </div>

              <div className="space-y-2.5">
                {isLoading
                  ? Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-40" />)
                  : orders.length === 0
                    ? (
                        <div className="rounded-2xl border border-dashed border-brand-border bg-white/50 px-4 py-10 text-center">
                          <p className="text-[12px] text-brand-muted">No tickets here</p>
                        </div>
                      )
                    : orders.map((order) => (
                        <Card key={order.id} className="overflow-hidden">
                          <div
                            className={cn(
                              'flex items-center justify-between gap-2 px-4 py-2.5',
                              column.tone === 'gold'
                                ? 'bg-brand-accent/15'
                                : column.tone === 'warning'
                                  ? 'bg-[#FBF1DD]'
                                  : 'bg-brand-secondary/8',
                            )}
                          >
                            <div>
                              <p className="font-mono text-[12px] font-bold text-brand-primary">{order.orderNumber}</p>
                              <p className="text-[10px] text-brand-muted">
                                {order.source === 'SUBSCRIPTION'
                                  ? `Tiffin · ${order.subscription?.planName ?? ''}`
                                  : SOURCE_LABELS[order.source]}{' '}
                                · {formatTime(order.scheduledFor ?? order.placedAt)}
                              </p>
                            </div>
                            <Badge tone={column.tone === 'success' ? 'success' : column.tone === 'warning' ? 'warning' : 'gold'}>
                              {order.status.replace(/_/g, ' ').toLowerCase()}
                            </Badge>
                          </div>

                          <div className="space-y-2 p-4">
                            <ul className="space-y-1.5">
                              {order.items?.map((item) => (
                                <li key={item.id} className="text-[12px]">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-medium text-brand-text">
                                      {item.quantity} × {item.name}
                                    </span>
                                    {item.itemType === 'MEAL_BOX' ? <Badge tone="gold">Box</Badge> : null}
                                  </div>
                                  {item.customizations?.length ? (
                                    <ul className="mt-1 space-y-0.5 rounded-md bg-brand-background px-2 py-1.5">
                                      {item.customizations.map((customization) => (
                                        <li key={customization.id} className="text-[10.5px] text-brand-muted">
                                          {customization.groupLabel}: {customization.valueLabel}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : null}
                                  {item.notes ? (
                                    <p className="mt-1 text-[10.5px] italic text-[#8a6118]">Note: {item.notes}</p>
                                  ) : null}
                                </li>
                              ))}
                            </ul>

                            {order.delivery?.instructions ? (
                              <p className="rounded-md bg-[#FBF1DD] px-2 py-1 text-[10.5px] text-[#8a6118]">
                                Delivery: {order.delivery.instructions}
                              </p>
                            ) : null}

                            <div className="flex items-center justify-between border-t border-brand-border pt-2 text-[10.5px] text-brand-muted">
                              <span className="flex items-center gap-1">
                                <Clock size={11} /> {order.customer?.name}
                              </span>
                              <span>{money(order.total)}</span>
                            </div>

                            <div className="flex gap-2 pt-1">
                              {order.status === 'NEW' ? (
                                <p className="w-full rounded-lg bg-brand-background px-2 py-2 text-center text-[10.5px] text-brand-muted">
                                  Waiting for shop acceptance
                                </p>
                              ) : null}
                              {order.status === 'CONFIRMED' ? (
                                <Button
                                  className="w-full"
                                  onClick={() => {
                                    setPending(order.id);
                                    prepare.mutate(order.id);
                                  }}
                                  loading={pending === order.id}
                                >
                                  <Play size={14} /> Start preparing
                                </Button>
                              ) : null}
                              {order.status === 'PREPARING' ? (
                                <Button
                                  className="w-full"
                                  variant="gold"
                                  onClick={() => {
                                    setPending(order.id);
                                    ready.mutate(order.id);
                                  }}
                                  loading={pending === order.id}
                                >
                                  <CheckCircle2 size={14} /> Mark ready
                                </Button>
                              ) : null}
                              {['READY_FOR_PICKUP', 'RIDER_ASSIGNED'].includes(order.status) ? (
                                <p className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-secondary/10 px-2 py-2 text-[11px] font-semibold text-brand-secondary">
                                  <Utensils size={12} /> Packed · {order.rider ? `${order.rider.name} assigned` : 'awaiting rider'}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </Card>
                      ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-brand-muted">
        Board refreshes every 15 seconds · showing {board?.totals?.orders ?? 0} orders · {board?.totals?.items ?? 0}{' '}
        items for {board?.date ?? date}. Demonstration interface — no thermal printing.
      </p>
    </div>
  );
}
