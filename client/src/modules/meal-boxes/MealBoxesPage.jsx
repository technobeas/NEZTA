import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Clock, Package, Sparkles, Users } from 'lucide-react';
import { api } from '../../services/api.js';
import { Badge, Button, ImageWithFallback, Skeleton } from '../../components/ui/primitives.jsx';
import { MealBoxCustomizer } from './MealBoxCustomizer.jsx';
import { money } from '../../utils/format.js';

export default function MealBoxesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeBox, setActiveBox] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: ['meal-boxes'], queryFn: () => api('/meal-boxes') });
  const boxes = data?.data ?? [];

  useEffect(() => {
    const slug = searchParams.get('box');
    if (!slug || !boxes.length) return;
    const match = boxes.find((box) => box.slug === slug || box.id === slug);
    if (match) setActiveBox(match);
  }, [searchParams, boxes]);

  function openBox(box) {
    setActiveBox(box);
    const next = new URLSearchParams(searchParams);
    next.set('box', box.slug);
    setSearchParams(next, { replace: true });
  }

  function closeBox() {
    setActiveBox(null);
    const next = new URLSearchParams(searchParams);
    next.delete('box');
    setSearchParams(next, { replace: true });
  }

  return (
    <>
      <section className="border-b border-brand-border bg-white">
        <div className="container-page py-10">
          <div className="max-w-2xl">
            <p className="eyebrow">Customizable meal boxes</p>
            <h1 className="mt-2 font-display text-[34px] font-semibold text-brand-primary sm:text-[42px]">
              Your thali, built your way
            </h1>
            <p className="mt-3 text-[14.5px] leading-relaxed text-brand-muted">
              Start with a NEZTA box, then choose the vegetable, dal, chapati count, rice portion, salad and
              add-ons. The price updates as you go, and the kitchen receives your exact selections with the
              order.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone="success" dot>
              Served fresh
            </Badge>
            <Badge tone="gold">Fully customizable</Badge>
            <Badge tone="muted">Editable from the shop dashboard</Badge>
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-80" />)
            : boxes.map((box) => (
                <article
                  key={box.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className="relative">
                    <ImageWithFallback
                      src={box.imageUrl}
                      alt={box.name}
                      className="h-44 w-full"
                      imgClassName="transition duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                      {box.badge ? <Badge tone="gold">{box.badge}</Badge> : <span />}
                      <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary shadow-sm backdrop-blur">
                        {box.servings}
                      </span>
                    </div>
                    {!box.isAvailable ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-brand-primary/50 text-[12px] font-semibold uppercase tracking-wide text-white">
                        Currently unavailable
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-display text-[17px] font-semibold text-brand-primary">{box.name}</h2>
                      <p className="shrink-0 font-display text-[17px] font-semibold text-brand-primary">
                        {money(box.basePrice)}
                      </p>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-brand-muted">{box.description}</p>

                    <ul className="mt-3 space-y-1">
                      {box.items.slice(0, 4).map((item) => (
                        <li key={item.id} className="flex items-start gap-1.5 text-[11.5px] text-brand-text">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-accent" />
                          {item.label}
                          {item.quantity > 1 ? <span className="text-brand-muted">×{item.quantity}</span> : null}
                        </li>
                      ))}
                      {box.items.length > 4 ? (
                        <li className="pl-2.5 text-[11px] text-brand-muted">+{box.items.length - 4} more items</li>
                      ) : null}
                    </ul>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[10.5px] text-brand-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} /> {box.prepMinutes} min
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Sparkles size={11} /> {box.options.length} customization groups
                      </span>
                    </div>

                    <div className="mt-auto flex items-center gap-2 pt-4">
                      <Button className="flex-1" onClick={() => openBox(box)} disabled={!box.isAvailable}>
                        Customize &amp; add
                      </Button>
                      <button
                        type="button"
                        onClick={() => openBox(box)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand-border text-brand-muted transition hover:border-brand-secondary/40 hover:text-brand-primary"
                        aria-label={`View ${box.name} details`}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
        </div>

        <div className="mt-10 grid gap-4 rounded-3xl border border-brand-border bg-white p-6 sm:grid-cols-3">
          {[
            {
              icon: Package,
              title: 'Built from real menu items',
              text: 'Meal boxes reference the live menu, so included dishes and add-on prices stay in sync.',
            },
            {
              icon: Users,
              title: 'Family & office sizes',
              text: 'From mini lunch boxes to family spreads that serve four — all customizable.',
            },
            {
              icon: Sparkles,
              title: 'Exact selections, every time',
              text: 'Selections are stored with the order and printed on the kitchen ticket.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl bg-brand-background p-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-secondary shadow-sm">
                <item.icon size={16} />
              </span>
              <p className="mt-3 text-[13px] font-semibold text-brand-primary">{item.title}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-brand-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <MealBoxCustomizer mealBox={activeBox} open={Boolean(activeBox)} onClose={closeBox} />
    </>
  );
}
