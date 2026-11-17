import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Building2, CheckCircle2, ChefHat, Clock, Layers, RefreshCw, Users } from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader } from '../../layouts/PortalLayout.jsx';
import { Badge, Button, Card, CardHeader, ConfirmDialog, Input, Skeleton } from '../../components/ui/primitives.jsx';
import { toast, toastError } from '../../stores/ui.js';
import { BULK_STATUS_LABELS } from '../../utils/constants.js';
import { formatDateOnly, localDateString, money } from '../../utils/format.js';

const STATUS_TONES = {
  CONFIRMED: 'success',
  PREPARING: 'warning',
  READY: 'accent',
  DISPATCHED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'muted',
};

export default function KitchenBulkPage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState('');
  const [completedTarget, setCompletedTarget] = useState(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['kitchen-bulk', date],
    queryFn: () => api('/kitchen/bulk', { query: { date: date || undefined } }),
    refetchInterval: 20000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }) => api(`/bulk-orders/${id}/status`, { method: 'PATCH', body: { status: next } }),
    onSuccess: (payload) => {
      toast({ title: `${payload.data.bulkOrderNumber} → ${BULK_STATUS_LABELS[payload.data.status]}`, tone: 'success' });
      queryClient.invalidateQueries({ queryKey: ['kitchen-bulk'] });
      queryClient.invalidateQueries({ queryKey: ['bulk-orders'] });
      queryClient.invalidateQueries({ queryKey: ['shop-overview'] });
      setCompletedTarget(null);
    },
    onError: (error) => toastError(error, 'Could not update production status'),
  });

  const kitchen = data?.data;

  return (
    <div>
      <PageHeader
        eyebrow="Kitchen"
        title="Bulk production"
        description="Aggregate quantities, delivery deadlines and dietary requirements for confirmed corporate orders."
        actions={
          <>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-40" />
            <Button variant="secondary" onClick={() => refetch()} loading={isFetching}>
              <RefreshCw size={15} /> Refresh
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Production orders</p>
          <p className="mt-1 font-display text-2xl font-semibold text-brand-primary">{kitchen?.totals?.orders ?? 0}</p>
          <p className="text-[10.5px] text-brand-muted">{date ? formatDateOnly(date, 'dd MMM yyyy') : 'All upcoming'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Total meals</p>
          <p className="mt-1 font-display text-2xl font-semibold text-brand-primary">{kitchen?.totals?.meals ?? 0}</p>
          <p className="text-[10.5px] text-brand-muted">Aggregate across confirmed bulk orders</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Next deadline</p>
          <p className="mt-1 font-display text-lg font-semibold text-brand-primary">
            {kitchen?.orders?.[0]
              ? `${formatDateOnly(kitchen.orders[0].deliveryDate, 'dd MMM')} · ${kitchen.orders[0].deliveryTime}`
              : 'None scheduled'}
          </p>
          <p className="text-[10.5px] text-brand-muted">Earliest delivery in view</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.5fr]">
        <Card>
          <CardHeader title="Aggregate production" subtitle="Combined quantities to cook" />
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-10" />
                ))}
              </div>
            ) : kitchen?.aggregate?.length ? (
              <ul className="space-y-2.5">
                {kitchen.aggregate.map((row) => (
                  <li key={row.label}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-brand-text">{row.label}</span>
                      <span className="font-semibold text-brand-primary">{row.quantity}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-brand-soft">
                      <div
                        className="h-full rounded-full bg-brand-secondary"
                        style={{ width: `${Math.min(100, (row.quantity / Math.max(1, kitchen.totals.meals)) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-brand-background px-3 py-6 text-center text-[12px] text-brand-muted">
                No confirmed bulk orders to plan right now.
              </p>
            )}
            <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-brand-accent/10 px-2.5 py-2 text-[10.5px] leading-relaxed text-[#6f5a20]">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              Always confirm dietary requirements and headcount 24 hours before a bulk delivery.
            </p>
          </div>
        </Card>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-48" />)
          ) : kitchen?.orders?.length ? (
            kitchen.orders.map((order) => (
              <Card key={order.id}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-border px-4 py-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-semibold text-brand-primary">{order.organizationName}</p>
                      <Badge tone={STATUS_TONES[order.status] ?? 'muted'} dot>
                        {BULK_STATUS_LABELS[order.status] ?? order.status}
                      </Badge>
                    </div>
                    <p className="mt-1 font-mono text-[10.5px] text-brand-muted">{order.bulkOrderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-semibold text-brand-primary">{order.quantity} meals</p>
                    <p className="text-[10px] text-brand-muted">{money(order.total)}</p>
                  </div>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-[1.3fr_1fr]">
                  <div className="space-y-1.5 text-[11.5px]">
                    <p className="flex items-center gap-1.5 text-brand-text">
                      <Clock size={12} className="text-brand-secondary" />{' '}
                      {formatDateOnly(order.deliveryDate, 'EEE dd MMM')} · {order.deliveryTime}
                    </p>
                    <p className="flex items-start gap-1.5 text-brand-muted">
                      <Users size={12} className="mt-0.5 shrink-0" /> {order.contactPerson} · {order.phone}
                    </p>
                    <p className="flex items-start gap-1.5 text-brand-muted">
                      <Building2 size={12} className="mt-0.5 shrink-0" /> {order.deliveryAddress}
                    </p>
                    <p className="flex items-start gap-1.5 text-brand-muted">
                      <Layers size={12} className="mt-0.5 shrink-0" /> {order.packageName}
                    </p>
                    {order.dietaryRequirements ? (
                      <p className="rounded-md bg-[#FBF1DD] px-2 py-1 text-[10.5px] text-[#8a6118]">
                        Dietary: {order.dietaryRequirements}
                      </p>
                    ) : null}
                    {order.notes ? <p className="text-[10.5px] italic text-brand-muted">“{order.notes}”</p> : null}
                  </div>

                  <div className="flex flex-col justify-end gap-2">
                    {order.status === 'CONFIRMED' ? (
                      <Button onClick={() => statusMutation.mutate({ id: order.id, next: 'PREPARING' })} loading={statusMutation.isPending}>
                        <ChefHat size={14} /> Start production
                      </Button>
                    ) : null}
                    {order.status === 'PREPARING' ? (
                      <Button variant="gold" onClick={() => statusMutation.mutate({ id: order.id, next: 'READY' })} loading={statusMutation.isPending}>
                        <CheckCircle2 size={14} /> Mark ready
                      </Button>
                    ) : null}
                    {order.status === 'READY' ? (
                      <Button
                        variant="secondary"
                        onClick={() => statusMutation.mutate({ id: order.id, next: 'DISPATCHED' })}
                        loading={statusMutation.isPending}
                      >
                        Mark dispatched
                      </Button>
                    ) : null}
                    {order.status === 'DISPATCHED' ? (
                      <Button variant="secondary" onClick={() => setCompletedTarget(order)}>
                        Mark completed
                      </Button>
                    ) : null}
                    {['COMPLETED', 'CANCELLED'].includes(order.status) ? (
                      <p className="rounded-lg bg-brand-background px-3 py-2 text-center text-[11px] text-brand-muted">
                        Closed
                      </p>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="px-4 py-12 text-center">
              <p className="text-[13px] font-semibold text-brand-primary">No bulk orders in production</p>
              <p className="mt-1 text-[11.5px] text-brand-muted">
                Confirmed corporate orders appear here automatically after the shop converts a quotation.
              </p>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(completedTarget)}
        onClose={() => setCompletedTarget(null)}
        onConfirm={() => statusMutation.mutate({ id: completedTarget.id, next: 'COMPLETED' })}
        loading={statusMutation.isPending}
        title="Mark this bulk order completed?"
        description="This closes the production record and updates the shop and platform dashboards."
        confirmLabel="Mark completed"
      />

      <p className="mt-3 text-[11px] text-brand-muted">
        Demonstration interface · no printer or label integration. Quantities are aggregated from confirmed bulk
        order items only.
      </p>
    </div>
  );
}
