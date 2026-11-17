import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  ChefHat,
  Clock,
  Flame,
  Leaf,
  MapPin,
  Package,
  Phone,
  Quote,
  Sparkles,
  Star,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ProductCard, ProductCardSkeleton } from '../../components/ProductCard.jsx';
import { Badge, Button, ImageWithFallback, SectionHeading, Skeleton } from '../../components/ui/primitives.jsx';
import { cn, formatDateOnly, money } from '../../utils/format.js';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80';
const BOX_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80';
const TIFFIN_IMAGE =
  'https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=900&q=80';
const CATERING_IMAGE =
  'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80';

function useHomeData() {
  const shop = useQuery({ queryKey: ['shop-public'], queryFn: () => api('/shop/public') });
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api('/products?all=true') });
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api('/categories') });
  const mealBoxes = useQuery({ queryKey: ['meal-boxes'], queryFn: () => api('/meal-boxes') });
  const plans = useQuery({ queryKey: ['tiffin-plans'], queryFn: () => api('/tiffin-plans') });
  const packages = useQuery({ queryKey: ['bulk-packages'], queryFn: () => api('/bulk-packages') });
  return { shop, products, categories, mealBoxes, plans, packages };
}

function Hero({ shop }) {
  return (
    <section className="relative overflow-hidden bg-brand-primary text-white">
      <div className="hero-grain absolute inset-0" />
      <div className="container-page relative grid gap-10 py-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-20">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/80"
          >
            <span className="inline-flex items-center gap-1 text-brand-accent">
              <Star size={11} className="fill-brand-accent" /> {shop?.rating?.toFixed(1) ?? '4.7'}
            </span>
            <span className="h-3 w-px bg-white/20" />
            {shop?.ratingCount?.toLocaleString('en-IN') ?? '1,284'} happy diners in Pune
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="font-display text-[40px] font-semibold leading-[1.05] sm:text-[54px] lg:text-[58px]"
          >
            Ghar ka khana,
            <br />
            <span className="text-brand-accent">delivered warm.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/70"
          >
            Fresh Maharashtrian meals cooked in small batches. Build your own meal box, subscribe to a tiffin
            plan, or let NEZTA cater your next office lunch.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link to="/menu">
              <Button variant="gold" size="lg">
                Order food <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to="/meal-boxes">
              <Button
                size="lg"
                className="border border-white/20 bg-white/5 text-white hover:bg-white/10"
                variant="ghost"
              >
                <Package size={16} /> Build a meal box
              </Button>
            </Link>
          </motion.div>

          <div className="mt-9 grid max-w-lg grid-cols-3 gap-3 border-t border-white/10 pt-6 text-[11.5px]">
            {[
              [Clock, '30–40 min', 'Kitchen to door'],
              [Truck, 'Free delivery', 'Above ₹499'],
              [Leaf, 'Fresh daily', 'Small-batch cooking'],
            ].map(([Icon, title, subtitle]) => (
              <div key={title} className="flex items-start gap-2">
                <Icon size={15} className="mt-0.5 shrink-0 text-brand-accent" />
                <div>
                  <p className="font-semibold text-white/90">{title}</p>
                  <p className="mt-0.5 text-white/50">{subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative hidden lg:block"
        >
          <div className="relative mx-auto aspect-[4/4.4] w-full max-w-[440px]">
            <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-[28px] border border-brand-accent/30" />
            <ImageWithFallback
              src={shop?.bannerUrl ?? HERO_IMAGE}
              alt="NEZTA home-style thali"
              className="relative h-full w-full rounded-[28px] shadow-lift"
              fallbackLabel="NEZTA"
            />
            <div className="absolute -left-6 top-8 w-[190px] rounded-2xl border border-brand-border bg-white p-3.5 text-brand-text shadow-lift">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent/25 text-[#7c6324]">
                  <ChefHat size={15} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-brand-primary">Today&apos;s special</p>
                  <p className="text-[10px] text-brand-muted">Kolhapuri veg masala</p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-brand-primary">₹120</span>
                <span className="rounded-full bg-brand-secondary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-secondary">
                  Fresh
                </span>
              </div>
            </div>
            <div className="absolute -right-4 bottom-10 w-[210px] rounded-2xl border border-brand-border bg-white p-3.5 text-brand-text shadow-lift">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Tiffin plans</p>
              <p className="mt-1 font-display text-lg font-semibold text-brand-primary">₹2,800 / month</p>
              <p className="text-[10.5px] text-brand-muted">30 lunches · 2 skip days · priority slot</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-soft">
                <div className="h-full w-[82%] rounded-full bg-brand-accent" />
              </div>
              <p className="mt-1.5 text-[9.5px] font-medium text-brand-secondary">Saves ₹800 vs daily orders</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CategoryStrip({ categories, loading }) {
  const icons = [UtensilsCrossed, Leaf, Flame, Sparkles, ChefHat, BadgeCheck];
  return (
    <section className="container-page -mt-7 relative z-10">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        {(loading ? Array.from({ length: 6 }) : categories ?? []).map((category, index) => {
          const Icon = icons[index % icons.length];
          return (
            <Link
              key={category?.id ?? index}
              to={category ? `/menu?category=${category.slug}` : '/menu'}
              className="group flex items-center gap-3 rounded-2xl border border-brand-border bg-white px-3.5 py-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              {loading ? (
                <>
                  <div className="skeleton h-9 w-9 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3 w-3/4" />
                    <div className="skeleton h-2 w-1/2" />
                  </div>
                </>
              ) : (
                <>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary/5 text-brand-secondary transition group-hover:bg-brand-primary group-hover:text-brand-accent">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-brand-text">{category.name}</p>
                    <p className="text-[10.5px] text-brand-muted">
                      {category.productCount ?? 0} {category.productCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function PopularMeals({ products, loading }) {
  const featured = (products ?? []).filter((product) => product.isFeatured).slice(0, 4);
  const rest = (products ?? []).filter((product) => !product.isFeatured).slice(0, 4);
  const list = [...featured, ...rest].slice(0, 4);

  return (
    <section className="container-page py-16">
      <SectionHeading
        eyebrow="Popular right now"
        title="The dishes Pune keeps reordering"
        description="A tight, honest menu. Every plate is cooked to order with seasonal produce and cold-pressed oils."
        action={
          <Link to="/menu">
            <Button variant="secondary">
              Full menu <ArrowRight size={15} />
            </Button>
          </Link>
        }
      />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => <ProductCardSkeleton key={index} />)
          : list.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}

function TodaysMenu({ products }) {
  const [active, setActive] = useState('All');
  const categories = ['All', ...new Set((products ?? []).map((product) => product.categoryName).filter(Boolean))];
  const visible = (products ?? []).filter(
    (product) => active === 'All' || product.categoryName === active,
  );

  return (
    <section className="border-y border-brand-border bg-white">
      <div className="container-page py-12 sm:py-16">
        <div className="grid gap-8 sm:gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="min-w-0">
            <SectionHeading
              eyebrow="Today's menu"
              title="Cooked this morning, gone by evening"
              description="Our kitchen publishes a short daily menu. Ask for less spice, no onion-garlic, or extra chapatis at checkout."
            />
            <div className="mt-6 rounded-2xl border border-brand-border bg-brand-background p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary text-brand-accent">
                  <Clock size={17} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-brand-primary">Kitchen hours</p>
                  <p className="text-[12px] text-brand-muted">9:30 AM – 10:30 PM · Last order 10:00 PM</p>
                </div>
              </div>
              <div className="mt-4 h-px bg-brand-border" />
              <div className="mt-4 flex items-start gap-2 text-[12px] text-brand-muted">
                <MapPin size={14} className="mt-0.5 shrink-0 text-brand-secondary" />
                <p>Delivering across Baner, Aundh, Balewadi and Wakad. Free delivery above ₹499.</p>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActive(category)}
                  className={cn(
                    'whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition',
                    active === category
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-brand-border bg-white text-brand-muted hover:border-brand-secondary/40 hover:text-brand-primary',
                  )}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="mt-3 divide-y divide-brand-border overflow-hidden rounded-2xl border border-brand-border">
              {visible.slice(0, 6).map((product) => (
                <div key={product.id} className="flex items-center gap-3 bg-white px-4 py-3.5">
                  <ImageWithFallback
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-14 w-14 shrink-0 rounded-xl"
                    fallbackLabel={product.name.slice(0, 2)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13.5px] font-semibold text-brand-text">{product.name}</p>
                      {product.isFeatured ? <Badge tone="gold">Bestseller</Badge> : null}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11.5px] text-brand-muted">{product.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-semibold text-brand-primary">{money(product.price)}</p>
                    <Link to="/menu" className="text-[11px] font-medium text-brand-secondary hover:underline">
                      Add
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/menu" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-secondary">
              See the full menu <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function MealBoxFeature({ mealBoxes, loading }) {
  return (
    <section className="relative overflow-hidden bg-brand-primary py-16 text-white">
      <div className="hero-grain absolute inset-0 opacity-70" />
      <div className="container-page relative">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-xl">
            <p className="eyebrow text-brand-accent">Meal boxes</p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-[36px]">Your thali, your rules</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-white/65">
              Pick a box, then choose the vegetable, dal, chapati count, rice portion and add-ons. The price
              updates live and the kitchen sees exactly what you picked.
            </p>
          </div>
          <Link to="/meal-boxes">
            <Button variant="gold">
              Customize a box <ArrowRight size={15} />
            </Button>
          </Link>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {(loading ? Array.from({ length: 3 }) : (mealBoxes ?? []).slice(0, 3)).map((box, index) => (
            <Link
              key={box?.id ?? index}
              to={box ? `/meal-boxes?box=${box.slug}` : '/meal-boxes'}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition hover:border-brand-accent/40"
            >
              {loading ? (
                <div className="skeleton h-40 rounded-none bg-white/10" />
              ) : (
                <ImageWithFallback
                  src={box.imageUrl}
                  alt={box.name}
                  className="h-40 w-full"
                  imgClassName="transition duration-300 group-hover:scale-[1.03]"
                  fallbackLabel={box.name.slice(0, 2)}
                />
              )}
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-semibold text-white">
                    {loading ? <span className="inline-block h-3.5 w-32 rounded bg-white/10" /> : box.name}
                  </p>
                  {!loading ? <Badge tone="gold">{box.servings}</Badge> : null}
                </div>
                <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-white/50">
                  {loading ? 'Loading meal box details…' : box.items.map((item) => item.label).join(' · ')}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="font-display text-lg font-semibold text-brand-accent">
                    {loading ? '—' : money(box.basePrice)}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/70">
                    Customize <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function TiffinSection({ plans, loading }) {
  return (
    <section className="container-page py-16">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <SectionHeading
            eyebrow="Tiffin subscriptions"
            title="Lunch sorted, every working day"
            description="Recurring home-style meals with pause, resume and skip controls. Pick daily, weekly or monthly — no lock-in, no paperwork."
          />
          <div className="mt-6 space-y-3">
            {[
              'Pause before you travel, resume when you are back',
              'Skip a specific delivery date in two taps',
              'The kitchen generates each day of tiffins automatically',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-[13px] text-brand-muted">
                <BadgeCheck size={16} className="mt-0.5 shrink-0 text-brand-secondary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <Link to="/tiffin-plans" className="mt-7 inline-flex">
            <Button variant="secondary">
              Compare tiffin plans <ArrowRight size={15} />
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(loading ? Array.from({ length: 3 }) : plans ?? []).map((plan, index) => (
            <div
              key={plan?.id ?? index}
              className={cn(
                'relative rounded-2xl border bg-white p-5 shadow-soft',
                plan?.planType === 'MONTHLY' ? 'border-brand-accent shadow-lift' : 'border-brand-border',
              )}
            >
              {plan?.planType === 'MONTHLY' ? (
                <span className="absolute -top-2.5 left-5 rounded-full bg-brand-accent px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-brand-primary">
                  Best value
                </span>
              ) : null}
              {loading ? (
                <div className="space-y-3">
                  <div className="skeleton h-3 w-20" />
                  <div className="skeleton h-7 w-24" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-4/5" />
                </div>
              ) : (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-muted">{plan.planType}</p>
                  <p className="mt-2 font-display text-[26px] font-semibold text-brand-primary">{money(plan.price)}</p>
                  <p className="text-[11.5px] text-brand-muted">
                    {plan.durationDays} {plan.durationDays === 1 ? 'day' : 'days'} · {plan.mealType}
                  </p>
                  <ul className="mt-4 space-y-2 text-[11.5px] text-brand-muted">
                    {plan.items.slice(0, 4).map((item) => (
                      <li key={item.id} className="flex items-start gap-1.5">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-accent" />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                  {plan.savingsNote ? (
                    <p className="mt-3 rounded-lg bg-brand-secondary/8 px-2 py-1.5 text-[10.5px] font-semibold text-brand-secondary">
                      {plan.savingsNote}
                    </p>
                  ) : null}
                  <Link to="/tiffin-plans" className="mt-4 block">
                    <Button size="sm" variant={plan.planType === 'MONTHLY' ? 'primary' : 'secondary'} className="w-full">
                      Choose plan
                    </Button>
                  </Link>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BulkSection({ packages }) {
  return (
    <section className="border-y border-brand-border bg-white">
      <div className="container-page grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="relative overflow-hidden rounded-3xl">
          <ImageWithFallback src={CATERING_IMAGE} alt="Corporate catering spread" className="h-[320px] w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/85 via-brand-primary/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <div className="flex flex-wrap gap-2">
              {['Offices', 'Schools', 'Hospitals', 'Events'].map((tag) => (
                <span key={tag} className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-3 font-display text-2xl font-semibold text-white">From 15 to 500 meals, on schedule.</p>
          </div>
        </div>

        <div>
          <p className="eyebrow">Bulk &amp; corporate</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-brand-primary sm:text-[34px]">
            Catering that keeps its promises
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-brand-muted">
            Send an enquiry, receive a proper quotation, and confirm once you are happy. The kitchen plans
            production from the confirmed order — no spreadsheets on WhatsApp.
          </p>

          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {(packages ?? []).slice(0, 4).map((pkg) => (
              <Link
                key={pkg.id}
                to={`/bulk-orders?package=${pkg.slug}`}
                className="group flex items-start justify-between gap-2 rounded-xl border border-brand-border bg-brand-background/50 px-3.5 py-3 transition hover:border-brand-secondary/40 hover:bg-white"
              >
                <div>
                  <p className="text-[12.5px] font-semibold text-brand-text">{pkg.name}</p>
                  <p className="mt-0.5 text-[10.5px] text-brand-muted">
                    Min {pkg.minQuantity} · {money(pkg.perPersonPrice)}/person
                  </p>
                </div>
                <ArrowRight size={14} className="mt-1 shrink-0 text-brand-muted transition group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/bulk-orders">
              <Button>
                <Building2 size={16} /> Request a quotation
              </Button>
            </Link>
            <a href="tel:+919820011223">
              <Button variant="secondary">
                <Phone size={15} /> Talk to us
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Offers({ coupons }) {
  return (
    <section className="container-page py-14">
      <div className="rounded-3xl border border-brand-accent/40 bg-gradient-to-br from-brand-accent/20 via-white to-brand-accent/10 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Special offers</p>
            <h3 className="mt-1.5 font-display text-2xl font-semibold text-brand-primary">Save on your first NEZTA order</h3>
            <p className="mt-1.5 text-[13px] text-brand-muted">Apply a sample coupon at checkout — discounts are demo calculations only.</p>
          </div>
          <Link to="/menu">
            <Button variant="gold">
              Order now <ArrowRight size={15} />
            </Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {(coupons ?? []).map((coupon) => (
            <div
              key={coupon.code}
              className="relative overflow-hidden rounded-xl border border-dashed border-brand-accent bg-white/80 px-4 py-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[13px] font-bold tracking-wider text-brand-primary">{coupon.code}</p>
                <Badge tone="gold">
                  {coupon.type === 'PERCENT' ? `${coupon.value}% off` : `${money(coupon.value)} off`}
                </Badge>
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-brand-muted">{coupon.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutAndContact({ shop }) {
  return (
    <section id="about" className="container-page grid gap-10 pb-20 lg:grid-cols-2">
      <div>
        <SectionHeading eyebrow="About NEZTA" title="Built around one simple idea" />
        <p className="mt-4 text-[14.5px] leading-relaxed text-brand-muted">
          Food should taste like someone cared. NEZTA started as a two-person kitchen in Baner, cooking the
          same meals we feed our own families. Today we serve office lunches, school meals, hospital wards and
          family functions across Pune — but the kitchen still cooks in small batches, and the masalas are still
          ground in-house.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ['200+', 'Meals every day'],
            ['4.7★', 'Average rating'],
            ['9 yrs', 'Cooking for Pune'],
            ['100%', 'Fresh, no preservatives'],
            ['30 min', 'Average delivery'],
            ['15+', 'Corporate clients'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl border border-brand-border bg-white px-3 py-3">
              <p className="font-display text-lg font-semibold text-brand-primary">{value}</p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-brand-muted">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-brand-primary p-5 text-white">
          <Quote size={22} className="mt-0.5 shrink-0 text-brand-accent" />
          <div>
            <p className="text-[13px] leading-relaxed text-white/80">
              &ldquo;The tiffin plan changed my weekdays. Food arrives warm at 12:30, and I can skip a day when
              I travel — no calls, no arguments.&rdquo;
            </p>
            <p className="mt-2 text-[11px] font-semibold text-brand-accent">Riya S. · Monthly tiffin subscriber</p>
          </div>
        </div>
      </div>

      <div>
        <SectionHeading eyebrow="Visit &amp; contact" title="Come say hello" />
        <div className="mt-5 overflow-hidden rounded-2xl border border-brand-border bg-white">
          <ImageWithFallback src={CATERING_IMAGE} alt="NEZTA kitchen" className="h-44 w-full" />
          <div className="space-y-3 p-5 text-[13px]">
            <p className="flex items-start gap-2.5">
              <MapPin size={15} className="mt-0.5 shrink-0 text-brand-secondary" />
              <span className="text-brand-muted">
                <span className="font-medium text-brand-text">{shop?.name ?? 'NEZTA'}</span>
                <br />
                {shop?.address ?? 'Shop 4, Silver Oak Plaza, Baner Road, Pune 411045'}
              </span>
            </p>
            <p className="flex items-center gap-2.5">
              <Phone size={15} className="shrink-0 text-brand-secondary" />
              <span className="text-brand-muted">{shop?.phone ?? '+91 98200 11223'}</span>
            </p>
            <p className="flex items-center gap-2.5">
              <Clock size={15} className="shrink-0 text-brand-secondary" />
              <span className="text-brand-muted">
                Open daily {shop?.settings?.openingTime ?? '09:30'} – {shop?.settings?.closingTime ?? '22:30'}
              </span>
            </p>
            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              <Link to="/bulk-orders">
                <Button variant="secondary" className="w-full">
                  <Building2 size={15} /> Bulk enquiry
                </Button>
              </Link>
              <Link to="/tiffin-plans">
                <Button variant="secondary" className="w-full">
                  <CalendarClock size={15} /> Tiffin plans
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { shop, products, categories, mealBoxes, plans, packages } = useHomeData();
  const shopData = shop.data?.data;

  return (
    <>
      <Hero shop={shopData} />
      <CategoryStrip categories={categories.data?.data} loading={categories.isLoading} />
      <PopularMeals products={products.data?.data} loading={products.isLoading} />
      <TodaysMenu products={products.data?.data ?? []} />
      <MealBoxFeature mealBoxes={mealBoxes.data?.data} loading={mealBoxes.isLoading} />
      <TiffinSection plans={plans.data?.data} loading={plans.isLoading} />
      <BulkSection packages={packages.data?.data} />
      <Offers coupons={shopData?.coupons} />
      <AboutAndContact shop={shopData} />
    </>
  );
}
