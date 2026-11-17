import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Package, Pencil, Plus, Trash2 } from 'lucide-react';
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

function emptyOption() {
  return {
    label: '',
    type: 'SINGLE',
    minSelect: 1,
    maxSelect: 1,
    isRequired: true,
    helpText: '',
    values: [
      { label: '', priceDelta: 0, isDefault: true },
      { label: '', priceDelta: 0, isDefault: false },
    ],
  };
}

const EMPTY_BOX = {
  name: '',
  description: '',
  imageUrl: '',
  basePrice: '',
  servings: 'Serves 1',
  prepMinutes: 25,
  badge: '',
  isAvailable: true,
  isFeatured: false,
  items: [{ label: '', quantity: 1 }],
  options: [emptyOption()],
};

export default function ShopMealBoxes() {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_BOX);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['meal-boxes', 'all'], queryFn: () => api('/meal-boxes?all=true') });
  const boxes = data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['meal-boxes'] });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api(`/meal-boxes/${editing.id}`, { method: 'PATCH', body: payload })
        : api('/meal-boxes', { method: 'POST', body: payload }),
    onSuccess: () => {
      toast({ title: editing ? 'Meal box updated' : 'Meal box created', tone: 'success' });
      setEditorOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not save the meal box'),
  });

  const toggle = useMutation({
    mutationFn: ({ id, data }) => api(`/meal-boxes/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => invalidate(),
    onError: (error) => toastError(error, 'Could not update the meal box'),
  });

  const remove = useMutation({
    mutationFn: (id) => api(`/meal-boxes/${id}`, { method: 'DELETE' }),
    onSuccess: (payload) => {
      toast({ title: payload.meta?.archived ? 'Meal box hidden' : 'Meal box deleted', message: payload.meta?.message, tone: 'info' });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not delete the meal box'),
  });

  function openEditor(box) {
    setEditing(box ?? null);
    setForm(
      box
        ? {
            name: box.name,
            description: box.description ?? '',
            imageUrl: box.imageUrl ?? '',
            basePrice: box.basePrice,
            servings: box.servings,
            prepMinutes: box.prepMinutes,
            badge: box.badge ?? '',
            isAvailable: box.isAvailable,
            isFeatured: box.isFeatured,
            items: box.items.length ? box.items.map((item) => ({ label: item.label, quantity: item.quantity })) : [{ label: '', quantity: 1 }],
            options: box.options.length
              ? box.options.map((option) => ({
                  label: option.label,
                  type: option.type,
                  minSelect: option.minSelect,
                  maxSelect: option.maxSelect,
                  isRequired: option.isRequired,
                  helpText: option.helpText ?? '',
                  values: option.values.map((value) => ({
                    label: value.label,
                    priceDelta: value.priceDelta,
                    isDefault: value.isDefault,
                  })),
                }))
              : [emptyOption()],
          }
        : EMPTY_BOX,
    );
    setEditorOpen(true);
  }

  function updateOption(index, patch) {
    setForm({
      ...form,
      options: form.options.map((option, optionIndex) => (optionIndex === index ? { ...option, ...patch } : option)),
    });
  }

  function updateValue(optionIndex, valueIndex, patch) {
    setForm({
      ...form,
      options: form.options.map((option, index) =>
        index === optionIndex
          ? {
              ...option,
              values: option.values.map((value, vIndex) => (vIndex === valueIndex ? { ...value, ...patch } : value)),
            }
          : option,
      ),
    });
  }

  function submit() {
    const items = form.items.filter((item) => item.label.trim());
    const options = form.options
      .filter((option) => option.label.trim())
      .map((option) => ({
        ...option,
        minSelect: Number(option.minSelect),
        maxSelect: Number(option.maxSelect),
        values: option.values
          .filter((value) => value.label.trim())
          .map((value) => ({ label: value.label.trim(), priceDelta: Number(value.priceDelta) || 0, isDefault: Boolean(value.isDefault) })),
      }));

    if (!form.name.trim() || !Number(form.basePrice)) {
      toastError(new Error('A meal box needs a name and a base price'), 'Missing meal box details');
      return;
    }
    if (!options.length || options.some((option) => !option.values.length)) {
      toastError(new Error('Each customization group needs at least one choice'), 'Customization incomplete');
      return;
    }

    saveMutation.mutate({
      name: form.name.trim(),
      description: form.description || null,
      imageUrl: form.imageUrl || null,
      basePrice: Number(form.basePrice),
      servings: form.servings,
      prepMinutes: Number(form.prepMinutes) || 25,
      badge: form.badge || null,
      isAvailable: form.isAvailable,
      isFeatured: form.isFeatured,
      items,
      options,
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title="Meal boxes"
        description="Configure boxes, included items, required choices and paid add-ons. The customer customizer is driven entirely by this data."
        actions={
          <Button onClick={() => openEditor(null)}>
            <Plus size={15} /> New meal box
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {boxes.map((box) => (
            <Card key={box.id} className="overflow-hidden">
              <div className="flex gap-3 p-4">
                <ImageWithFallback src={box.imageUrl} alt={box.name} className="h-24 w-24 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[13.5px] font-semibold text-brand-primary">{box.name}</p>
                      <p className="text-[11px] text-brand-muted">
                        {box.servings} · {box.prepMinutes} min · {money(box.basePrice)}
                      </p>
                    </div>
                    <Badge tone={box.isAvailable ? 'success' : 'muted'}>{box.isAvailable ? 'Available' : 'Hidden'}</Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] text-brand-muted">{box.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge tone="muted">
                      <Layers size={10} /> {box.options.length} groups
                    </Badge>
                    <Badge tone="muted">
                      <Package size={10} /> {box.items.length} items
                    </Badge>
                    {box.isFeatured ? <Badge tone="gold">Featured</Badge> : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-border bg-brand-background/40 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[10.5px] text-brand-muted">
                    <input
                      type="checkbox"
                      checked={box.isAvailable}
                      onChange={() => toggle.mutate({ id: box.id, data: { isAvailable: !box.isAvailable } })}
                      className="h-3.5 w-3.5 rounded border-brand-border text-brand-secondary"
                    />
                    Available
                  </label>
                  <label className="flex items-center gap-1.5 text-[10.5px] text-brand-muted">
                    <input
                      type="checkbox"
                      checked={box.isFeatured}
                      onChange={() => toggle.mutate({ id: box.id, data: { isFeatured: !box.isFeatured } })}
                      className="h-3.5 w-3.5 rounded border-brand-border text-brand-secondary"
                    />
                    Featured
                  </label>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => openEditor(box)}>
                    <Pencil size={12} /> Edit
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(box)}
                    className="rounded-lg p-2 text-brand-muted hover:bg-[#FBEAE5] hover:text-brand-danger"
                    aria-label={`Delete ${box.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        size="xl"
        title={editing ? `Edit ${editing.name}` : 'Create a meal box'}
        subtitle="Customization groups are validated by the API when a customer adds the box to their cart."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saveMutation.isPending}>
              {editing ? 'Save meal box' : 'Create meal box'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Name" required className="sm:col-span-2">
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Special Veg Meal Box" />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
          <Field label="Base price (₹)" required>
            <Input type="number" min={1} value={form.basePrice} onChange={(event) => setForm({ ...form, basePrice: event.target.value })} />
          </Field>
          <Field label="Servings label">
            <Input value={form.servings} onChange={(event) => setForm({ ...form, servings: event.target.value })} />
          </Field>
          <Field label="Preparation minutes">
            <Input type="number" min={0} value={form.prepMinutes} onChange={(event) => setForm({ ...form, prepMinutes: event.target.value })} />
          </Field>
          <Field label="Badge (optional)">
            <Input value={form.badge} onChange={(event) => setForm({ ...form, badge: event.target.value })} placeholder="Most customizable" />
          </Field>
          <Field label="Image URL" className="sm:col-span-2">
            <Input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://…" />
          </Field>

          <div className="sm:col-span-2 rounded-xl border border-brand-border p-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-brand-primary">Included items</p>
              <button
                type="button"
                className="text-[11px] font-semibold text-brand-secondary"
                onClick={() => setForm({ ...form, items: [...form.items, { label: '', quantity: 1 }] })}
              >
                + Add item
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {form.items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={item.label}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        items: form.items.map((entry, itemIndex) =>
                          itemIndex === index ? { ...entry, label: event.target.value } : entry,
                        ),
                      })
                    }
                    placeholder="Special Vegetable Masala"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        items: form.items.map((entry, itemIndex) =>
                          itemIndex === index ? { ...entry, quantity: Number(event.target.value) } : entry,
                        ),
                      })
                    }
                    className="w-20"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })}
                    className="rounded-lg px-2 text-brand-muted hover:text-brand-danger"
                    aria-label="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-brand-primary">Customization groups</p>
              <button
                type="button"
                className="text-[11px] font-semibold text-brand-secondary"
                onClick={() => setForm({ ...form, options: [...form.options, emptyOption()] })}
              >
                + Add group
              </button>
            </div>

            <div className="mt-2 space-y-3">
              {form.options.map((option, optionIndex) => (
                <div key={optionIndex} className="rounded-xl border border-brand-border bg-brand-background/40 p-3">
                  <div className="grid gap-2 sm:grid-cols-[1.4fr_0.9fr_0.6fr_0.6fr_auto]">
                    <Input
                      value={option.label}
                      onChange={(event) => updateOption(optionIndex, { label: event.target.value })}
                      placeholder="Group name e.g. Chapati"
                    />
                    <Select value={option.type} onChange={(event) => updateOption(optionIndex, { type: event.target.value })}>
                      <option value="SINGLE">Pick one</option>
                      <option value="MULTI">Pick multiple</option>
                      <option value="ADDON">Optional add-on</option>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      value={option.minSelect}
                      onChange={(event) => updateOption(optionIndex, { minSelect: Number(event.target.value) })}
                      aria-label="Minimum selections"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={option.maxSelect}
                      onChange={(event) => updateOption(optionIndex, { maxSelect: Number(event.target.value) })}
                      aria-label="Maximum selections"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, options: form.options.filter((_, index) => index !== optionIndex) })}
                      className="rounded-lg px-2 text-brand-muted hover:text-brand-danger"
                      aria-label="Remove group"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[10.5px] text-brand-muted">
                      <input
                        type="checkbox"
                        checked={option.isRequired}
                        onChange={(event) => updateOption(optionIndex, { isRequired: event.target.checked })}
                        className="h-3.5 w-3.5 rounded border-brand-border text-brand-secondary"
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      className="text-[10.5px] font-semibold text-brand-secondary"
                      onClick={() =>
                        updateOption(optionIndex, {
                          values: [...option.values, { label: '', priceDelta: 0, isDefault: false }],
                        })
                      }
                    >
                      + Add choice
                    </button>
                  </div>

                  <div className="mt-2 space-y-1.5">
                    {option.values.map((value, valueIndex) => (
                      <div key={valueIndex} className="flex items-center gap-2">
                        <Input
                          value={value.label}
                          onChange={(event) => updateValue(optionIndex, valueIndex, { label: event.target.value })}
                          placeholder="Choice label"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={value.priceDelta}
                          onChange={(event) => updateValue(optionIndex, valueIndex, { priceDelta: Number(event.target.value) })}
                          className="w-24"
                          aria-label="Extra charge"
                        />
                        <label className="flex shrink-0 items-center gap-1 text-[10px] text-brand-muted">
                          <input
                            type="radio"
                            name={`default-${optionIndex}`}
                            checked={value.isDefault}
                            onChange={() =>
                              updateOption(optionIndex, {
                                values: option.values.map((entry, index) => ({
                                  ...entry,
                                  isDefault: index === valueIndex,
                                })),
                              })
                            }
                            className="h-3 w-3 text-brand-secondary"
                          />
                          default
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            updateOption(optionIndex, {
                              values: option.values.filter((_, index) => index !== valueIndex),
                            })
                          }
                          className="rounded px-1 text-brand-muted hover:text-brand-danger"
                          aria-label="Remove choice"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2 space-y-3 rounded-xl border border-brand-border p-3">
            <Switch checked={form.isAvailable} onChange={(value) => setForm({ ...form, isAvailable: value })} label="Available to order" />
            <Switch checked={form.isFeatured} onChange={(value) => setForm({ ...form, isFeatured: value })} label="Featured on the storefront" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => remove.mutate(deleteTarget.id)}
        loading={remove.isPending}
        title={`Delete ${deleteTarget?.name ?? 'meal box'}?`}
        description="Meal boxes referenced by past orders are hidden rather than deleted."
        confirmLabel="Delete"
        tone="danger"
      />
    </div>
  );
}
