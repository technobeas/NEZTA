import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Pause,
  Sparkles,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../stores/auth.js';
import { toast, toastError } from '../../stores/ui.js';
import {
  Badge,
  Button,
  Field,
  ImageWithFallback,
  Input,
  Modal,
  Select,
  Skeleton,
  Switch,
} from '../../components/ui/primitives.jsx';
import { cn, formatDateOnly, localDateString, money, WEEKDAYS } from '../../utils/format.js';

const PREFERENCE_OPTIONS = ['Regular veg', 'Jain (no onion, no garlic)', 'No onion, no garlic', 'Less spicy'];

export default function TiffinPlansPage() {
  const { data, isLoading } = useQuery({ queryKey: ['tiffin-plans'], queryFn: () => api('/tiffin-plans') });
  const plans = data?.data ?? [];
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  return (
    <>
      <section className="relative overflow-hidden bg-brand-primary text-white">
        <div className="hero-grain absolute inset-0" />
        <div className="container-page relative grid gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="eyebrow text-brand-accent">Tiffin subscriptions</p>
            <h1 className="mt-2 font-display text-[36px] font-semibold leading-tight sm:text-[48px]">
              Lunch, handled
              <br />
              <span className="text-brand-accent">every working day.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-white/65">
              Pick a daily, weekly or monthly plan. The kitchen generates each delivery as a real order you can
              track — and you can pause, resume or skip a date whenever life gets in the way.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {['No lock-in', 'Skip any date', 'Pause anytime', 'Demo payments only'].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/75"
                >
                  <BadgeCheck size={12} className="text-brand-accent" /> {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="relative hidden lg:block">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=900&q=80"
              alt="NEZTA tiffin meal"
              className="aspect-[4/3.4] w-full rounded-[28px] shadow-lift"
            />
            <div className="absolute -bottom-5 left-5 right-5 rounded-2xl border border-brand-border bg-white p-4 text-brand-text shadow-lift">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-accent/20 text-[#7c6324]">
                    <Clock size={16} />
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold text-brand-primary">Delivered by 12:30 PM</p>
                    <p className="text-[10.5px] text-brand-muted">Mon–Sat · Baner, Aundh, Wakad</p>
                  </div>
                </div>
                <Badge tone="success">Active</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="grid gap-5 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-96" />)
            : plans.map((plan) => {
                const featured = plan.planType === 'MONTHLY';
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'relative flex flex-col rounded-3xl border bg-white p-6 shadow-soft transition',
                      featured ? 'border-brand-accent shadow-lift' : 'border-brand-border',
                    )}
                  >
                    {featured ? (
                      <span className="absolute -top-3 left-6 rounded-full bg-brand-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-primary">
                        Best value
                      </span>
                    ) : null}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-muted">
                          {plan.planType} plan
                        </p>
                        <h2 className="mt-1.5 font-display text-[24px] font-semibold text-brand-primary">{plan.name}</h2>
                      </div>
                      <Badge tone={featured ? 'gold' : 'muted'}>{plan.durationDays}d</Badge>
                    </div>

                    <div className="mt-4 flex items-baseline gap-1.5">
                      <p className="font-display text-[34px] font-semibold text-brand-primary">{money(plan.price)}</p>
                      <span className="text-[12px] text-brand-muted">
                        /{plan.durationDays === 1 ? 'day' : plan.durationDays === 7 ? 'week' : 'month'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-brand-muted">{plan.description}</p>

                    <div className="mt-4 space-y-2 rounded-xl bg-brand-background p-3.5 text-[11.5px]">
                      <p className="flex items-center justify-between gap-2">
                        <span className="text-brand-muted">Meal type</span>
                        <span className="font-medium text-brand-text">{plan.mealType}</span>
                      </p>
                      <p className="flex items-center justify-between gap-2">
                        <span className="text-brand-muted">Delivery window</span>
                        <span className="font-medium text-brand-text">{plan.deliveryWindow}</span>
                      </p>
                      <p className="flex items-center justify-between gap-2">
                        <span className="text-brand-muted">Meals per day</span>
                        <span className="font-medium text-brand-text">{plan.mealsPerDay}</span>
                      </p>
                    </div>

                    <div className="mt-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Each delivery</p>
                      <ul className="mt-2 space-y-1.5">
                        {plan.items.map((item) => (
                          <li key={item.id} className="flex items-start gap-1.5 text-[11.5px] text-brand-text">
                            <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-brand-secondary" />
                            {item.label}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {plan.savingsNote ? (
                      <p className="mt-4 rounded-lg bg-brand-secondary/8 px-3 py-2 text-[11px] font-semibold text-brand-secondary">
                        {plan.savingsNote}
                      </p>
                    ) : null}

                    <div className="mt-auto pt-5">
                      <Button
                        variant={featured ? 'primary' : 'secondary'}
                        className="w-full"
                        onClick={() => setSelectedPlan(plan)}
                        disabled={!plan.isAvailable}
                      >
                        {plan.isAvailable ? 'Start this plan' : 'Plan unavailable'}
                      </Button>
                    </div>
                  </div>
                );
              })}
        </div>

        <div className="mt-10 grid gap-4 rounded-3xl border border-brand-border bg-white p-6 sm:grid-cols-3">
          {[
            [CalendarDays, 'Choose your start date', 'Begin tomorrow or next Monday — you decide the first delivery.'],
            [Pause, 'Pause whenever needed', 'Travelling? Pause the plan and resume when you are back.'],
            [Truck, 'One kitchen, one standard', 'The same team cooks your daily tiffin and your one-off orders.'],
          ].map(([Icon, title, description]) => (
            <div key={title} className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary/5 text-brand-secondary">
                <Icon size={16} />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-brand-primary">{title}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-brand-muted">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-accent/40 bg-brand-accent/10 p-5">
          <div>
            <p className="text-[13px] font-semibold text-brand-primary">Already subscribed? Manage deliveries in one place.</p>
            <p className="mt-1 text-[11.5px] text-brand-muted">Pause, resume, skip a date or review your generated orders.</p>
          </div>
          <Link to="/account/subscriptions">
            <Button variant="secondary">
              My tiffin plans <ArrowRight size={15} />
            </Button>
          </Link>
        </div>
      </section>

      <SubscriptionCheckout
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onConfirmed={(subscription) => {
          setSelectedPlan(null);
          setConfirmation(subscription);
        }}
      />

      <SubscriptionConfirmation subscription={confirmation} onClose={() => setConfirmation(null)} />
    </>
  );
}

function SubscriptionCheckout({ plan, onClose, onConfirmed }) {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const addresses = user?.customer?.addresses ?? [];
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];

  const [form, setForm] = useState({
    startDate: localDateString(1),
    addressId: defaultAddress?.id ?? '',
    deliverySlot: plan?.deliveryWindow ?? '12:00 PM - 1:30 PM',
    mealPreference: 'Regular veg',
    weekdays: [1, 2, 3, 4, 5, 6],
  });
  const [manualAddress, setManualAddress] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    line1: '',
    city: 'Pune',
    pincode: '',
  });
  const [error, setError] = useState('');

  const useSavedAddress = Boolean(form.addressId);

  const mutation = useMutation({
    mutationFn: (payload) => api('/subscriptions', { method: 'POST', body: payload }),
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: 'Tiffin plan started', message: payload.data.subscriptionNumber, tone: 'success' });
      onConfirmed(payload.data);
    },
    onError: (mutationError) => {
      setError(mutationError.message);
      toastError(mutationError, 'Could not start this tiffin plan');
    },
  });

  const endDate = useMemo(() => {
    if (!plan) return '';
    const date = new Date(`${form.startDate}T00:00:00`);
    date.setDate(date.getDate() + plan.durationDays - 1);
    return formatDateOnly(date);
  }, [form.startDate, plan]);

  if (!plan) return null;

  function submit() {
    setError('');
    if (!form.startDate) return setError('Choose a start date');
    if (!form.weekdays.length) return setError('Pick at least one delivery day');
    if (!useSavedAddress && (!manualAddress.line1 || !manualAddress.pincode)) {
      return setError('Add a delivery address and pincode');
    }
    mutation.mutate({
      planId: plan.id,
      startDate: form.startDate,
      deliverySlot: form.deliverySlot,
      mealPreference: form.mealPreference,
      weekdays: form.weekdays,
      ...(useSavedAddress
        ? { addressId: form.addressId }
        : {
            delivery: {
              name: manualAddress.name || user?.name,
              phone: manualAddress.phone || user?.phone || '9820011005',
              line1: manualAddress.line1,
              city: manualAddress.city,
              pincode: manualAddress.pincode,
            },
            saveAddress: true,
          }),
    });
  }

  if (!user || user.role !== 'CUSTOMER') {
    return (
      <Modal open={Boolean(plan)} onClose={onClose} title="Sign in to start a plan" size="sm">
        <p className="text-sm leading-relaxed text-brand-muted">
          Tiffin subscriptions are tied to a customer account. Use the demo customer login to continue, then
          return to this page.
        </p>
        <Link to="/login?next=/tiffin-plans" className="mt-5 block">
          <Button className="w-full">Sign in as demo customer</Button>
        </Link>
      </Modal>
    );
  }

  return (
    <Modal
      open={Boolean(plan)}
      onClose={onClose}
      title={`Start ${plan.name}`}
      subtitle={`${plan.durationDays} days · ${plan.mealType} · demo subscription`}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-brand-muted">
            Demo total <span className="font-semibold text-brand-primary">{money(plan.price)}</span> · no payment
            collected
          </p>
          <Button onClick={submit} loading={mutation.isPending}>
            Confirm demo subscription
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Start date" required>
            <Input
              type="date"
              min={localDateString(0)}
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
            />
          </Field>
          <Field label="Delivery time slot" required>
            <Select
              value={form.deliverySlot}
              onChange={(event) => setForm({ ...form, deliverySlot: event.target.value })}
            >
              <option value="12:00 PM - 1:30 PM">12:00 PM – 1:30 PM</option>
              <option value="12:15 PM - 1:15 PM">12:15 PM – 1:15 PM</option>
              <option value="12:30 PM - 1:30 PM">12:30 PM – 1:30 PM</option>
              <option value="7:30 PM - 8:30 PM">7:30 PM – 8:30 PM (dinner)</option>
            </Select>
          </Field>
        </div>

        <Field label="Meal preference" hint="The kitchen uses this for every delivery.">
          <Select
            value={form.mealPreference}
            onChange={(event) => setForm({ ...form, mealPreference: event.target.value })}
          >
            {PREFERENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <p className="field-label">Delivery days</p>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => {
              const active = form.weekdays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      weekdays: active
                        ? form.weekdays.filter((value) => value !== day.value)
                        : [...form.weekdays, day.value],
                    })
                  }
                  className={cn(
                    'h-9 w-12 rounded-lg border text-[12px] font-medium transition',
                    active
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-brand-border bg-white text-brand-muted hover:border-brand-secondary/40',
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-brand-muted">Sundays are off by default for the monthly plan.</p>
        </div>

        <div>
          <p className="field-label">Delivery address</p>
          {addresses.length ? (
            <div className="space-y-2">
              {addresses.map((address) => (
                <button
                  key={address.id}
                  type="button"
                  onClick={() => setForm({ ...form, addressId: address.id })}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left text-[12px] transition',
                    form.addressId === address.id
                      ? 'border-brand-secondary bg-brand-secondary/5'
                      : 'border-brand-border bg-white hover:border-brand-secondary/40',
                  )}
                >
                  <MapPin size={14} className="mt-0.5 shrink-0 text-brand-secondary" />
                  <span>
                    <span className="block font-semibold text-brand-text">
                      {address.label} · {address.receiverName}
                    </span>
                    <span className="mt-0.5 block text-brand-muted">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ''}, {address.city} {address.pincode}
                    </span>
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setForm({ ...form, addressId: '' })}
                className="text-[11.5px] font-semibold text-brand-secondary"
              >
                + Use a different address
              </button>
            </div>
          ) : (
            <p className="rounded-xl bg-brand-background px-3 py-2 text-[11.5px] text-brand-muted">
              No saved addresses yet — add one below.
            </p>
          )}

          {!useSavedAddress ? (
            <div className="mt-3 grid gap-2.5 rounded-xl border border-brand-border p-3 sm:grid-cols-2">
              <Field label="Address line" className="sm:col-span-2">
                <Input
                  value={manualAddress.line1}
                  onChange={(event) => setManualAddress({ ...manualAddress, line1: event.target.value })}
                  placeholder="Flat, building, street"
                />
              </Field>
              <Field label="City">
                <Input
                  value={manualAddress.city}
                  onChange={(event) => setManualAddress({ ...manualAddress, city: event.target.value })}
                />
              </Field>
              <Field label="Pincode">
                <Input
                  value={manualAddress.pincode}
                  onChange={(event) => setManualAddress({ ...manualAddress, pincode: event.target.value })}
                  inputMode="numeric"
                />
              </Field>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl bg-brand-background p-3.5 text-[11.5px]">
          <div className="flex justify-between">
            <span className="text-brand-muted">Plan</span>
            <span className="font-medium text-brand-text">{plan.name}</span>
          </div>
          <div className="mt-1.5 flex justify-between">
            <span className="text-brand-muted">Period</span>
            <span className="font-medium text-brand-text">
              {formatDateOnly(form.startDate)} → {endDate}
            </span>
          </div>
          <div className="mt-1.5 flex justify-between">
            <span className="text-brand-muted">Deliveries per week</span>
            <span className="font-medium text-brand-text">{form.weekdays.length}</span>
          </div>
          <div className="mt-1.5 flex justify-between border-t border-brand-border pt-1.5">
            <span className="text-brand-muted">Demo total</span>
            <span className="font-semibold text-brand-primary">{money(plan.price)}</span>
          </div>
        </div>

        {error ? <p className="rounded-lg bg-[#FBEAE5] px-3 py-2 text-[12px] font-medium text-brand-danger">{error}</p> : null}

        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-brand-muted">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-brand-accent" />
          This is a demonstration subscription. No recurring payment is collected and the plan can be paused or
          cancelled at any time.
        </p>
      </div>
    </Modal>
  );
}

function SubscriptionConfirmation({ subscription, onClose }) {
  const navigate = useNavigate();
  if (!subscription) return null;
  return (
    <Modal
      open={Boolean(subscription)}
      onClose={onClose}
      title="Your tiffin plan is active"
      subtitle={subscription.subscriptionNumber}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Keep browsing
          </Button>
          <Button onClick={() => navigate('/account/subscriptions')}>Manage my tiffin</Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-secondary/10 text-brand-secondary">
          <UtensilsCrossed size={26} />
        </span>
        <h3 className="mt-4 font-display text-xl font-semibold text-brand-primary">{subscription.plan?.name}</h3>
        <p className="mt-1 text-[12.5px] text-brand-muted">Demo subscription confirmed · payment not collected</p>
      </div>

      <div className="mt-6 space-y-2 rounded-xl border border-brand-border bg-brand-background p-4 text-[12px]">
        {[
          ['Subscription ID', subscription.subscriptionNumber],
          ['Start date', formatDateOnly(subscription.startDate)],
          ['End date', formatDateOnly(subscription.endDate)],
          ['Delivery slot', subscription.deliverySlot],
          ['Meal preference', subscription.mealPreference ?? 'Regular veg'],
          ['Deliveries this week', (subscription.schedule ?? []).length],
          ['Demo price', money(subscription.totalPrice)],
          ['Status', subscription.status],
        ].map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3">
            <span className="text-brand-muted">{label}</span>
            <span className="text-right font-medium text-brand-text">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Next deliveries</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(subscription.upcomingDeliveries ?? []).slice(0, 6).map((date) => (
            <span key={date} className="rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-brand-text ring-1 ring-brand-border">
              {formatDateOnly(date, 'dd MMM')}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-brand-muted">
        <CalendarClock size={13} className="mt-0.5 shrink-0 text-brand-secondary" />
        The shop can generate each delivery as a kitchen order from the shop dashboard — run it twice and no
        duplicates are created.
      </p>
    </Modal>
  );
}
