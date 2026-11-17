import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Image as ImageIcon, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { api } from '../../services/api.js';
import { PageHeader } from '../../layouts/PortalLayout.jsx';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Field,
  ImageWithFallback,
  Input,
  Modal,
  Select,
  Skeleton,
  Switch,
  Textarea,
} from '../../components/ui/primitives.jsx';
import { toast, toastError } from '../../stores/ui.js';
import { money } from '../../utils/format.js';

const EMPTY_PRODUCT = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  imageUrl: '',
  preparationMinutes: 15,
  isVeg: true,
  isAvailable: true,
  isFeatured: false,
};

export default function ShopMenu() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [availability, setAvailability] = useState('all');

  // available=all keeps hidden dishes in the catalogue view so they can be switched back on.
  const products = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => api('/products?all=true&available=all'),
  });
  const categories = useQuery({ queryKey: ['categories', 'all'], queryFn: () => api('/categories?all=true') });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api(`/products/${editing.id}`, { method: 'PATCH', body: payload })
        : api('/products', { method: 'POST', body: payload }),
    onSuccess: () => {
      toast({ title: editing ? 'Product updated' : 'Product added', tone: 'success' });
      setEditorOpen(false);
      setEditing(null);
      setForm(EMPTY_PRODUCT);
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not save the product'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, data }) => api(`/products/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (payload, variables) => {
      invalidate();
      if ('isAvailable' in variables.data) {
        toast({
          title: variables.data.isAvailable ? `${payload.data.name} is available` : `${payload.data.name} hidden from the menu`,
          message: variables.data.isAvailable
            ? 'Customers can order it again right away.'
            : 'It stays in your catalogue — tap again to restore it.',
          tone: variables.data.isAvailable ? 'success' : 'info',
        });
      }
    },
    onError: (error) => toastError(error, 'Could not update the product'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: (payload) => {
      toast({
        title: payload.meta?.archived ? 'Product archived' : 'Product removed',
        message: payload.meta?.message,
        tone: 'info',
      });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not delete the product'),
  });

  const categoryMutation = useMutation({
    mutationFn: () => api('/categories', { method: 'POST', body: { name: categoryName } }),
    onSuccess: () => {
      toast({ title: 'Category added', tone: 'success' });
      setCategoryName('');
      setCategoryOpen(false);
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not add the category'),
  });

  const rows = products.data?.data ?? [];
  const availableCount = rows.filter((product) => product.isAvailable).length;
  const unavailableCount = rows.length - availableCount;

  const filtered = useMemo(() => {
    let list = products.data?.data ?? [];
    if (availability === 'available') list = list.filter((product) => product.isAvailable);
    if (availability === 'unavailable') list = list.filter((product) => !product.isAvailable);
    if (!search) return list;
    const term = search.toLowerCase();
    return list.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        (product.categoryName ?? '').toLowerCase().includes(term),
    );
  }, [products.data, search, availability]);

  function openEditor(product) {
    setEditing(product ?? null);
    setForm(
      product
        ? {
            name: product.name,
            description: product.description ?? '',
            price: product.price,
            categoryId: product.categoryId ?? '',
            imageUrl: product.imageUrl ?? '',
            preparationMinutes: product.preparationMinutes,
            isVeg: product.isVeg,
            isAvailable: product.isAvailable,
            isFeatured: product.isFeatured,
          }
        : EMPTY_PRODUCT,
    );
    setEditorOpen(true);
  }

  function submit() {
    if (!form.name.trim() || !Number(form.price)) {
      toastError(new Error('Add a name and a price above zero'), 'Product needs a name and price');
      return;
    }
    saveMutation.mutate({
      name: form.name.trim(),
      description: form.description || null,
      price: Number(form.price),
      categoryId: form.categoryId || null,
      imageUrl: form.imageUrl || null,
      preparationMinutes: Number(form.preparationMinutes) || 15,
      isVeg: form.isVeg,
      isAvailable: form.isAvailable,
      isFeatured: form.isFeatured,
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title="Menu & products"
        description="Prices, availability and descriptions are stored in PostgreSQL — changes appear on the customer site immediately."
        actions={
          <>
            <Button variant="secondary" onClick={() => setCategoryOpen(true)}>
              <Plus size={15} /> Category
            </Button>
            <Button onClick={() => openEditor(null)}>
              <Plus size={15} /> Add product
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(categories.data?.data ?? []).map((category) => (
          <Badge key={category.id} tone="muted">
            {category.name}
          </Badge>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border p-4">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" className="pl-9" />
          </div>
          <p className="text-[11px] text-brand-muted">{filtered.length} products · editable demo catalogue</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-brand-border px-4 py-3">
          {[
            ['all', 'All dishes', rows.length],
            ['available', 'Available', availableCount],
            ['unavailable', 'Unavailable', unavailableCount],
          ].map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setAvailability(value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${
                availability === value
                  ? 'bg-brand-primary text-white'
                  : 'bg-brand-soft text-brand-muted hover:text-brand-primary'
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${availability === value ? 'bg-white/15' : 'bg-white'}`}>
                {count}
              </span>
            </button>
          ))}
          {unavailableCount > 0 ? (
            <p className="ml-auto hidden items-center gap-1.5 text-[10.5px] text-brand-muted sm:flex">
              <EyeOff size={11} /> Hidden dishes stay here and can be restored any time.
            </p>
          ) : null}
        </div>

        {products.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[320px] sm:min-w-[560px]">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="hidden sm:table-cell">Category</th>
                  <th>Price</th>
                  <th className="hidden lg:table-cell">Prep</th>
                  <th className="hidden sm:table-cell">Available</th>
                  <th className="hidden md:table-cell">Featured</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className={product.isAvailable ? '' : 'bg-brand-soft/40'}>
                    <td>
                      <div className="flex items-center gap-3">
                        <ImageWithFallback
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-10 w-10 shrink-0 rounded-lg"
                          fallbackLabel={product.name.slice(0, 2)}
                        />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold text-brand-text">{product.name}</p>
                          <p className="line-clamp-1 max-w-[150px] text-[10.5px] text-brand-muted sm:max-w-[260px]">
                            {product.description}
                          </p>
                          {/* Mobile keeps the availability switch in the first column so it never needs a horizontal scroll */}
                          <button
                            type="button"
                            onClick={() =>
                              toggleMutation.mutate({ id: product.id, data: { isAvailable: !product.isAvailable } })
                            }
                            aria-pressed={product.isAvailable}
                            className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition sm:hidden ${
                              product.isAvailable
                                ? 'border-brand-secondary/25 bg-brand-secondary/10 text-brand-secondary'
                                : 'border-brand-danger/30 bg-[#FBEAE5] text-brand-danger'
                            }`}
                          >
                            {product.isAvailable ? <Eye size={10} /> : <EyeOff size={10} />}
                            {product.isAvailable ? 'Available' : 'Make available'}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="hidden text-[11.5px] text-brand-muted sm:table-cell">
                      {product.categoryName ?? '—'}
                    </td>
                    <td className="text-[12.5px] font-semibold text-brand-primary">{money(product.price)}</td>
                    <td className="hidden text-[11.5px] text-brand-muted lg:table-cell">{product.preparationMinutes} min</td>
                    <td className="hidden sm:table-cell">
                      <button
                        type="button"
                        onClick={() => toggleMutation.mutate({ id: product.id, data: { isAvailable: !product.isAvailable } })}
                        aria-pressed={product.isAvailable}
                        title={product.isAvailable ? 'Tap to mark unavailable' : 'Tap to make available again'}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition ${
                          product.isAvailable
                            ? 'border-brand-secondary/25 bg-brand-secondary/10 text-brand-secondary hover:border-brand-danger/40 hover:bg-[#FBEAE5] hover:text-brand-danger'
                            : 'border-brand-border bg-white text-brand-muted hover:border-brand-secondary/40 hover:text-brand-secondary'
                        }`}
                      >
                        {product.isAvailable ? <Eye size={11} /> : <EyeOff size={11} />}
                        {product.isAvailable ? 'Available' : 'Make available'}
                      </button>
                      <p className="mt-1 hidden text-[9.5px] text-brand-muted sm:block">
                        {product.isAvailable ? 'Tap to hide' : 'Hidden on the storefront'}
                      </p>
                    </td>
                    <td className="hidden md:table-cell">
                      <button
                        type="button"
                        onClick={() => toggleMutation.mutate({ id: product.id, data: { isFeatured: !product.isFeatured } })}
                        className={product.isFeatured ? 'text-brand-accent' : 'text-brand-muted'}
                        aria-label="Toggle featured"
                      >
                        <Star size={15} className={product.isFeatured ? 'fill-brand-accent' : ''} />
                      </button>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditor(product)}
                          className="rounded-lg p-1.5 text-brand-muted hover:bg-brand-background hover:text-brand-primary"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          className="rounded-lg p-1.5 text-brand-muted hover:bg-[#FBEAE5] hover:text-brand-danger"
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[12px] text-brand-muted">
                      {availability === 'unavailable'
                        ? 'Every dish is currently available.'
                        : 'No dishes match this search.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-3 text-[11px] text-brand-muted">
        Products used in past orders are archived instead of deleted so historical orders keep their line items.
      </p>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add a product'}
        subtitle="Prices are stored as PostgreSQL NUMERIC and served to the customer site."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saveMutation.isPending}>
              {editing ? 'Save changes' : 'Add product'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Product name" required className="sm:col-span-2">
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Special Vegetable Masala" />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
          <Field label="Price (₹)" required>
            <Input type="number" min={1} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
          </Field>
          <Field label="Category">
            <Select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
              <option value="">Uncategorised</option>
              {(categories.data?.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Preparation time (minutes)">
            <Input
              type="number"
              min={0}
              max={240}
              value={form.preparationMinutes}
              onChange={(event) => setForm({ ...form, preparationMinutes: event.target.value })}
            />
          </Field>
          <Field label="Image URL" hint="Cloudinary URLs fit the planned production setup.">
            <div className="relative">
              <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <Input
                value={form.imageUrl}
                onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
                className="pl-8"
                placeholder="https://…"
              />
            </div>
          </Field>
          <div className="space-y-3 rounded-xl border border-brand-border p-3 sm:col-span-2">
            <Switch checked={form.isAvailable} onChange={(value) => setForm({ ...form, isAvailable: value })} label="Available to order" description="Turn off to hide this dish without deleting it" />
            <Switch checked={form.isFeatured} onChange={(value) => setForm({ ...form, isFeatured: value })} label="Featured" description="Shows as a bestseller on the storefront" />
            <Switch checked={form.isVeg} onChange={(value) => setForm({ ...form, isVeg: value })} label="Vegetarian" description="Shows the green vegetarian mark" />
          </div>
        </div>
      </Modal>

      <Modal
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        title="Add a category"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCategoryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => categoryMutation.mutate()} loading={categoryMutation.isPending} disabled={!categoryName.trim()}>
              Add category
            </Button>
          </div>
        }
      >
        <Field label="Category name" required>
          <Input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Combos" />
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title={`Delete ${deleteTarget?.name ?? 'product'}?`}
        description="If this product appears in past orders it will be archived (hidden) instead of removed, keeping order history intact."
        confirmLabel="Delete"
        tone="danger"
      />
    </div>
  );
}
