import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  FileText,
  Phone,
  Search,
  Send,
  Truck,
  Users,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader } from '../../layouts/PortalLayout.jsx';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  Select,
  Skeleton,
  Tabs,
  Textarea,
} from '../../components/ui/primitives.jsx';
import { toast, toastError } from '../../stores/ui.js';
import { BULK_STATUS_LABELS } from '../../utils/constants.js';
import { formatDate, formatDateOnly, money } from '../../utils/format.js';

const ENQUIRY_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'ENQUIRY_RECEIVED', label: 'New' },
  { value: 'QUOTATION_SENT', label: 'Quote sent' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Closed' },
];

const STATUS_TONES = {
  ENQUIRY_RECEIVED: 'muted',
  QUOTATION_SENT: 'gold',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'muted',
  CONFIRMED: 'success',
  PREPARING: 'warning',
  READY: 'accent',
  DISPATCHED: 'info',
  COMPLETED: 'success',
};

const BULK_ACTIONS = {
  CONFIRMED: { next: 'PREPARING', label: 'Start preparing', icon: ChefHat },
  PREPARING: { next: 'READY', label: 'Mark ready', icon: CheckCircle2 },
  READY: { next: 'DISPATCHED', label: 'Mark dispatched', icon: Truck },
  DISPATCHED: { next: 'COMPLETED', label: 'Mark completed', icon: CheckCircle2 },
};

export default function ShopBulk() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('enquiries');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [riderTarget, setRiderTarget] = useState(null);
  const [riderId, setRiderId] = useState('');

  const enquiries = useQuery({
    queryKey: ['bulk-enquiries', { status, search }],
    queryFn: () =>
      api('/bulk-enquiries', {
        query: { status: status === 'ALL' ? undefined : status, search: search || undefined },
      }),
    enabled: tab === 'enquiries',
  });
  const bulkOrders = useQuery({
    queryKey: ['bulk-orders'],
    queryFn: () => api('/bulk-orders'),
    enabled: tab === 'orders',
  });
  const riders = useQuery({ queryKey: ['riders'], queryFn: () => api('/shop/riders') });
  const packages = useQuery({ queryKey: ['bulk-packages', 'all'], queryFn: () => api('/bulk-packages?all=true') });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['bulk-enquiries'] });
    queryClient.invalidateQueries({ queryKey: ['bulk-orders'] });
    queryClient.invalidateQueries({ queryKey: ['kitchen-bulk'] });
    queryClient.invalidateQueries({ queryKey: ['shop-overview'] });
  };

  const quoteMutation = useMutation({
    mutationFn: ({ enquiryId, body }) => api(`/bulk-enquiries/${enquiryId}/quotations`, { method: 'POST', body }),
    onSuccess: (payload) => {
      toast({ title: 'Quotation sent', message: `${payload.data.quotationNumber} · ${money(payload.data.total)}`, tone: 'success' });
      invalidate();
      enquiries.refetch().then((result) => {
        const updated = result.data?.data?.find((row) => row.id === selectedEnquiry?.id);
        if (updated) setSelectedEnquiry(updated);
      });
    },
    onError: (error) => toastError(error, 'Could not send the quotation'),
  });

  const acceptMutation = useMutation({
    mutationFn: (quotationId) => api(`/bulk-quotations/${quotationId}/accept`, { method: 'POST' }),
    onSuccess: () => {
      toast({ title: 'Quotation marked accepted', message: 'You can now confirm the bulk order.', tone: 'success' });
      invalidate();
      enquiries.refetch().then((result) => {
        const updated = result.data?.data?.find((row) => row.id === selectedEnquiry?.id);
        if (updated) setSelectedEnquiry(updated);
      });
    },
    onError: (error) => toastError(error, 'Could not accept the quotation'),
  });

  const convertMutation = useMutation({
    mutationFn: (quotationId) => api(`/bulk-quotations/${quotationId}/convert`, { method: 'POST' }),
    onSuccess: (payload) => {
      toast({
        title: 'Bulk order confirmed',
        message: `${payload.data.bulkOrderNumber} · ${payload.data.quantity} meals for ${formatDateOnly(payload.data.deliveryDate, 'dd MMM')}`,
        tone: 'success',
      });
      setSelectedEnquiry(null);
      setTab('orders');
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not confirm the bulk order'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => api(`/bulk-enquiries/${id}/reject`, { method: 'POST' }),
    onSuccess: () => {
      toast({ title: 'Enquiry rejected', tone: 'info' });
      setRejectTarget(null);
      setSelectedEnquiry(null);
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not reject the enquiry'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }) => api(`/bulk-orders/${id}/status`, { method: 'PATCH', body: { status: next } }),
    onSuccess: (payload) => {
      toast({ title: `Bulk order ${payload.data.bulkOrderNumber} updated`, message: payload.data.status, tone: 'success' });
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not update the bulk order'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, riderId: chosen }) => api(`/bulk-orders/${id}/assign-rider`, { method: 'POST', body: { riderId: chosen } }),
    onSuccess: () => {
      toast({ title: 'Rider assigned to bulk delivery', tone: 'success' });
      setRiderTarget(null);
      setRiderId('');
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not assign the rider'),
  });

  const enquiryRows = enquiries.data?.data ?? [];
  const orderRows = bulkOrders.data?.data ?? [];

  const stats = useMemo(
    () => ({
      pending: enquiryRows.filter((row) => ['ENQUIRY_RECEIVED', 'QUOTATION_SENT'].includes(row.status)).length,
      confirmed: orderRows.filter((row) => !['COMPLETED', 'CANCELLED'].includes(row.status)).length,
      meals: orderRows
        .filter((row) => !['COMPLETED', 'CANCELLED'].includes(row.status))
        .reduce((sum, row) => sum + row.quantity, 0),
      value: orderRows
        .filter((row) => !['COMPLETED', 'CANCELLED'].includes(row.status))
        .reduce((sum, row) => sum + row.total, 0),
    }),
    [enquiryRows, orderRows],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Corporate"
        title="Bulk orders"
        description="Turn enquiries into quotations, confirm accepted quotes and drive production through dispatch."
        actions={
          <Link to="/app/kitchen/bulk">
            <Button variant="secondary">
              <ChefHat size={15} /> Kitchen production
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Open enquiries', stats.pending, 'Awaiting quotation or acceptance'],
          ['Confirmed orders', stats.confirmed, 'In production or dispatch'],
          ['Meals in pipeline', stats.meals, 'Confirmed bulk quantity'],
          ['Pipeline value', money(stats.value), 'Quoted totals (demo)'],
        ].map(([label, value, hint]) => (
          <Card key={label} className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-brand-primary">{value}</p>
            <p className="text-[10.5px] text-brand-muted">{hint}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <Tabs
          value={tab}
          onChange={setTab}
          className="mb-3 w-fit"
          options={[
            { value: 'enquiries', label: 'Enquiries', count: enquiryRows.length },
            { value: 'orders', label: 'Confirmed orders', count: orderRows.length },
          ]}
        />
      </div>

      {tab === 'enquiries' ? (
        <Card>
          <div className="flex flex-col gap-2 border-b border-brand-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs options={ENQUIRY_TABS} value={status} onChange={setStatus} size="sm" className="w-fit max-w-full" />
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search organization or reference"
                className="pl-8"
              />
            </div>
          </div>

          {enquiries.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16" />
              ))}
            </div>
          ) : enquiryRows.length === 0 ? (
            <p className="px-4 py-10 text-center text-[12px] text-brand-muted">
              No enquiries match these filters. Submit one from the customer bulk orders page to see it here.
            </p>
          ) : (
            <div className="divide-y divide-brand-border">
              {enquiryRows.map((enquiry) => {
                const quotation = enquiry.quotations?.[0];
                return (
                  <div key={enquiry.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-brand-text">{enquiry.organizationName}</p>
                        <Badge tone={STATUS_TONES[enquiry.status] ?? 'muted'} dot>
                          {BULK_STATUS_LABELS[enquiry.status] ?? enquiry.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-brand-muted">
                        {enquiry.enquiryNumber} · {enquiry.organizationType} · {enquiry.contactPerson} ·{' '}
                        {enquiry.phone}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-brand-muted">
                        <span className="inline-flex items-center gap-1">
                          <Users size={11} /> {enquiry.estimatedQuantity} meals
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={11} /> {formatDateOnly(enquiry.requiredDate, 'dd MMM yyyy')} ·{' '}
                          {enquiry.preferredTime}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Building2 size={11} /> {enquiry.packageName ?? 'Custom package'}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {quotation ? (
                        <div className="text-right">
                          <p className="text-[12.5px] font-semibold text-brand-primary">{money(quotation.total)}</p>
                          <p className="text-[10px] text-brand-muted">{quotation.quotationNumber}</p>
                        </div>
                      ) : null}
                      <Button size="sm" variant="secondary" onClick={() => setSelectedEnquiry(enquiry)}>
                        Open <ArrowUpRight size={12} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader title="Confirmed bulk orders" subtitle="Production and dispatch workflow" />
          {bulkOrders.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16" />
              ))}
            </div>
          ) : orderRows.length === 0 ? (
            <p className="px-4 py-10 text-center text-[12px] text-brand-muted">
              No confirmed bulk orders yet. Accept a quotation and convert it to create one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Organization</th>
                    <th className="hidden md:table-cell">Delivery</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {orderRows.map((order) => {
                    const action = BULK_ACTIONS[order.status];
                    return (
                      <tr key={order.id}>
                        <td>
                          <p className="font-mono text-[11px] font-semibold text-brand-primary">{order.bulkOrderNumber}</p>
                          <p className="text-[10px] text-brand-muted">{order.packageName}</p>
                        </td>
                        <td>
                          <p className="text-[12px] font-medium text-brand-text">{order.organizationName}</p>
                          <p className="text-[10px] text-brand-muted">{order.contactPerson} · {order.phone}</p>
                        </td>
                        <td className="hidden text-[11px] text-brand-muted md:table-cell">
                          {formatDateOnly(order.deliveryDate, 'dd MMM yyyy')}
                          <p className="text-[10px]">{order.deliveryTime}</p>
                        </td>
                        <td className="text-[12px] font-semibold">{order.quantity}</td>
                        <td className="text-[12px] font-semibold text-brand-primary">{money(order.total)}</td>
                        <td>
                          <Badge tone={STATUS_TONES[order.status] ?? 'muted'} dot>
                            {BULK_STATUS_LABELS[order.status] ?? order.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="flex justify-end gap-1.5">
                            {order.status === 'READY' ? (
                              <Button size="sm" variant="secondary" onClick={() => setRiderTarget(order)}>
                                <Truck size={12} /> Rider
                              </Button>
                            ) : null}
                            {action ? (
                              <Button
                                size="sm"
                                onClick={() => statusMutation.mutate({ id: order.id, next: action.next })}
                                loading={statusMutation.isPending && statusMutation.variables?.id === order.id}
                              >
                                <action.icon size={12} /> {action.label}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <EnquiryModal
        enquiry={selectedEnquiry}
        onClose={() => setSelectedEnquiry(null)}
        packages={packages.data?.data ?? []}
        onQuote={(body) => quoteMutation.mutate({ enquiryId: selectedEnquiry.id, body })}
        quoting={quoteMutation.isPending}
        onAccept={(quotationId) => acceptMutation.mutate(quotationId)}
        accepting={acceptMutation.isPending}
        onConvert={(quotationId) => convertMutation.mutate(quotationId)}
        converting={convertMutation.isPending}
        onReject={() => setRejectTarget(selectedEnquiry)}
      />

      <Modal
        open={Boolean(riderTarget)}
        onClose={() => setRiderTarget(null)}
        title="Assign bulk delivery"
        subtitle={riderTarget ? `${riderTarget.bulkOrderNumber} · ${riderTarget.quantity} meals` : ''}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRiderTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!riderId}
              loading={assignMutation.isPending}
              onClick={() => assignMutation.mutate({ id: riderTarget.id, riderId })}
            >
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
              className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left ${
                riderId === rider.id ? 'border-brand-secondary bg-brand-secondary/5' : 'border-brand-border'
              }`}
            >
              <span>
                <span className="block text-[12.5px] font-semibold text-brand-text">{rider.name}</span>
                <span className="block text-[10.5px] text-brand-muted">{rider.vehicleType}</span>
              </span>
              <Badge tone={rider.isAvailable ? 'success' : 'muted'}>{rider.isAvailable ? 'Available' : 'Busy'}</Badge>
            </button>
          ))}
          <p className="rounded-lg bg-brand-background px-3 py-2 text-[10.5px] text-brand-muted">
            The rider can complete the bulk drop from their app with the demo confirmation code.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        onConfirm={() => rejectMutation.mutate(rejectTarget.id)}
        loading={rejectMutation.isPending}
        title="Reject this enquiry?"
        description="The customer will see the enquiry closed. This is recorded in the enquiry history."
        confirmLabel="Reject enquiry"
        tone="danger"
      />
    </div>
  );
}

function EnquiryModal({ enquiry, onClose, packages, onQuote, quoting, onAccept, accepting, onConvert, converting, onReject }) {
  const [form, setForm] = useState({
    packageName: '',
    quantity: 50,
    perPersonPrice: 135,
    additionalCharges: 0,
    discount: 0,
    terms: '50% advance to confirm. Final headcount 24 hours before delivery.',
  });

  useEffect(() => {
    if (!enquiry) return;
    setForm({
      packageName: enquiry.packageName ?? packages[0]?.name ?? 'Custom package',
      quantity: enquiry.estimatedQuantity ?? 50,
      perPersonPrice: 135,
      additionalCharges: 0,
      discount: 0,
      terms: '50% advance to confirm. Final headcount 24 hours before delivery.',
    });
  }, [enquiry?.id, packages]);

  if (!enquiry) return null;
  const latestQuotation = enquiry.quotations?.[0];
  const computedTotal = Math.max(0, Number(form.quantity) * Number(form.perPersonPrice) + Number(form.additionalCharges) - Number(form.discount));

  return (
    <Modal
      open={Boolean(enquiry)}
      onClose={onClose}
      size="xl"
      title={enquiry.organizationName}
      subtitle={`${enquiry.enquiryNumber} · ${enquiry.organizationType} · ${enquiry.estimatedQuantity} meals`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <a href={`tel:${enquiry.phone}`}>
              <Button size="sm" variant="secondary">
                <Phone size={13} /> Call {enquiry.contactPerson}
              </Button>
            </a>
            {!['ACCEPTED', 'REJECTED', 'CANCELLED'].includes(enquiry.status) ? (
              <Button size="sm" variant="ghost" className="text-brand-danger hover:bg-[#FBEAE5]" onClick={onReject}>
                <XCircle size={13} /> Reject
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {latestQuotation && latestQuotation.status === 'SENT' ? (
              <Button size="sm" variant="secondary" onClick={() => onAccept(latestQuotation.id)} loading={accepting}>
                Mark accepted
              </Button>
            ) : null}
            {latestQuotation && latestQuotation.status === 'ACCEPTED' ? (
              <Button size="sm" onClick={() => onConvert(latestQuotation.id)} loading={converting}>
                <CheckCircle2 size={13} /> Convert to bulk order
              </Button>
            ) : null}
            {!latestQuotation && enquiry.status !== 'REJECTED' ? (
              <Button size="sm" onClick={() => onQuote(form)} loading={quoting}>
                <Send size={13} /> Send quotation
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <div className="rounded-xl border border-brand-border p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Requirement</p>
            <div className="mt-2 space-y-1.5 text-[12px]">
              <p className="flex justify-between gap-3">
                <span className="text-brand-muted">Contact</span>
                <span className="text-right font-medium text-brand-text">
                  {enquiry.contactPerson} · {enquiry.phone}
                </span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-brand-muted">Email</span>
                <span className="text-right font-medium text-brand-text">{enquiry.email}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-brand-muted">Delivery</span>
                <span className="max-w-[60%] text-right font-medium text-brand-text">{enquiry.deliveryAddress}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-brand-muted">Date &amp; time</span>
                <span className="text-right font-medium text-brand-text">
                  {formatDateOnly(enquiry.requiredDate, 'dd MMM yyyy')} · {enquiry.preferredTime}
                </span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-brand-muted">Package preference</span>
                <span className="text-right font-medium text-brand-text">{enquiry.packageName ?? 'Custom'}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-brand-muted">Estimated quantity</span>
                <span className="text-right font-medium text-brand-text">{enquiry.estimatedQuantity} meals</span>
              </p>
            </div>
            {enquiry.dietaryRequirements ? (
              <p className="mt-2 rounded-lg bg-[#FBF1DD] px-2.5 py-2 text-[11px] text-[#8a6118]">
                Dietary: {enquiry.dietaryRequirements}
              </p>
            ) : null}
            {enquiry.notes ? <p className="mt-2 text-[11px] italic text-brand-muted">“{enquiry.notes}”</p> : null}
          </div>

          {enquiry.quotations?.length ? (
            <div className="rounded-xl border border-brand-border p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Quotations</p>
              <div className="mt-2 space-y-2">
                {enquiry.quotations.map((quotation) => (
                  <div key={quotation.id} className="rounded-lg bg-brand-background px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[11px] font-semibold text-brand-primary">{quotation.quotationNumber}</p>
                      <Badge tone={quotation.status === 'ACCEPTED' ? 'success' : quotation.status === 'REJECTED' ? 'danger' : 'gold'}>
                        {quotation.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11.5px] text-brand-text">
                      {quotation.quantity} meals × {money(quotation.perPersonPrice)} = {money(quotation.total)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-brand-muted">
                      + {money(quotation.additionalCharges)} charges · − {money(quotation.discount)} discount
                    </p>
                    {quotation.terms ? <p className="mt-1 text-[10px] italic text-brand-muted">{quotation.terms}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {enquiry.history?.length ? (
            <div className="rounded-xl border border-brand-border p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">History</p>
              <ol className="mt-2 space-y-1.5">
                {enquiry.history.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3 text-[10.5px]">
                    <span className="text-brand-text">{entry.status.replace(/_/g, ' ').toLowerCase()}</span>
                    <span className="text-right text-brand-muted">
                      {formatDate(entry.createdAt, 'dd MMM, h:mm a')}
                      <br />
                      {entry.actorName}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-brand-border p-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
            <FileText size={11} /> Prepare quotation
          </p>
          <div className="mt-3 grid gap-2.5">
            <Field label="Package name">
              <Select
                value={form.packageName}
                onChange={(event) => setForm({ ...form, packageName: event.target.value })}
              >
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.name}>
                    {pkg.name}
                  </option>
                ))}
                <option value="Custom package">Custom package</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Quantity">
                <Input
                  type="number"
                  min={10}
                  value={form.quantity}
                  onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                />
              </Field>
              <Field label="Per person (₹)">
                <Input
                  type="number"
                  min={1}
                  value={form.perPersonPrice}
                  onChange={(event) => setForm({ ...form, perPersonPrice: event.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Additional charges (₹)">
                <Input
                  type="number"
                  min={0}
                  value={form.additionalCharges}
                  onChange={(event) => setForm({ ...form, additionalCharges: event.target.value })}
                />
              </Field>
              <Field label="Discount (₹)">
                <Input
                  type="number"
                  min={0}
                  value={form.discount}
                  onChange={(event) => setForm({ ...form, discount: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Terms">
              <Textarea
                rows={2}
                value={form.terms}
                onChange={(event) => setForm({ ...form, terms: event.target.value })}
              />
            </Field>
            <div className="rounded-xl bg-brand-primary px-3.5 py-3 text-white">
              <p className="text-[10px] uppercase tracking-widest text-white/50">Estimated total</p>
              <p className="font-display text-2xl font-semibold text-brand-accent">{money(computedTotal)}</p>
              <p className="mt-0.5 text-[10px] text-white/50">
                {form.quantity} × {money(form.perPersonPrice)} + {money(form.additionalCharges)} −{' '}
                {money(form.discount)}
              </p>
            </div>
            {!latestQuotation && enquiry.status !== 'REJECTED' ? (
              <Button onClick={() => onQuote(form)} loading={quoting}>
                <Send size={14} /> Send quotation to customer
              </Button>
            ) : (
              <p className="rounded-lg bg-brand-background px-3 py-2 text-[10.5px] text-brand-muted">
                This enquiry already has a quotation. The customer can accept it from their account; you can also
                mark it accepted here during a demo.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
