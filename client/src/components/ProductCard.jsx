import { useState } from 'react';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { ImageWithFallback } from './ui/primitives.jsx';
import { useCart } from '../stores/cart.js';
import { toast } from '../stores/ui.js';
import { cn, money } from '../utils/format.js';

export function VegMark({ isVeg = true, className }) {
  return (
    <span
      className={cn(
        'inline-flex h-4 w-4 items-center justify-center rounded-[3px] border bg-white',
        isVeg ? 'border-brand-secondary' : 'border-brand-danger',
        className,
      )}
      title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', isVeg ? 'bg-brand-secondary' : 'bg-brand-danger')} />
    </span>
  );
}

export function ProductCard({ product, compact = false, className }) {
  const [quantity, setQuantity] = useState(1);
  const addProduct = useCart((state) => state.addProduct);

  function add() {
    addProduct({ product, quantity });
    toast({
      title: `${product.name} added`,
      message: `${quantity} × ${money(product.price)} in your cart`,
      tone: 'success',
    });
    setQuantity(1);
  }

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-lift',
        className,
      )}
    >
      <div className="relative">
        <ImageWithFallback
          src={product.imageUrl}
          alt={product.name}
          className={cn('w-full', compact ? 'h-36' : 'h-44')}
          imgClassName="transition duration-300 group-hover:scale-[1.03]"
          fallbackLabel={product.name?.slice(0, 2)}
        />
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2 py-1 shadow-sm backdrop-blur">
          <VegMark isVeg={product.isVeg} />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-text">
            {product.categoryName ?? 'Kitchen'}
          </span>
        </div>
        {!product.isAvailable ? (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-primary/55 backdrop-blur-[1px]">
            <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-primary">
              Currently unavailable
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold leading-snug text-brand-text">{product.name}</h3>
          <p className="shrink-0 font-display text-[17px] font-semibold text-brand-primary">{money(product.price)}</p>
        </div>
        {product.description ? (
          <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-brand-muted">{product.description}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <div className="flex items-center rounded-xl border border-brand-border bg-brand-background/60">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-l-xl text-brand-muted transition hover:bg-white hover:text-brand-primary"
              aria-label="Decrease quantity"
            >
              <Minus size={13} />
            </button>
            <span className="w-6 text-center text-[13px] font-semibold text-brand-text">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(50, value + 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-r-xl text-brand-muted transition hover:bg-white hover:text-brand-primary"
              aria-label="Increase quantity"
            >
              <Plus size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={add}
            disabled={!product.isAvailable}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-primary px-3 text-[12px] font-semibold text-white transition hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShoppingBag size={13} />
            Add
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-soft">
      <div className="skeleton h-44 rounded-none" />
      <div className="space-y-3 p-4">
        <div className="flex justify-between gap-3">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-4 w-12" />
        </div>
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-4/5" />
        <div className="flex items-center justify-between pt-2">
          <div className="skeleton h-8 w-24" />
          <div className="skeleton h-8 w-16" />
        </div>
      </div>
    </div>
  );
}
