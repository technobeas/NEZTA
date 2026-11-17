import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bike,
  CheckCircle2,
  ChefHat,
  Filter,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader } from '../../layouts/PortalLayout.jsx';
import { OrdersTable } from '../../components/orders/OrdersTable.jsx';
import { OrderDetailModal } from '../../components/orders/OrderDetailModal.jsx';
import { Badge, Button, Card, Input, Modal, Select, Tabs } from '../../components/ui/primitives.jsx';
import { toast, toastError } from '../../stores/ui.js';
import { localDateString, money } from '../../utils/format.js';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'NEW', label: 'New' },
  { value: 'CONFIRMED,PREPARING,READY_FOR_PICKUP', label: 'In kitchen' },
  { value: 'RIDER_ASSIGNED,PICKED_UP,OUT_FOR_DELIVERY', label: 'On the way' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED,REJECTED,DELIVERY_FAILED', label: 'Closed' },
];

export default function ShopOrders() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(searchParams.get('status') ?? 'ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [date, setDate] = useState('');
  const [selected, setSelected] = useState(null);
  const [riderModalOpen, setRiderModalOpen] = useState(false);
  const [riderId, setRiderId] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['orders', { scope: 'shop', status, search: debouncedSearch, date }],
    queryFn: () =>
      api('/orders', {
        query: {
          status: status === 'ALL' ? undefined : status,
          search: debouncedSearch || undefined,
          date: date || undefined,
          pageSize: 100,
        },
      }),
    refetchInterval: 20000,
  });

  const riders = useQuery({ queryKey: ['riders'], queryFn: () => api('/shop/riders') });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['shop-overview'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ orderId, next, note }) =>
      api(`/orders/${orderId}/status`, { method: 'POST', body: { status: next, note } }),
    onSuccess: (payload, variables) => {
      toast({
        title: `Order ${payload.data.orderNumber} updated`,
        message: variables.next.replace(/_/g, ' ').toLowerCase(),
        tone: 'success',
      });
      setSelected(payload.data);
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not update the order'),
    onSettled: () => setPendingAction(null),
  });

  const assignMutation = useMutation({
    mutationFn: () => api(`/orders/${selected.id}/assign-rider`, { method: 'POST', body: { riderId } }),
    onSuccess: (payload) => {
      toast({ title: 'Rider assigned', message: `${payload.data.rider?.name} will collect this order.`, tone: 'success' });
      setSelected(payload.data);
      setRiderModalOpen(false);
      setRiderId('');
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not assign the rider'),
  });

  const orders = data?.data ?? [];
  const orderStats = useMemo(() => {
    return {
      new: orders.filter((order) => order.status === 'NEW').length,
      active: orders.filter((order) =>
        ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(
          order.status,
        ),
      ).length,
    };
  }, [orders]);

  function runStatus(next, note) {
    if (!selected) return;
    setPendingAction(next);
    statusMutation.mutate({ orderId: selected.id, next, note });
  }

  const actions = selected ? (
    <>
      {selected.status === 'NEW' ? (
        <>
          <Button size="sm" variant="secondary" onClick={() => runStatus('REJECTED', 'Rejected by the shop')} loading={pendingAction === 'REJECTED'}>
            <XCircle size={13} /> Reject
          </Button>
          <Button size="sm" onClick={() => runStatus('CONFIRMED')} loading={pendingAction === 'CONFIRMED'}>
            <CheckCircle2 size={13} /> Accept order
          </Button>
        </>
      ) : null}
      {selected.status === 'CONFIRMED' ? (
        <Button size="sm" onClick={() => runStatus('PREPARING', 'Kitchen started preparation')} loading={pendingAction === 'PREPARING'}>
          <ChefHat size={13} /> Start preparing
        </Button>
      ) : null}
      {selected.status === 'PREPARING' ? (
        <Button size="sm" onClick={() => runStatus('READY_FOR_PICKUP', 'Packed and ready for pickup')} loading={pendingAction === 'READY_FOR_PICKUP'}>
          <CheckCircle2 size={13} /> Mark ready for pickup
        </Button>
      ) : null}
      {['READY_FOR_PICKUP', 'CONFIRMED', 'PREPARING'].includes(selected.status) ? (
        <Button size="sm" variant="secondary" onClick={() => setRiderModalOpen(true)}>
          <Bike size={13} /> Assign rider
        </Button>
      ) : null}
      {['NEW', 'CONFIRMED'].includes(selected.status) ? (
        <Button size="sm" variant="ghost" className="text-brand-danger hover:bg-[#FBEAE5]" onClick={() => runStatus('CANCELLED', 'Cancelled by the shop')} loading={pendingAction === 'CANCELLED'}>
          Cancel
        </Button>
      ) : null}
      {selected.status === 'RIDER_ASSIGNED' ? (
        <Badge tone="info">Rider is collecting the order</Badge>
      ) : null}
      {selected.status === 'OUT_FOR_DELIVERY' ? <Badge tone="accent">Rider is on the way</Badge> : null}
      {selected.status === 'DELIVERED' ? <Badge tone="success">Completed</Badge> : null}
    </>
  ) : null;

  return (
    <div>
      <PageHeader
        title="Order management"
        description="Accept orders, move them through preparation, assign riders and keep the customer timeline in sync."
        actions={
          <Button variant="secondary" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw size={15} /> Refresh
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          ['Awaiting acceptance', orderStats.new, 'New orders need a decision'],
          ['In progress', orderStats.active, 'Confirmed through delivery'],
          ['Total in view', orders.length, 'Matching current filters'],
        ].map(([label, value, hint]) => (
          <Card key={label} className="px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-brand-primary">{value}</p>
            <p className="text-[10.5px] text-brand-muted">{hint}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-brand-border p-4">
          <Tabs options={STATUS_FILTERS} value={status} onChange={setStatus} className="w-fit max-w-full" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order number, customer name or phone"
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full sm:w-40"
                aria-label="Filter by date"
              />
              {date ? (
                <Button variant="secondary" onClick={() => setDate('')}>
                  Clear
                </Button>
              ) : null}
              <div className="hidden items-center gap-1.5 rounded-lg border border-brand-border px-2.5 text-[11px] text-brand-muted sm:flex">
                <Filter size={12} /> filtered
              </div>
            </div>
          </div>
        </div>

        <OrdersTable orders={orders} loading={isLoading} onSelect={setSelected} />
      </Card>

      <p className="mt-3 text-[11px] text-brand-muted">
        Auto-refreshes every 20 seconds · statuses are validated server-side against the order workflow.
      </p>

      <OrderDetailModal
        order={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        actions={actions}
        footerNote={`Order actions update PostgreSQL immediately · ${selected ? money(selected.total) : ''}`}
      />

      <Modal
        open={riderModalOpen}
        onClose={() => setRiderModalOpen(false)}
        title="Assign a rider"
        subtitle={selected ? `Order ${selected.orderNumber}` : ''}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRiderModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => assignMutation.mutate()} loading={assignMutation.isPending} disabled={!riderId}>
              Assign rider
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          {(riders.data?.data ?? []).map((rider) => (
            <button
              key={rider.id}
              type="button"
              onClick={() => setRiderId(rider.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                riderId === rider.id
                  ? 'border-brand-secondary bg-brand-secondary/5'
                  : 'border-brand-border hover:border-brand-secondary/40'
              }`}
            >
              <div>
                <p className="text-[13px] font-semibold text-brand-text">{rider.name}</p>
                <p className="text-[11px] text-brand-muted">
                  {rider.vehicleType} · {rider.phone}
                </p>
              </div>
              <div className="text-right">
                <Badge tone={rider.isAvailable ? 'success' : 'muted'}>
                  {rider.isAvailable ? 'Available' : 'Busy'}
                </Badge>
                <p className="mt-1 text-[10px] text-brand-muted">{rider.activeDeliveries} active</p>
              </div>
            </button>
          ))}
          <p className="rounded-lg bg-brand-background px-3 py-2 text-[10.5px] text-brand-muted">
            The rider receives this delivery in their rider app with a demo confirmation code.
          </p>
        </div>
      </Modal>
    </div>
  );
}
