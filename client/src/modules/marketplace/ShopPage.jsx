import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  Bike,
  CalendarClock,
  Clock,
  MapPin,
  Package,
  Phone,
  Star,
  Store,
  Truck,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ProductCard, ProductCardSkeleton } from '../../components/ProductCard.jsx';
import { Badge, Button, ImageWithFallback, Skeleton } from '../../components/ui/primitives.jsx';
import { money } from '../../utils/format.js';

export default function ShopPage() {
  const { data, isLoading } = useQuery({ queryKey: ['shop-public'], queryFn: () => api('/shop/public') });
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api('/products?all=true') });
  const mealBoxes = useQuery({ queryKey: ['meal-boxes'], queryFn: () => api('/meal-boxes') });
  const plans = useQuery({ queryKey: ['tiffin-plans'], queryFn: () => api('/tiffin-plans') });
  const shop = data?.data;

  return (
    <>
      <section className="relative">
        {isLoading ? (
          <div className="skeleton h-56 w-full rounded-none sm:h-72" />
        ) : (
          <ImageWithFallback src={shop?.bannerUrl} alt={`${shop?.name} banner`} className="h-56 w-full sm:h-72" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/90 via-brand-primary/45 to-brand-primary/10" />

        <div className="container-page relative -mt-20 pb-0">
          <div className="flex flex-col gap-4 rounded-3xl border border-brand-border bg-white p-5 shadow-lift sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-4">
              {isLoading ? (
                <div className="skeleton h-20 w-20 rounded-2xl" />
              ) : (
                <ImageWithFallback
                  src={shop?.logoUrl}
                  alt={shop?.name}
                  className="h-20 w-20 shrink-0 rounded-2xl border border-brand-border"
                  fallbackLabel="NZ"
                />
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold text-brand-primary sm:text-[28px]">
                    {shop?.name ?? 'NEZTA'}
                  </h1>
                  <Badge tone="success" dot>
                    {shop?.isOpen ? 'Open now' : 'Closed'}
                  </Badge>
                  <Badge tone="gold">Demo shop</Badge>
                </div>
                <p className="mt-1.5 text-[13px] text-brand-muted">{shop?.tagline}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-brand-muted">
                  <span className="inline-flex items-center gap-1">
                    <Star size={12} className="fill-brand-accent text-brand-accent" />
                    <span className="font-semibold text-brand-text">{shop?.rating?.toFixed(1) ?? '4.7'}</span> ({shop?.ratingCount?.toLocaleString('en-IN') ?? '1,284'} ratings)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {shop?.city ?? 'Pune'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> {shop?.settings?.openingTime}–{shop?.settings?.closingTime}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to="/menu">
                <Button>Order food</Button>
              </Link>
              <Link to="/meal-boxes">
                <Button variant="secondary">
                  <Package size={15} /> Meal boxes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-12">
          <div>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Menu</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-brand-primary">Order from NEZTA</h2>
              </div>
              <Link to="/menu" className="text-[12.5px] font-semibold text-brand-secondary">
                View all
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.isLoading
                ? Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)
                : (products.data?.data ?? []).slice(0, 6).map((product) => (
                    <ProductCard key={product.id} product={product} compact />
                  ))}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Meal boxes</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-brand-primary">Build your thali</h2>
              </div>
              <Link to="/meal-boxes" className="text-[12.5px] font-semibold text-brand-secondary">
                Customize
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {mealBoxes.isLoading
                ? Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-32" />)
                : (mealBoxes.data?.data ?? []).slice(0, 2).map((box) => (
                    <Link
                      key={box.id}
                      to={`/meal-boxes?box=${box.slug}`}
                      className="group flex gap-3 overflow-hidden rounded-2xl border border-brand-border bg-white p-3 shadow-soft transition hover:border-brand-secondary/40"
                    >
                      <ImageWithFallback
                        src={box.imageUrl}
                        alt={box.name}
                        className="h-24 w-24 shrink-0 rounded-xl"
                        fallbackLabel={box.name.slice(0, 2)}
                      />
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold text-brand-text">{box.name}</p>
                        <p className="mt-0.5 text-[11px] text-brand-muted">
                          {box.servings} · {box.prepMinutes} min prep
                        </p>
                        <p className="mt-1 line-clamp-2 text-[11px] text-brand-muted">
                          {box.items.map((item) => item.label).join(' · ')}
                        </p>
                        <p className="mt-1.5 font-display text-[15px] font-semibold text-brand-primary">
                          {money(box.basePrice)}
                        </p>
                      </div>
                    </Link>
                  ))}
            </div>
          </div>

          <div>
            <div className="mb-4">
              <p className="eyebrow">Tiffin plans</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-brand-primary">Subscribe and forget lunch</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(plans.data?.data ?? []).map((plan) => (
                <Link
                  key={plan.id}
                  to="/tiffin-plans"
                  className="rounded-2xl border border-brand-border bg-white p-4 shadow-soft transition hover:border-brand-secondary/40"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-muted">{plan.planType}</p>
                  <p className="mt-1.5 font-display text-xl font-semibold text-brand-primary">{money(plan.price)}</p>
                  <p className="text-[11px] text-brand-muted">{plan.durationDays} days · {plan.deliveryWindow}</p>
                  {plan.savingsNote ? (
                    <p className="mt-2 text-[10.5px] font-semibold text-brand-secondary">{plan.savingsNote}</p>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-soft">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-brand-primary">
              <Store size={16} className="text-brand-secondary" /> Shop information
            </h3>
            <div className="mt-4 space-y-3 text-[12.5px] text-brand-muted">
              <p className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-brand-secondary" />
                {shop?.address ?? 'Shop 4, Silver Oak Plaza, Baner Road, Pune 411045'}
              </p>
              <p className="flex items-center gap-2">
                <Phone size={14} className="shrink-0 text-brand-secondary" />
                {shop?.phone ?? '+91 98200 11223'}
              </p>
              <p className="flex items-center gap-2">
                <Truck size={14} className="shrink-0 text-brand-secondary" />
                Delivery ${shop?.settings?.deliveryFee ? `₹${shop.settings.deliveryFee}` : '₹30'} · free above ₹
                {shop?.settings?.freeDeliveryAbove ?? 499}
              </p>
              <p className="flex items-center gap-2">
                <Bike size={14} className="shrink-0 text-brand-secondary" />
                Average 30–40 minutes
              </p>
            </div>
            <div className="mt-4 rounded-xl bg-brand-background p-3 text-[11px] leading-relaxed text-brand-muted">
              <span className="font-semibold text-brand-text">Sample ratings.</span> Review counts and ratings
              are illustrative demo data, not verified marketplace reviews.
            </div>
          </div>

          <div className="rounded-2xl bg-brand-primary p-5 text-white">
            <p className="eyebrow text-brand-accent">Corporate catering</p>
            <h3 className="mt-2 font-display text-lg font-semibold">Feed the whole office</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/60">
              Office lunches, school meals, hospital wards and events with a formal quotation flow.
            </p>
            <Link to="/bulk-orders" className="mt-4 block">
              <Button variant="gold" size="sm" className="w-full">
                Request a quotation
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-soft">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-brand-primary">
              <BadgeCheck size={16} className="text-brand-secondary" /> Why NEZTA
            </h3>
            <ul className="mt-3 space-y-2.5 text-[12px] text-brand-muted">
              {[
                'Cooked fresh, never reheated',
                'Jain and no onion-garlic options',
                'Skip any tiffin delivery date',
                'One kitchen, one quality standard',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/tiffin-plans" className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-secondary">
              <CalendarClock size={14} /> See tiffin plans
            </Link>
          </div>
        </aside>
      </section>
    </>
  );
}
