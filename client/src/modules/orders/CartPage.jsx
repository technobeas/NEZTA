import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2, Truck, UtensilsCrossed, X } from 'lucide-react';
import { api } from '../../services/api.js';
import { useCart } from '../../stores/cart.js';
import { toast } from '../../stores/ui.js';
import {
  Badge,
  Button,
  EmptyState,
  ImageWithFallback,
  Input,
  Skeleton,
} from '../../components/ui/primitives.jsx';
import { money, pluralise } from '../../utils/format.js';

export default function CartPage() {
  const lines = useCart((state) => state.lines);
  const couponCode = useCart((state) => state.couponCode);
  const setCoupon = useCart((state) => state.setCoupon);
  const setQuantity = useCart((state) => state.setQuantity);
  const removeLine = useCart((state) => state.removeLine);
  const toApiItems = useCart((state) => state.toApiItems);
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState(couponCode ?? '');
  const [couponError, setCouponError] = useState('');

  const items = toApiItems();
  const signature = useMemo(() => JSON.stringify({ items, coupon: couponCode }), [items, couponCode]);

  const quote = useQuery({
    queryKey: ['cart-quote', signature],
    queryFn: () => api('/orders/quote', { method: 'POST', body: { items, couponCode: couponCode || undefined } }),
    enabled: items.length > 0,
    retry: false,
    placeholderData: (previous) => previous,
  });

  const summary = quote.data?.data;

  // A rejected coupon should never block the cart — surface the reason and drop it.
  useEffect(() => {
    if (!quote.isError || !couponCode) return;
    setCoupon('');
    setCouponError(quote.error?.message ?? 'That coupon could not be applied');
  }, [quote.isError, quote.error, couponCode, setCoupon]);

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    setCouponError('');
    if (!code) {
      setCoupon('');
      return;
    }
    setCoupon(code);
    toast({ title: `Coupon ${code} applied`, message: 'Totals recalculated by the server.', tone: 'success' });
  }

  if (lines.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Add a few dishes, or build a customizable meal box for a complete thali."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/menu">
                <Button>
                  <UtensilsCrossed size={15} /> Browse the menu
                </Button>
              </Link>
              <Link to="/meal-boxes">
                <Button variant="secondary">Build a meal box</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Your order</p>
          <h1 className="mt-1.5 font-display text-[32px] font-semibold text-brand-primary">Cart</h1>
          <p className="mt-1 text-[12.5px] text-brand-muted">
            {pluralise(lines.reduce((sum, line) => sum + line.quantity, 0), 'item')} · prices verified by the
            kitchen before checkout
          </p>
        </div>
        <Link to="/menu" className="text-[12.5px] font-semibold text-brand-secondary">
          + Add more items
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {lines.map((line) => (
            <div
              key={line.key}
              className="flex gap-3 rounded-2xl border border-brand-border bg-white p-3 shadow-soft sm:p-4"
            >
              <ImageWithFallback
                src={line.imageUrl}
                alt={line.name}
                className="h-20 w-20 shrink-0 rounded-xl sm:h-24 sm:w-24"
                fallbackLabel={line.name.slice(0, 2)}
              />

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-semibold text-brand-text">{line.name}</p>
                      {line.type === 'MEAL_BOX' ? <Badge tone="gold">Custom meal box</Badge> : null}
                    </div>
                    {line.selectionLabels?.length ? (
                      <p className="mt-1 text-[11px] leading-relaxed text-brand-muted">
                        {line.selectionLabels.map((selection) => `${selection.group}: ${selection.value}`).join(' • ')}
                      </p>
                    ) : null}
                    {line.notes ? (
                      <p className="mt-1 text-[11px] italic text-brand-muted">“{line.notes}”</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    className="rounded-lg p-1.5 text-brand-muted transition hover:bg-[#FBEAE5] hover:text-brand-danger"
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                  <div className="flex items-center rounded-lg border border-brand-border">
                    <button
                      type="button"
                      onClick={() => setQuantity(line.key, line.quantity - 1)}
                      className="inline-flex h-8 w-8 items-center justify-center text-brand-muted hover:text-brand-primary"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-7 text-center text-[12.5px] font-semibold">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.key, line.quantity + 1)}
                      className="inline-flex h-8 w-8 items-center justify-center text-brand-muted hover:text-brand-primary"
                      aria-label="Increase quantity"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <p className="text-[13.5px] font-semibold text-brand-primary">
                    {money(line.unitPrice * line.quantity)}
                    <span className="ml-1 text-[10.5px] font-normal text-brand-muted">
                      ({money(line.unitPrice)} each)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <Tag size={15} className="text-brand-secondary" />
              <p className="text-[13px] font-semibold text-brand-text">Have a coupon?</p>
            </div>
            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
              <Input
                value={couponInput}
                onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                placeholder="NEZTA10"
                className="sm:flex-1"
              />
              <SupportButton
                onApply={applyCoupon}
                onClear={() => {
                  setCouponInput('');
                  setCoupon('');
                }}
                applied={Boolean(couponCode)}
              />
            </div>
            {summary?.coupon ? (
              <p className="mt-2 text-[11.5px] font-medium text-brand-secondary">
                {summary.coupon.code} applied · {summary.coupon.description}
              </p>
            ) : null}
            {couponError ? <p className="mt-2 text-[11.5px] text-brand-danger">{couponError}</p> : null}
            {quote.isError && !couponCode ? (
              <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-brand-danger">
                <X size={13} className="mt-0.5" /> {quote.error.message}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-brand-primary">Order summary</h2>
            {quote.isLoading ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-4" />
                ))}
              </div>
            ) : quote.isError ? (
              <p className="mt-4 rounded-lg bg-[#FBEAE5] px-3 py-2 text-[12px] text-brand-danger">
                {quote.error.message}
              </p>
            ) : (
              <div className="mt-4 space-y-2.5 text-[13px]">
                <Row label={`Subtotal (${pluralise(lines.length, 'line')})`} value={money(summary?.subtotal)} />
                {summary?.discount ? (
                  <Row label="Coupon discount" value={`− ${money(summary.discount)}`} tone="success" />
                ) : null}
                <Row
                  label="Delivery fee"
                  value={summary?.deliveryFee === 0 ? 'Free' : money(summary?.deliveryFee)}
                  tone={summary?.deliveryFee === 0 ? 'success' : undefined}
                />
                {summary?.deliveryFee > 0 ? (
                  <p className="rounded-lg bg-brand-background px-2.5 py-2 text-[10.5px] text-brand-muted">
                    Add {money(Math.max(0, summary.freeDeliveryAbove - summary.subtotal))} more for free delivery
                  </p>
                ) : null}
                <div className="flex items-center justify-between border-t border-brand-border pt-3">
                  <span className="text-[13px] font-semibold text-brand-text">Total payable</span>
                  <span className="font-display text-2xl font-semibold text-brand-primary">
                    {money(summary?.total)}
                  </span>
                </div>
              </div>
            )}

            <Button className="mt-5 w-full" onClick={() => navigate('/checkout')} disabled={!summary}>
              Proceed to checkout <ArrowRight size={15} />
            </Button>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[10.5px] text-brand-muted">
              <Truck size={12} /> Delivering from NEZTA, Baner
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-brand-accent/40 bg-brand-accent/10 px-3.5 py-3 text-[11px] leading-relaxed text-[#6f5a20]">
            <span className="font-semibold">Demo checkout.</span> The order is saved to PostgreSQL and moves
            through the shop, kitchen and rider workflows. No real payment is collected.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-brand-muted">{label}</span>
      <span className={tone === 'success' ? 'font-medium text-brand-secondary' : 'font-medium text-brand-text'}>
        {value}
      </span>
    </div>
  );
}

function SupportButton({ onApply, onClear, applied }) {
  return applied ? (
    <Button variant="secondary" onClick={onClear}>
      Remove
    </Button>
  ) : (
    <Button variant="secondary" onClick={onApply}>
      Apply
    </Button>
  );
}
