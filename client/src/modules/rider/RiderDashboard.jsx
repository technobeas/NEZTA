import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bike,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader } from '../../layouts/PortalLayout.jsx';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Skeleton,
  Tabs,
  Textarea,
} from '../../components/ui/primitives.jsx';
import { toast, toastError } from '../../stores/ui.js';
import { DELIVERY_STATUS_LABELS, SOURCE_LABELS } from '../../utils/constants.js';
import { cn, formatDate, formatDateOnly, formatTime, money } from '../../utils/format.js';

const ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'];

export default function RiderDashboard({ historyOnly = false }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(historyOnly ? 'completed' : 'active');
  const [otpTarget, setOtpTarget] = useState(null);
  const [otp, setOtp] = useState('');
  const [failTarget, setFailTarget] = useState(null);
  const [failureReason, setFailureReason] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['delivery-assignments'],
    queryFn: () => api('/delivery/assignments'),
    refetchInterval: 15000,
  });
  const summary = useQuery({ queryKey: ['rider-summary'], queryFn: () => api('/delivery/summary') });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['delivery-assignments'] });
    queryClient.invalidateQueries({ queryKey: ['rider-summary'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const action = useMutation({
    mutationFn: ({ id, name, body }) => api(`/delivery/assignments/${id}/${name}`, { method: 'POST', body }),
    onSuccess: (_payload, variables) => {
      const labels = {
        accept: 'Delivery accepted — head to the kitchen for pickup.',
        pickup: 'Marked picked up. Follow the route to the customer.',
        'out-for-delivery': 'Marked out for delivery.',
        deliver: 'Delivery confirmed. Payment status updated.',
        fail: 'Delivery reported as failed.',
      };
      toast({ title: 'Delivery updated', message: labels[variables.name], tone: 'success' });
      setOtpTarget(null);
      setFailTarget(null);
      setOtp('');
      setFailureReason('');
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not update this delivery'),
  });

  const assignments = data?.data ?? [];
  const active = assignments.filter((row) => ACTIVE_STATUSES.includes(row.status));
  const completed = assignments.filter((row) => !ACTIVE_STATUSES.includes(row.status));
  const visible = tab === 'active' ? active : tab === 'assigned' ? assignments.filter((row) => row.status === 'ASSIGNED') : completed;

  const stats = summary.data?.data;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Rider app"
        title={historyOnly ? 'Delivery history' : 'My deliveries'}
        description="Accept assignments, pick up from the NEZTA kitchen and confirm each drop with the customer's demo code."
        actions={
          <Button variant="secondary" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw size={15} /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ['Assigned', stats?.assigned ?? 0, Bike],
          ['Active', stats?.active ?? 0, Truck],
          ['Delivered today', stats?.completedToday ?? 0, CheckCircle2],
          ['Failed today', stats?.failedToday ?? 0, XCircle],
        ].map(([label, value, Icon]) => (
          <Card key={label} className="p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[9.5px] font-semibold uppercase tracking-widest text-brand-muted">{label}</p>
              <Icon size={14} className="text-brand-secondary/50" />
            </div>
            <p className="mt-1 font-display text-xl font-semibold text-brand-primary">{value}</p>
          </Card>
        ))}
      </div>

      {stats?.rider ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-brand-primary px-4 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-brand-accent">
              <Bike size={16} />
            </span>
            <div>
              <p className="text-[12.5px] font-semibold">{stats.rider.name}</p>
              <p className="text-[10px] text-white/50">{stats.rider.vehicleType}</p>
            </div>
          </div>
          <Badge tone="gold">Demo rider</Badge>
        </div>
      ) : null}

      <Tabs
        className="mt-4 w-fit"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'active', label: 'Active', count: active.length },
          { value: 'assigned', label: 'New', count: assignments.filter((row) => row.status === 'ASSIGNED').length },
          { value: 'completed', label: 'Completed', count: completed.length },
        ]}
      />

      <div className="mt-3 space-y-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-52" />)
        ) : visible.length === 0 ? (
          <Card className="px-4 py-12 text-center">
            <Package size={22} className="mx-auto text-brand-muted/50" />
            <p className="mt-2 text-[13px] font-semibold text-brand-primary">Nothing here right now</p>
            <p className="mt-1 text-[11.5px] text-brand-muted">
              Assignments appear as soon as the shop assigns you a delivery.
            </p>
          </Card>
        ) : (
          visible.map((assignment) => {
            const order = assignment.order;
            const bulk = assignment.bulkOrder;
            const isBulk = Boolean(bulk);
            return (
              <Card key={assignment.id} className="overflow-hidden">
                <div
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-2 px-4 py-2.5',
                    assignment.status === 'DELIVERED'
                      ? 'bg-brand-secondary/8'
                      : assignment.status === 'FAILED'
                        ? 'bg-[#FBEAE5]'
                        : 'bg-brand-background',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge tone={assignment.status === 'DELIVERED' ? 'success' : assignment.status === 'FAILED' ? 'danger' : 'gold'} dot>
                      {DELIVERY_STATUS_LABELS[assignment.status] ?? assignment.status}
                    </Badge>
                    <span className="text-[10.5px] font-medium text-brand-muted">
                      {isBulk ? `${bulk.packageName} · ${bulk.quantity} meals` : SOURCE_LABELS[order?.source]}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] font-semibold text-brand-primary">
                    {isBulk ? bulk.bulkOrderNumber : order?.orderNumber}
                  </p>
                </div>

                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-brand-text">
                        {isBulk ? bulk.organizationName : order?.delivery?.name}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-brand-muted">
                        <Phone size={11} /> {isBulk ? bulk.contactPerson : order?.delivery?.name}
                        {order?.delivery?.phone ? ` · ${order.delivery.phone}` : ''}
                      </p>
                      <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] text-brand-muted">
                        <MapPin size={12} className="mt-0.5 shrink-0" />
                        {isBulk
                          ? bulk.deliveryAddress
                          : `${order?.delivery?.line1}${order?.delivery?.line2 ? `, ${order.delivery.line2}` : ''}, ${order?.delivery?.city} ${order?.delivery?.pincode}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-brand-muted">
                        {isBulk ? 'Bulk value' : 'Collect'}
                      </p>
                      <p className="font-display text-xl font-semibold text-brand-primary">
                        {money(isBulk ? bulk.total : order?.total)}
                      </p>
                      <p className="text-[10px] text-brand-muted">
                        {isBulk || order?.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on delivery' : 'UPI on delivery'}
                      </p>
                    </div>
                  </div>

                  {!isBulk && order?.items?.length ? (
                    <div className="mt-3 rounded-xl bg-brand-background px-3 py-2.5">
                      <p className="text-[9.5px] font-semibold uppercase tracking-widest text-brand-muted">Pickup from kitchen</p>
                      <ul className="mt-1 space-y-0.5">
                        {order.items.map((item) => (
                          <li key={item.id} className="text-[11px] text-brand-text">
                            {item.quantity} × {item.name}
                            {item.itemType === 'MEAL_BOX' ? ' (meal box)' : ''}
                          </li>
                        ))}
                      </ul>
                      {order.delivery?.instructions ? (
                        <p className="mt-1.5 text-[10.5px] italic text-[#8a6118]">
                          Customer note: {order.delivery.instructions}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {isBulk ? (
                    <div className="mt-3 rounded-xl bg-brand-background px-3 py-2.5 text-[11px] text-brand-muted">
                      <p className="flex items-center gap-1.5">
                        <Building2 size={11} /> Drop at {formatDateOnly(bulk.deliveryDate, 'dd MMM')} ·{' '}
                        {bulk.deliveryTime}
                      </p>
                      {bulk.notes ? <p className="mt-1 text-[10.5px] italic">“{bulk.notes}”</p> : null}
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10.5px] text-brand-muted">
                    {!isBulk && order?.scheduledFor ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} /> {formatDate(order.scheduledFor, 'dd MMM')} · {formatTime(order.scheduledFor)}
                      </span>
                    ) : null}
                    {assignment.otpCode && ACTIVE_STATUSES.includes(assignment.status) ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand-accent/15 px-2 py-0.5 font-medium text-[#6f5a20]">
                        <ShieldCheck size={11} /> Demo code {assignment.otpCode}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-brand-border pt-3">
                    {assignment.status === 'ASSIGNED' ? (
                      <Button className="flex-1" onClick={() => action.mutate({ id: assignment.id, name: 'accept' })} loading={action.isPending}>
                        <CheckCircle2 size={14} /> Accept delivery
                      </Button>
                    ) : null}
                    {assignment.status === 'ACCEPTED' ? (
                      <Button className="flex-1" onClick={() => action.mutate({ id: assignment.id, name: 'pickup' })} loading={action.isPending}>
                        <Package size={14} /> Mark picked up
                      </Button>
                    ) : null}
                    {assignment.status === 'PICKED_UP' ? (
                      <Button className="flex-1" onClick={() => action.mutate({ id: assignment.id, name: 'out-for-delivery' })} loading={action.isPending}>
                        <Truck size={14} /> Out for delivery
                      </Button>
                    ) : null}
                    {assignment.status === 'OUT_FOR_DELIVERY' ? (
                      <Button className="flex-1" onClick={() => setOtpTarget(assignment)}>
                        <ShieldCheck size={14} /> Complete delivery
                      </Button>
                    ) : null}
                    {ACTIVE_STATUSES.includes(assignment.status) ? (
                      <Button variant="ghost" className="text-brand-danger hover:bg-[#FBEAE5]" onClick={() => setFailTarget(assignment)}>
                        Report failed
                      </Button>
                    ) : null}
                    {assignment.status === 'DELIVERED' ? (
                      <p className="text-[11px] text-brand-secondary">
                        Delivered {formatDate(assignment.deliveredAt, 'dd MMM, h:mm a')}
                      </p>
                    ) : null}
                    {assignment.status === 'FAILED' ? (
                      <p className="text-[11px] text-brand-danger">Failed: {assignment.failureReason}</p>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Modal
        open={Boolean(otpTarget)}
        onClose={() => setOtpTarget(null)}
        title="Confirm delivery"
        subtitle="Ask the customer for the 4 digit demo confirmation code."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOtpTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => action.mutate({ id: otpTarget.id, name: 'deliver', body: { otp } })}
              loading={action.isPending}
              disabled={otp.length < 4}
            >
              <ShieldCheck size={14} /> Confirm delivery
            </Button>
          </div>
        }
      >
        <Field label="Delivery confirmation code" required>
          <Input
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="4 digit code"
            inputMode="numeric"
            className="text-center text-xl font-semibold tracking-[0.4em]"
          />
        </Field>
        <p className="mt-2 rounded-lg bg-brand-background px-3 py-2 text-[11px] leading-relaxed text-brand-muted">
          Demo only: the code is generated when the shop assigns the order. No SMS is sent.
        </p>
      </Modal>

      <Modal
        open={Boolean(failTarget)}
        onClose={() => setFailTarget(null)}
        title="Report a failed delivery"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFailTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={failureReason.trim().length < 3}
              loading={action.isPending}
              onClick={() => action.mutate({ id: failTarget.id, name: 'fail', body: { reason: failureReason } })}
            >
              Report failure
            </Button>
          </div>
        }
      >
        <Field label="What happened?" required>
          <Textarea
            rows={3}
            value={failureReason}
            onChange={(event) => setFailureReason(event.target.value)}
            placeholder="Customer not reachable, wrong address, gate locked…"
          />
        </Field>
      </Modal>

      <p className="mt-4 text-[10.5px] leading-relaxed text-brand-muted">
        Demonstration rider interface. There is no background GPS, no live map and no real payment collection.
        Delivery actions update the same order records used by the shop, kitchen and customer.
      </p>
    </div>
  );
}
