import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Banknote,
  Check,
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../stores/auth.js';
import { useCart } from '../../stores/cart.js';
import { toastError } from '../../stores/ui.js';
import { Badge, Button, EmptyState, Field, Input, Textarea } from '../../components/ui/primitives.jsx';
import { cn, money } from '../../utils/format.js';

const schema = z.object({
  name: z.string().min(2, 'Delivery name is required').max(80),
  phone: z
    .string()
    .min(8, 'Enter a reachable phone number')
    .max(15)
    .regex(/^[0-9+\-\s]+$/, 'Use digits, spaces, + or -'),
  line1: z.string().min(5, 'Building and street are required').max(160),
  line2: z.string().max(160).optional(),
  city: z.string().min(2, 'City is required').max(60),
  pincode: z.string().min(4, 'Pincode is required').max(10),
  instructions: z.string().max(300).optional(),
});

export default function CheckoutPage() {
  const user = useAuth((state) => state.user);
  const lines = useCart((state) => state.lines);
  const couponCode = useCart((state) => state.couponCode);
  const toApiItems = useCart((state) => state.toApiItems);
  const clearCart = useCart((state) => state.clear);
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('CASH_ON_DELIVERY');
  const [saveAddress, setSaveAddress] = useState(true);

  const address = user?.customer?.addresses?.find((entry) => entry.isDefault) ?? user?.customer?.addresses?.[0];
  const items = toApiItems();

  const quote = useQuery({
    queryKey: ['cart-quote', JSON.stringify({ items, coupon: couponCode })],
    queryFn: () => api('/orders/quote', { method: 'POST', body: { items, couponCode: couponCode || undefined } }),
    enabled: items.length > 0,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: address?.receiverName ?? user?.name ?? '',
      phone: address?.phone ?? user?.phone ?? '',
      line1: address?.line1 ?? '',
      line2: address?.line2 ?? '',
      city: address?.city ?? 'Pune',
      pincode: address?.pincode ?? '',
      instructions: '',
    },
  });

  useEffect(() => {
    if (!address) return;
    reset({
      name: address.receiverName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      pincode: address.pincode,
      instructions: '',
    });
  }, [address, reset]);

  const summary = quote.data?.data;

  const mutation = useMutation({
    mutationFn: (values) =>
      api('/orders', {
        method: 'POST',
        body: {
          items,
          couponCode: couponCode || undefined,
          paymentMethod,
          instructions: values.instructions || undefined,
          saveAddress,
          delivery: {
            name: values.name,
            phone: values.phone,
            line1: values.line1,
            line2: values.line2 || undefined,
            city: values.city,
            pincode: values.pincode,
            instructions: values.instructions || undefined,
          },
        },
      }),
    onSuccess: (payload) => {
      clearCart();
      navigate(`/track/${payload.data.orderNumber}?confirmed=1`, { replace: true });
    },
    onError: (error) => toastError(error, 'Could not place the order'),
  });

  if (!user || user.role !== 'CUSTOMER') {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={Lock}
          title="Sign in to check out"
          description="Orders are tied to a customer account so you can track them. Use the demo customer login to continue."
          action={
            <Link to="/login?next=/checkout">
              <Button>Sign in as demo customer</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Nothing to check out"
          description="Your cart is empty. Add dishes or a meal box first."
          action={
            <Link to="/menu">
              <Button>Browse the menu</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page pb-28 pt-10 lg:pb-10">
      <div className="mb-6">
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-1.5 font-display text-[32px] font-semibold text-brand-primary">Almost there</h1>
        <p className="mt-1 text-[12.5px] text-brand-muted">
          Demo checkout — cash on delivery is the working payment method. No real money moves.
        </p>
      </div>

      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/5 text-brand-secondary">
                <User size={15} />
              </span>
              <h2 className="font-display text-lg font-semibold text-brand-primary">Contact &amp; delivery</h2>
            </div>

            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <Field label="Full name" required error={errors.name?.message}>
                <Input placeholder="Riya Sharma" {...register('name')} error={errors.name} />
              </Field>
              <Field label="Phone number" required error={errors.phone?.message}>
                <Input placeholder="+91 98200 11005" {...register('phone')} error={errors.phone} />
              </Field>
              <Field label="Address line 1" required error={errors.line1?.message} className="sm:col-span-2">
                <Input placeholder="Flat, building, street" {...register('line1')} error={errors.line1} />
              </Field>
              <Field label="Address line 2" className="sm:col-span-2">
                <Input placeholder="Landmark, area (optional)" {...register('line2')} />
              </Field>
              <Field label="City" required error={errors.city?.message}>
                <Input {...register('city')} error={errors.city} />
              </Field>
              <Field label="Pincode" required error={errors.pincode?.message}>
                <Input inputMode="numeric" {...register('pincode')} error={errors.pincode} />
              </Field>
              <Field
                label="Delivery instructions"
                hint="Gate codes, ringing the bell, leave at the door…"
                className="sm:col-span-2"
              >
                <Textarea rows={2} placeholder="Please ring the bell twice" {...register('instructions')} />
              </Field>
            </div>

            <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11.5px] text-brand-muted">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(event) => setSaveAddress(event.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-brand-border text-brand-secondary focus:ring-brand-secondary"
              />
              Save this address to my demo profile for next time
            </label>
          </section>

          <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/5 text-brand-secondary">
                <CreditCard size={15} />
              </span>
              <h2 className="font-display text-lg font-semibold text-brand-primary">Payment method</h2>
              <Badge tone="gold" className="ml-auto">
                Simulated
              </Badge>
            </div>

            <div className="mt-4 space-y-2">
              {[
                {
                  id: 'CASH_ON_DELIVERY',
                  title: 'Cash on delivery',
                  description: 'Pay the rider in cash when your food arrives.',
                  icon: Banknote,
                },
                {
                  id: 'UPI_ON_DELIVERY',
                  title: 'UPI on delivery',
                  description: 'Pay by UPI at the door — simulated in this demo.',
                  icon: CreditCard,
                },
              ].map((option) => {
                const active = paymentMethod === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPaymentMethod(option.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition',
                      active
                        ? 'border-brand-secondary bg-brand-secondary/5'
                        : 'border-brand-border bg-white hover:border-brand-secondary/40',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        active ? 'bg-brand-secondary text-white' : 'bg-brand-background text-brand-muted',
                      )}
                    >
                      <option.icon size={16} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[12.5px] font-semibold text-brand-text">{option.title}</span>
                      <span className="mt-0.5 block text-[11px] text-brand-muted">{option.description}</span>
                    </span>
                    <span
                      className={cn(
                        'inline-flex h-4 w-4 items-center justify-center rounded-full border',
                        active ? 'border-brand-secondary bg-brand-secondary text-white' : 'border-brand-border',
                      )}
                    >
                      {active ? <Check size={10} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 flex items-start gap-2 rounded-xl bg-brand-background px-3 py-2.5 text-[11px] leading-relaxed text-brand-muted">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-secondary" />
              This demonstration records a simulated payment status only. No payment gateway is connected and no
              card details are collected.
            </p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-brand-primary">Your order</h2>
            <div className="mt-3 max-h-64 space-y-2.5 overflow-y-auto pr-1">
              {lines.map((line) => (
                <div key={line.key} className="flex items-start justify-between gap-2 text-[12px]">
                  <div className="min-w-0">
                    <p className="font-medium text-brand-text">
                      {line.quantity} × {line.name}
                    </p>
                    {line.selectionLabels?.length ? (
                      <p className="mt-0.5 line-clamp-2 text-[10.5px] text-brand-muted">
                        {line.selectionLabels.map((selection) => selection.value).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 font-medium text-brand-text">{money(line.unitPrice * line.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-2 border-t border-brand-border pt-3 text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-brand-muted">Subtotal</span>
                <span className="font-medium">{money(summary?.subtotal)}</span>
              </div>
              {summary?.discount ? (
                <div className="flex justify-between text-brand-secondary">
                  <span>Coupon {summary.coupon?.code}</span>
                  <span className="font-medium">− {money(summary.discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-brand-muted">Delivery</span>
                <span className="font-medium">
                  {summary?.deliveryFee === 0 ? 'Free' : money(summary?.deliveryFee)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-brand-border pt-2">
                <span className="font-semibold text-brand-text">Total</span>
                <span className="font-display text-2xl font-semibold text-brand-primary">{money(summary?.total)}</span>
              </div>
            </div>

            <Button type="submit" className="mt-4 w-full" loading={mutation.isPending || isSubmitting}>
              {mutation.isPending ? (
                'Placing order…'
              ) : (
                <>
                  Place demo order <ArrowRight size={15} />
                </>
              )}
            </Button>

            {mutation.isError ? (
              <p className="mt-3 rounded-lg bg-[#FBEAE5] px-3 py-2 text-[11.5px] font-medium text-brand-danger">
                {mutation.error.message}
              </p>
            ) : null}

            <div className="mt-3 space-y-1.5 text-[10.5px] text-brand-muted">
              <p className="flex items-center gap-1.5">
                <Truck size={12} /> Estimated delivery 30–40 minutes
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin size={12} /> Delivered by the NEZTA kitchen team
              </p>
              <p className="flex items-center gap-1.5">
                <Phone size={12} /> Support: +91 98200 11223
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile: keep the total and the primary action reachable without scrolling */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-border bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(18,59,43,0.08)] backdrop-blur lg:hidden">
          {mutation.isError ? (
            <p className="mb-2 rounded-lg bg-[#FBEAE5] px-2.5 py-1.5 text-[11px] font-medium text-brand-danger">
              {mutation.error.message}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-brand-muted">Total payable</p>
              <p className="font-display text-xl font-semibold text-brand-primary">{money(summary?.total)}</p>
            </div>
            <Button type="submit" className="min-w-[170px] flex-1" loading={mutation.isPending || isSubmitting}>
              {mutation.isPending ? 'Placing…' : 'Place demo order'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
