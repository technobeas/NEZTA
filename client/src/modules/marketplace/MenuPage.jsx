import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Package, Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../../services/api.js';
import { ProductCard, ProductCardSkeleton } from '../../components/ProductCard.jsx';
import { Badge, Button, EmptyState, Input, Select, Tabs } from '../../components/ui/primitives.jsx';
import { cn, money } from '../../utils/format.js';

/** Debounce keeps the search API quiet while the presenter types. */
function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function MenuPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [sort, setSort] = useState('recommended');
  const debouncedSearch = useDebounced(search, 300);
  const activeCategory = searchParams.get('category') ?? 'all';

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => api('/categories') });
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', { search: debouncedSearch, category: activeCategory }],
    queryFn: () =>
      api('/products', {
        query: {
          search: debouncedSearch || undefined,
          category: activeCategory !== 'all' ? activeCategory : undefined,
          pageSize: 100,
        },
      }),
  });

  const products = useMemo(() => {
    const rows = data?.data ?? [];
    const copy = [...rows];
    if (sort === 'price-low') copy.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') copy.sort((a, b) => b.price - a.price);
    if (sort === 'name') copy.sort((a, b) => a.name.localeCompare(b.name));
    return copy;
  }, [data, sort]);

  const categoryOptions = [
    { value: 'all', label: 'All dishes' },
    ...(categories?.data ?? []).map((category) => ({ value: category.slug, label: category.name })),
  ];

  function setCategory(value) {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('category');
    else next.set('category', value);
    setSearchParams(next, { replace: true });
  }

  return (
    <>
      <section className="border-b border-brand-border bg-white">
        <div className="container-page py-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="eyebrow">Food menu</p>
              <h1 className="mt-2 font-display text-[34px] font-semibold text-brand-primary sm:text-[40px]">
                Today&apos;s kitchen, à la carte
              </h1>
              <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-brand-muted">
                Everything is cooked after you order. Ask for less spice or no onion-garlic in the notes at
                checkout — the kitchen reads every note.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success" dot>
                Accepting orders
              </Badge>
              <Badge tone="gold">Free delivery above ₹499</Badge>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search masala, dal, chapati, dessert…"
                className="pl-10"
                aria-label="Search the menu"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-brand-muted hover:bg-brand-soft"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <SlidersHorizontal size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                <Select value={sort} onChange={(event) => setSort(event.target.value)} className="pl-8 pr-9 lg:w-48">
                  <option value="recommended">Recommended</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="name">Name A–Z</option>
                </Select>
              </div>
              <Link to="/meal-boxes" className="hidden sm:block">
                <Button variant="secondary">
                  <Package size={15} /> Meal boxes
                </Button>
              </Link>
            </div>
          </div>

          <Tabs
            className="mt-4 w-fit max-w-full"
            options={categoryOptions}
            value={activeCategory}
            onChange={setCategory}
          />
        </div>
      </section>

      <section className="container-page py-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-brand-muted">
            {isLoading ? 'Loading dishes…' : `${products.length} ${products.length === 1 ? 'dish' : 'dishes'}`}
            {debouncedSearch ? ` for “${debouncedSearch}”` : ''}
            {isFetching && !isLoading ? <span className="ml-2 text-brand-secondary">updating…</span> : null}
          </p>
          <p className="hidden text-[11.5px] text-brand-muted sm:block">Prices include taxes · demo data</p>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No dishes match that search"
            description="Try a different keyword, or clear the filters to see the full menu."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setCategory('all');
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className={cn('mt-12 rounded-2xl border border-brand-accent/40 bg-brand-accent/10 p-6', 'sm:flex sm:items-center sm:justify-between sm:gap-6')}>
          <div>
            <h2 className="font-display text-xl font-semibold text-brand-primary">Feeding a team, not just yourself?</h2>
            <p className="mt-1.5 text-[13px] text-brand-muted">
              Bulk packages start at {money(95)} per person with a 50 meal minimum — quotation within one
              working day.
            </p>
          </div>
          <Link to="/bulk-orders" className="mt-4 inline-flex sm:mt-0">
            <Button>
              Explore bulk orders <ArrowRight size={15} />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
