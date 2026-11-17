import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bike,
  CheckCircle2,
  Clock3,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  Route,
  Truck,
  UserRound,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader } from '../../layouts/PortalLayout.jsx';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  Skeleton,
  StatCard,
  Textarea,
} from '../../components/ui/primitives.jsx';
import { toast, toastError } from '../../stores/ui.js';
import { formatDate, money, pluralise } from '../../utils/format.js';

const STAGE = {
  ASSIGNED: { label: 'Awaiting rider', tone: 'warning' },
  ACCEPTED: { label: 'Rider accepted', tone: 'info' },
  PICKED_UP: { label: 'Picked up', tone: 'accent' },
  OUT_FOR_DELIVERY: { label: 'On the way', tone: 'accent' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
};

const ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'];

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export default function ShopDeliveries() {
  const queryClient = useQueryClient();
  const [assignTarget, setAssignTarget] = useState(null);
  const [selectedRider, setSelectedRider] = useState('');
  const [otpTarget, setOtpTarget] = useState(null);
  const [otp, setOtp] = useState('');
  const [failTarget, setFailTarget] = useState(null);
  const [failReason, setFailReason] = useState('');

  const assignmentsQuery = useQuery({ queryKey: ['shop-deliveries'], queryFn: () => api('/delivery/assignments') });
  const ridersQuery = useQuery({ queryKey: ['shop-riders'], queryFn: () => api('/shop/riders') });
  const readyQuery = useQuery({ queryKey: ['shop-ready-orders'], queryFn: () => api('/orders?status=READY_FOR_PICKUP&pageSize=50') });

  const assignments = assignmentsQuery.data?.data ?? [];
  const riders = ridersQuery.data?.data ?? [];
  const readyOrders = readyQuery.data?.data ?? [];

  const queued = useMemo(() => readyOrders.filter((order) => !order.rider && !order.assignment), [readyOrders]);
  const active = useMemo(() => assignments.filter((entry) => ACTIVE_STATUSES.includes(entry.status)), [assignments]);
  const completed = useMemo(
    () => assignments.filter((entry) => entry.status === 'DELIVERED' && isToday(entry.deliveredAt)),
    [assignments],
  );
  const failed = useMemo(
    () => assignments.filter((entry) => entry.status === 'FAILED' && isToday(entry.updatedAt)),
    [assignments],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['shop-deliveries'] });
    queryClient.invalidateQueries({ queryKey: ['shop-ready-orders'] });
    queryClient.invalidateQueries({ queryKey: ['shop-riders'] });
    queryClient.invalidateQueries({ queryKey: ['shop-orders'] });
    queryClient.invalidateQueries({ queryKey: ['platform-orders'] });
  };

  const action = useMutation({
    mutationFn: ({ path, body }) => api(path, { method: 'POST', body }),
    onSuccess: () => invalidate(),
    onError: (error) => toastError(error, 'Could not update this delivery'),
  });

  const assignMutation = useMutation({
    mutationFn: () => api(`/orders/${assignTarget.id}/assign-rider`, { method: 'POST', body: { riderId: selectedRider } }),
    onSuccess: (payload) => {
      toast({
        title: `${payload.data.orderNumber ?? 'Order'} assigned`,
        message: 'The rider sees it in their rider app with a demo confirmation code.',
        tone: 'success',
      });
      setAssignTarget(null);
      setSelectedRider('');
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not assign the rider'),
  });

  const deliverMutation = useMutation({
    mutationFn: () => api(`/delivery/assignments/${otpTarget.id}/deliver`, { method: 'POST', body: { otp } }),
    onSuccess: () => {
      toast({ title: 'Delivery confirmed', message: 'Order marked delivered and payment recorded.', tone: 'success' });
      setOtpTarget(null);
      setOtp('');
      invalidate();
    },
    onError: (error) => toastError(error, 'That confirmation code did not match'),
  });

  const failMutation = useMutation({
    mutationFn: () => api(`/delivery/assignments/${failTarget.id}/fail`, { method: 'POST', body: { reason: failReason } }),
    onSuccess: () => {
      toast({ title: 'Delivery marked failed', message: 'The order is flagged for the shop to follow up.', tone: 'info' });
      setFailTarget(null);
      setFailReason('');
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not update the delivery'),
  });

  const loading = assignmentsQuery.isLoading || ridersQuery.isLoading || readyQuery.isLoading;

  const advance = (entry) => {
    if (['ASSIGNED', 'ACCEPTED'].includes(entry.status)) {
      action.mutate({ path: `/delivery/assignments/${entry.id}/pickup` });
      return;
    }
    if (entry.status === 'PICKED_UP') {
      action.mutate({ path: `/delivery/assignments/${entry.id}/out-for-delivery` });
    }
  };

  const nextLabel = (entry) => {
    if (['ASSIGNED', 'ACCEPTED'].includes(entry.status)) return 'Record pickup';
    if (entry.status === 'PICKED_UP') return 'Mark out for delivery';
    return null;
  };

  return (
    <div>
      <PageHeader
        eyebrow="Delivery"
        title="Delivery management"
        description="Dispatch ready orders, track riders on the road and close deliveries with the customer's demo code."
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={RefreshCw}
            loading={assignmentsQuery.isFetching}
            onClick={() => {
              assignmentsQuery.refetch();
              readyQuery.refetch();
              ridersQuery.refetch();
            }}
          >
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Ready to dispatch" value={queued.length} icon={PackageCheck} hint="No rider yet" tone="gold" />
        <StatCard label="Active" value={active.length} icon={Truck} hint="Assigned to a rider" />
        <StatCard label="On the road" value={active.filter((entry) => ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(entry.status)).length} icon={Route} hint="Picked up or out" />
        <StatCard label="Delivered today" value={completed.length} icon={CheckCircle2} hint="Closed with a demo code" />
        <StatCard label="Failed today" value={failed.length} icon={XCircle} hint="Needs a follow-up" />
      </div>

      <Card className="mt-4">
        <CardHeader title="Rider capacity" subtitle="Live workload from the rider app" />
        <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {riders.map((rider) => (
            <div key={rider.id} className="flex items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-background/50 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/5 text-brand-secondary">
                  <Bike size={15} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-brand-text">{rider.name}</p>
                  <p className="truncate text-[10.5px] text-brand-muted">
                    {rider.vehicleType ?? 'Bike'} · {rider.phone}
                  </p>
                </div>
              </div>
              <Badge tone={rider.activeDeliveries > 0 ? 'warning' : 'success'} className="shrink-0">
                {rider.activeDeliveries} active
              </Badge>
            </div>
          ))}
          {!riders.length && !loading ? (
            <p className="text-[11.5px] text-brand-muted">No riders are linked to this shop yet.</p>
          ) : null}
        </div>
      </Card>

      {loading ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Ready for dispatch" subtitle="Kitchen has packed these orders" action={<Badge tone="gold">{queued.length}</Badge>} />
            <div className="space-y-2.5 p-4">
              {queued.map((order) => (
                <div key={order.id} className="rounded-xl border border-brand-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[11.5px] font-semibold text-brand-primary">{order.orderNumber}</p>
                      <p className="text-[10.5px] text-brand-muted">
                        {order.delivery?.name} · {pluralise(order.itemCount, 'item')} · {money(order.total)}
                      </p>
                    </div>
                    <Badge tone="accent">Ready</Badge>
                  </div>
                  <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-brand-muted">
                    <MapPin size={11} className="mt-0.5 shrink-0" />
                    {[order.delivery?.line1, order.delivery?.line2, order.delivery?.city, order.delivery?.pincode].filter(Boolean).join(', ')}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      leftIcon={UserRound}
                      onClick={() => {
                        setAssignTarget(order);
                        setSelectedRider(riders[0]?.id ?? '');
                      }}
                    >
                      Assign rider
                    </Button>
                  </div>
                </div>
              ))}
              {!queued.length ? (
                <EmptyState
                  icon={PackageCheck}
                  title="Nothing waiting"
                  description="Orders appear here once the kitchen marks them ready for pickup."
                  className="border-0 py-8"
                />
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="On the road" subtitle="Assigned, picked up and out for delivery" action={<Badge tone="info">{active.length}</Badge>} />
            <div className="space-y-2.5 p-4">
              {active.map((entry) => {
                const stage = STAGE[entry.status] ?? { label: entry.status, tone: 'muted' };
                const label = entry.kind === 'BULK' ? entry.bulkOrder?.bulkOrderNumber : entry.order?.orderNumber;
                const customer = entry.kind === 'BULK' ? entry.bulkOrder?.organizationName : entry.order?.delivery?.name;
                const phone = entry.kind === 'BULK' ? entry.bulkOrder?.phone : entry.order?.delivery?.phone;
                const address =
                  entry.kind === 'BULK'
                    ? entry.bulkOrder?.deliveryAddress
                    : [entry.order?.delivery?.line1, entry.order?.delivery?.city, entry.order?.delivery?.pincode].filter(Boolean).join(', ');
                const total = entry.kind === 'BULK' ? entry.bulkOrder?.total : entry.order?.total;
                const next = nextLabel(entry);

                return (
                  <div key={entry.id} className="rounded-xl border border-brand-border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-[11.5px] font-semibold text-brand-primary">{label}</p>
                        <p className="text-[10.5px] text-brand-muted">
                          {entry.rider?.name} · {money(total)} · code {entry.otpCode}
                        </p>
                      </div>
                      <Badge tone={stage.tone} dot>
                        {stage.label}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-[11.5px] font-medium text-brand-text">{customer}</p>
                    <p className="text-[10.5px] text-brand-muted">{address}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-brand-muted">
                      <Phone size={10} /> {phone}
                    </p>

                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {next ? (
                        <Button size="sm" variant="secondary" onClick={() => advance(entry)} loading={action.isPending}>
                          {next}
                        </Button>
                      ) : null}
                      {['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(entry.status) ? (
                        <Button
                          size="sm"
                          leftIcon={CheckCircle2}
                          onClick={() => {
                            setOtpTarget(entry);
                            setOtp('');
                          }}
                        >
                          Complete
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-brand-danger hover:bg-[#FBEAE5]"
                        onClick={() => {
                          setFailTarget(entry);
                          setFailReason('');
                        }}
                      >
                        Report failed
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!active.length ? (
                <EmptyState icon={Truck} title="No active deliveries" description="Assign a rider to a ready order to start the drop." className="border-0 py-8" />
              ) : null}
            </div>
          </Card>
        </div>
      )}

      {(completed.length > 0 || failed.length > 0) && (
        <Card className="mt-4">
          <CardHeader title="Closed today" subtitle="Delivered and failed drops from this demo day" />
          <div className="divide-y divide-brand-border">
            {[...completed, ...failed].map((entry) => {
              const stage = STAGE[entry.status];
              const label = entry.kind === 'BULK' ? entry.bulkOrder?.bulkOrderNumber : entry.order?.orderNumber;
              return (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Clock3 size={13} className="shrink-0 text-brand-muted" />
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-brand-text">{label}</p>
                      <p className="text-[10.5px] text-brand-muted">
                        {entry.rider?.name} · {formatDate(entry.deliveredAt ?? entry.updatedAt, 'h:mm a')}
                      </p>
                    </div>
                  </div>
                  <Badge tone={stage?.tone ?? 'muted'}>{stage?.label ?? entry.status}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <p className="mt-3 rounded-xl border border-brand-accent/30 bg-brand-accent/10 px-3 py-2 text-[11px] leading-relaxed text-[#6f5a20]">
        Riders confirm each drop with a 4 digit demo code — the shop can see it here, but no SMS or OTP service is used.
        Delivery actions update the same order records the customer sees on the tracking page.
      </p>

      <Modal
        open={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        title={`Assign a rider to ${assignTarget?.orderNumber ?? 'order'}`}
        subtitle="Riders receive the delivery in their app with a demo code."
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setAssignTarget(null)}>
              Cancel
            </Button>
            <Button leftIcon={Bike} loading={assignMutation.isPending} disabled={!selectedRider} onClick={() => assignMutation.mutate()}>
              Assign rider
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          {riders.map((rider) => (
            <button
              key={rider.id}
              type="button"
              onClick={() => setSelectedRider(rider.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                selectedRider === rider.id
                  ? 'border-brand-secondary bg-brand-secondary/8'
                  : 'border-brand-border hover:border-brand-secondary/40'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-brand-text">{rider.name}</p>
                <p className="truncate text-[10.5px] text-brand-muted">
                  {rider.vehicleType ?? 'Bike'} · {rider.phone}
                </p>
              </div>
              <Badge tone={rider.activeDeliveries > 0 ? 'warning' : 'success'} className="shrink-0">
                {rider.activeDeliveries} active
              </Badge>
            </button>
          ))}
          {!riders.length ? <p className="text-[12px] text-brand-muted">No riders are linked to this shop.</p> : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(otpTarget)}
        onClose={() => setOtpTarget(null)}
        title="Confirm delivery"
        subtitle="Ask the customer for the demo code shown on the rider card."
        size="sm"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setOtpTarget(null)}>
              Cancel
            </Button>
            <Button loading={deliverMutation.isPending} onClick={() => deliverMutation.mutate()}>
              Confirm delivery
            </Button>
          </div>
        }
      >
        <Field label="4 digit confirmation code" required hint="Generated when the delivery was assigned.">
          <Input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="1234" inputMode="numeric" />
        </Field>
        <p className="mt-3 rounded-lg bg-brand-background px-3 py-2 text-[11px] text-brand-muted">
          Demo code: <span className="font-mono font-semibold text-brand-primary">{otpTarget?.otpCode}</span>
        </p>
      </Modal>

      <Modal
        open={Boolean(failTarget)}
        onClose={() => setFailTarget(null)}
        title="Report a failed delivery"
        subtitle="The order is flagged so the shop can call the customer and retry."
        size="sm"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setFailTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={failMutation.isPending} disabled={failReason.trim().length < 3} onClick={() => failMutation.mutate()}>
              Mark failed
            </Button>
          </div>
        }
      >
        <Field label="What happened?" required>
          <Textarea value={failReason} onChange={(event) => setFailReason(event.target.value)} placeholder="Customer unreachable, wrong address…" rows={3} />
        </Field>
      </Modal>
    </div>
  );
}
