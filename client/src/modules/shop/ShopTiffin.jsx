import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  CalendarClock,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
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
  Switch,
  Textarea,
} from '../../components/ui/primitives.jsx';
import { toast, toastError } from '../../stores/ui.js';
import { SUBSCRIPTION_STATUS_LABELS } from '../../utils/constants.js';
import { formatDateOnly, localDateString, money } from '../../utils/format.js';

const EMPTY_PLAN = {
  name: '',
  planType: 'WEEKLY',
  durationDays: 7,
  price: '',
  description: '',
  mealType: 'Veg lunch',
  deliveryWindow: '12:00 PM - 1:30 PM',
  mealsPerDay: 1,
  savingsNote: '',
  isAvailable: true,
  isFeatured: false,
  itemsText: 'Special Vegetable Masala\nSpecial Dal\nChapati (3)\nRice\nSalad',
};

const STATUS_TONES = { ACTIVE: 'success', PAUSED: 'warning', CANCELLED: 'muted', COMPLETED: 'info' };

export default function ShopTiffin() {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PLAN);
  const [generateDate, setGenerateDate] = useState(localDateString(0));
  const [lastRun, setLastRun] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const plans = useQuery({ queryKey: ['tiffin-plans', 'all'], queryFn: () => api('/tiffin-plans?all=true') });
  const subscriptions = useQuery({ queryKey: ['subscriptions'], queryFn: () => api('/subscriptions') });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tiffin-plans'] });
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    queryClient.invalidateQueries({ queryKey: ['shop-overview'] });
  };

  const savePlan = useMutation({
    mutationFn: (payload) =>
      editing ? api(`/tiffin-plans/${editing.id}`, { method: 'PATCH', body: payload }) : api('/tiffin-plans', { method: 'POST', body: payload }),
    onSuccess: () => {
      toast({ title: editing ? 'Plan updated' : 'Plan created', tone: 'success' });
      setEditorOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not save the tiffin plan'),
  });

  const togglePlan = useMutation({
    mutationFn: ({ id, data }) => api(`/tiffin-plans/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => invalidate(),
    onError: (error) => toastError(error, 'Could not update the plan'),
  });

  const generate = useMutation({
    mutationFn: () => api('/subscriptions/generate-orders', { method: 'POST', body: { date: generateDate } }),
    onSuccess: (payload) => {
      setLastRun(payload.data);
      toast({
        title: `${payload.data.summary.generated} orders generated`,
        message: `For ${payload.data.date}. ${payload.data.summary.skipped} skipped (already generated, not scheduled or paused).`,
        tone: payload.data.summary.generated ? 'success' : 'info',
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not generate subscription orders'),
  });

  const subscriberAction = useMutation({
    mutationFn: ({ id, action }) => api(`/subscriptions/${id}/${action}`, { method: 'POST' }),
    onSuccess: (_payload, variables) => {
      toast({ title: `Subscription ${variables.action}d`, tone: 'success' });
      setCancelTarget(null);
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not update the subscription'),
  });

  const planList = plans.data?.data ?? [];
  const subscriberList = subscriptions.data?.data ?? [];
  const activeSubscribers = subscriberList.filter((row) => row.status === 'ACTIVE');
  const upcoming = subscriberList.flatMap((row) => (row.upcomingDeliveries ?? []).map((date) => ({ date, row })));
  const upcomingByDate = upcoming.reduce((acc, entry) => {
    acc[entry.date] = (acc[entry.date] ?? 0) + 1;
    return acc;
  }, {});

  useEffect(() => {
    if (!editorOpen) return;
    if (editing) {
      setForm({
        name: editing.name,
        planType: editing.planType,
        durationDays: editing.durationDays,
        price: editing.price,
        description: editing.description ?? '',
        mealType: editing.mealType,
        deliveryWindow: editing.deliveryWindow,
        mealsPerDay: editing.mealsPerDay,
        savingsNote: editing.savingsNote ?? '',
        isAvailable: editing.isAvailable,
        isFeatured: editing.isFeatured,
        itemsText: editing.items.map((item) => item.label).join('\n'),
      });
    } else {
      setForm(EMPTY_PLAN);
    }
  }, [editorOpen, editing]);

  function openEditor(plan) {
    setEditing(plan ?? null);
    setEditorOpen(true);
  }

  function submit() {
    if (!form.name.trim() || !Number(form.price)) {
      toastError(new Error('Plan needs a name and price'), 'Missing plan details');
      return;
    }
    savePlan.mutate({
      name: form.name.trim(),
      planType: form.planType,
      durationDays: Number(form.durationDays),
      price: Number(form.price),
      description: form.description || null,
      mealType: form.mealType,
      deliveryWindow: form.deliveryWindow,
      mealsPerDay: Number(form.mealsPerDay) || 1,
      savingsNote: form.savingsNote || null,
      isAvailable: form.isAvailable,
      isFeatured: form.isFeatured,
      items: form.itemsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((label) => ({ label, quantity: 1 })),
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Recurring meals"
        title="Tiffin subscriptions"
        description="Manage plans, view subscribers and generate each day's tiffin deliveries. Generation is idempotent — running it twice never duplicates orders."
        actions={
          <Button onClick={() => openEditor(null)}>
            <Plus size={15} /> New plan
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Active subscribers</p>
          <p className="mt-1 font-display text-2xl font-semibold text-brand-primary">{activeSubscribers.length}</p>
          <p className="text-[10.5px] text-brand-muted">{subscriberList.length} total demo subscriptions</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Next 7 days</p>
          <p className="mt-1 font-display text-2xl font-semibold text-brand-primary">{upcoming.length}</p>
          <p className="text-[10.5px] text-brand-muted">Tiffin deliveries queued</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Plans available</p>
          <p className="mt-1 font-display text-2xl font-semibold text-brand-primary">
            {planList.filter((plan) => plan.isAvailable).length}
          </p>
          <p className="text-[10.5px] text-brand-muted">{planList.length} plans configured</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Plans" subtitle="Editable daily, weekly and monthly durations" />
          {plans.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Duration</th>
                    <th>Price</th>
                    <th>Subscribers</th>
                    <th>Available</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {planList.map((plan) => (
                    <tr key={plan.id}>
                      <td>
                        <p className="text-[12.5px] font-semibold text-brand-text">{plan.name}</p>
                        <p className="text-[10.5px] text-brand-muted">{plan.mealType} · {plan.deliveryWindow}</p>
                      </td>
                      <td className="text-[11.5px] text-brand-muted">
                        {plan.planType} · {plan.durationDays}d
                      </td>
                      <td className="text-[12.5px] font-semibold text-brand-primary">{money(plan.price)}</td>
                      <td className="text-[11.5px] text-brand-muted">{plan.subscriberCount ?? 0}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => togglePlan.mutate({ id: plan.id, data: { isAvailable: !plan.isAvailable } })}
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            plan.isAvailable ? 'bg-brand-secondary/10 text-brand-secondary' : 'bg-brand-soft text-brand-muted'
                          }`}
                        >
                          {plan.isAvailable ? 'Available' : 'Disabled'}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => openEditor(plan)}
                          className="rounded-lg p-1.5 text-brand-muted hover:bg-brand-background hover:text-brand-primary"
                          aria-label={`Edit ${plan.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Generate subscription orders" subtitle="Creates kitchen orders for a service date" />
          <div className="space-y-3 p-4">
            <Field label="Service date">
              <Input type="date" value={generateDate} onChange={(event) => setGenerateDate(event.target.value)} />
            </Field>
            <Button className="w-full" onClick={() => generate.mutate()} loading={generate.isPending}>
              <RefreshCw size={15} /> Generate orders for this date
            </Button>
            {lastRun ? (
              <div className="rounded-xl border border-brand-border bg-brand-background p-3 text-[11px]">
                <p className="font-semibold text-brand-primary">Last run · {lastRun.date}</p>
                <p className="mt-1 text-brand-muted">
                  {lastRun.summary.generated} generated · {lastRun.summary.skipped} skipped ·{' '}
                  {lastRun.summary.activeSubscriptions} active subscriptions checked
                </p>
                {lastRun.generated.length ? (
                  <ul className="mt-2 space-y-1">
                    {lastRun.generated.slice(0, 4).map((entry) => (
                      <li key={entry.orderId} className="font-mono text-[10px] text-brand-secondary">
                        {entry.orderNumber}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="rounded-xl bg-brand-background p-3 text-[11px] leading-relaxed text-brand-muted">
                Generation respects paused plans, skipped dates and the subscription period. The unique
                (subscription, date) index prevents duplicates.
              </p>
            )}

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Next deliveries by date</p>
              <div className="mt-2 space-y-1">
                {Object.entries(upcomingByDate)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .slice(0, 5)
                  .map(([date, count]) => (
                    <div key={date} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-[11px] ring-1 ring-brand-border">
                      <span className="text-brand-text">{formatDateOnly(date, 'EEE dd MMM')}</span>
                      <Badge tone="muted">{count} tiffins</Badge>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Subscribers"
          subtitle="Pause or cancel on behalf of a customer"
          action={<Badge tone="muted"><Users size={10} /> {subscriberList.length}</Badge>}
        />
        {subscriptions.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        ) : subscriberList.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12px] text-brand-muted">
            No subscriptions yet. Start one from the customer site to see it here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Subscriber</th>
                  <th>Plan</th>
                  <th>Period</th>
                  <th className="hidden md:table-cell">Preference</th>
                  <th>Status</th>
                  <th>Value</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {subscriberList.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <p className="text-[12.5px] font-medium text-brand-text">{row.customer?.name}</p>
                      <p className="font-mono text-[10px] text-brand-muted">{row.subscriptionNumber}</p>
                    </td>
                    <td className="text-[11.5px] text-brand-muted">
                      {row.plan?.name}
                      <p className="text-[10px]">{row.deliverySlot}</p>
                    </td>
                    <td className="text-[11px] text-brand-muted">
                      {formatDateOnly(row.startDate, 'dd MMM')} → {formatDateOnly(row.endDate, 'dd MMM')}
                    </td>
                    <td className="hidden max-w-[160px] truncate text-[11px] text-brand-muted md:table-cell">
                      {row.mealPreference ?? '—'}
                    </td>
                    <td>
                      <Badge tone={STATUS_TONES[row.status] ?? 'muted'} dot>
                        {SUBSCRIPTION_STATUS_LABELS[row.status]}
                      </Badge>
                    </td>
                    <td className="text-[11.5px] font-semibold text-brand-primary">{money(row.totalPrice)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {row.status === 'ACTIVE' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => subscriberAction.mutate({ id: row.id, action: 'pause' })}
                          >
                            <Pause size={12} /> Pause
                          </Button>
                        ) : null}
                        {row.status === 'PAUSED' ? (
                          <Button size="sm" onClick={() => subscriberAction.mutate({ id: row.id, action: 'resume' })}>
                            <Play size={12} /> Resume
                          </Button>
                        ) : null}
                        {!['CANCELLED', 'COMPLETED'].includes(row.status) ? (
                          <button
                            type="button"
                            onClick={() => setCancelTarget(row)}
                            className="rounded-lg p-1.5 text-brand-muted hover:bg-[#FBEAE5] hover:text-brand-danger"
                            aria-label="Cancel subscription"
                          >
                            <XCircle size={14} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        size="lg"
        title={editing ? `Edit ${editing.name}` : 'Create a tiffin plan'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={savePlan.isPending}>
              {editing ? 'Save plan' : 'Create plan'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Plan name" required className="sm:col-span-2">
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Weekly Tiffin" />
          </Field>
          <Field label="Plan type" required>
            <Select
              value={form.planType}
              onChange={(event) => {
                const type = event.target.value;
                const durations = { DAILY: 1, WEEKLY: 7, MONTHLY: 30 };
                setForm({ ...form, planType: type, durationDays: durations[type] });
              }}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </Select>
          </Field>
          <Field label="Duration (days)" required>
            <Input type="number" min={1} value={form.durationDays} onChange={(event) => setForm({ ...form, durationDays: event.target.value })} />
          </Field>
          <Field label="Price (₹)" required>
            <Input type="number" min={1} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
          </Field>
          <Field label="Meal type">
            <Input value={form.mealType} onChange={(event) => setForm({ ...form, mealType: event.target.value })} />
          </Field>
          <Field label="Delivery window">
            <Input value={form.deliveryWindow} onChange={(event) => setForm({ ...form, deliveryWindow: event.target.value })} />
          </Field>
          <Field label="Meals per day">
            <Input type="number" min={1} max={5} value={form.mealsPerDay} onChange={(event) => setForm({ ...form, mealsPerDay: event.target.value })} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
          <Field label="Savings note">
            <Input value={form.savingsNote} onChange={(event) => setForm({ ...form, savingsNote: event.target.value })} placeholder="Saves ₹800 vs daily orders" />
          </Field>
          <Field label="Included items (one per line)" className="sm:col-span-2">
            <Textarea rows={5} value={form.itemsText} onChange={(event) => setForm({ ...form, itemsText: event.target.value })} />
          </Field>
          <div className="space-y-3 rounded-xl border border-brand-border p-3 sm:col-span-2">
            <Switch checked={form.isAvailable} onChange={(value) => setForm({ ...form, isAvailable: value })} label="Available for new subscribers" />
            <Switch checked={form.isFeatured} onChange={(value) => setForm({ ...form, isFeatured: value })} label="Feature on the tiffin page" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => subscriberAction.mutate({ id: cancelTarget.id, action: 'cancel' })}
        loading={subscriberAction.isPending}
        title="Cancel this subscription?"
        description="Future deliveries stop immediately. Past orders stay in the customer's history. Demo cancellation — no refund is processed."
        confirmLabel="Cancel subscription"
        tone="danger"
      />
    </div>
  );
}
