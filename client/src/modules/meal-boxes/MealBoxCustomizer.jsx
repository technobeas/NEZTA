import { useEffect, useMemo, useState } from 'react';
import { Check, Info, Minus, Plus, ShoppingBag, Sparkles } from 'lucide-react';
import { Badge, Button, ImageWithFallback, Modal, Textarea } from '../../components/ui/primitives.jsx';
import { useCart } from '../../stores/cart.js';
import { toast } from '../../stores/ui.js';
import { cn, money } from '../../utils/format.js';

function defaultSelections(mealBox) {
  const state = {};
  for (const option of mealBox.options) {
    const defaults = option.values.filter((value) => value.isDefault).map((value) => value.id);
    if (defaults.length && !(option.type === 'ADDON' && option.values.some((value) => /no /i.test(value.label) && value.isDefault))) {
      state[option.id] = option.type === 'SINGLE' ? defaults.slice(0, 1) : defaults;
    } else if (option.values.some((value) => /skip|no /i.test(value.label))) {
      const skip = option.values.find((value) => /skip|no /i.test(value.label));
      state[option.id] = [skip.id];
    } else {
      state[option.id] = option.type === 'SINGLE' && option.isRequired ? [option.values[0].id] : [];
    }
  }
  return state;
}

export function MealBoxCustomizer({ mealBox, open, onClose, startQuantity = 1 }) {
  const addMealBox = useCart((state) => state.addMealBox);
  const [selections, setSelections] = useState({});
  const [quantity, setQuantity] = useState(startQuantity);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && mealBox) {
      setSelections(defaultSelections(mealBox));
      setQuantity(startQuantity);
      setNotes('');
      setError('');
    }
  }, [open, mealBox, startQuantity]);

  const chosen = useMemo(() => {
    if (!mealBox) return [];
    return mealBox.options.map((option) => {
      const ids = selections[option.id] ?? [];
      return {
        option,
        values: ids.map((id) => option.values.find((value) => value.id === id)).filter(Boolean),
      };
    });
  }, [mealBox, selections]);

  const unitPrice = useMemo(() => {
    if (!mealBox) return 0;
    const deltas = chosen.reduce(
      (sum, entry) => sum + entry.values.reduce((valueSum, value) => valueSum + Number(value.priceDelta || 0), 0),
      0,
    );
    return Math.round((Number(mealBox.basePrice) + deltas) * 100) / 100;
  }, [mealBox, chosen]);

  if (!mealBox) return null;

  const isNoneValue = (entry) => /^(no|skip|none)\b/i.test(entry.label);

  function toggleValue(option, value) {
    setError('');

    setSelections((previous) => {
      const current = previous[option.id] ?? [];
      const isSelected = current.includes(value.id);

      if (option.type === 'SINGLE') {
        return { ...previous, [option.id]: [value.id] };
      }

      if (isSelected) {
        return { ...previous, [option.id]: current.filter((id) => id !== value.id) };
      }

      // "No dessert" and a real dessert cannot be chosen together.
      const withoutNone = current.filter((id) => {
        const selected = option.values.find((entry) => entry.id === id);
        return selected ? !isNoneValue(selected) : true;
      });
      const base = isNoneValue(value) ? [] : withoutNone;

      if (base.length >= option.maxSelect) {
        if (option.maxSelect === 1) return { ...previous, [option.id]: [value.id] };
        return previous;
      }

      return { ...previous, [option.id]: [...base, value.id] };
    });

    const current = selections[option.id] ?? [];
    const wouldOverflow =
      option.type !== 'SINGLE' &&
      !current.includes(value.id) &&
      !isNoneValue(value) &&
      current.filter((id) => {
        const selected = option.values.find((entry) => entry.id === id);
        return selected ? !isNoneValue(selected) : true;
      }).length >= option.maxSelect;
    if (wouldOverflow && option.maxSelect > 1) {
      setError(`${option.label}: choose at most ${option.maxSelect}`);
    }
  }

  function validate() {
    for (const option of mealBox.options) {
      const count = (selections[option.id] ?? []).length;
      if (option.isRequired && count < Math.max(1, option.minSelect)) {
        return `Choose ${option.minSelect} option for ${option.label}`;
      }
      if (count > option.maxSelect) return `${option.label}: choose at most ${option.maxSelect}`;
    }
    return '';
  }

  function addToCart() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const apiSelections = mealBox.options
      .map((option) => ({
        optionId: option.id,
        valueIds: selections[option.id] ?? [],
      }))
      .filter((selection) => selection.valueIds.length > 0);

    const selectionLabels = chosen.flatMap((entry) =>
      entry.values.map((value) => ({ group: entry.option.label, value: value.label, priceDelta: value.priceDelta })),
    );

    addMealBox({
      mealBox,
      unitPrice,
      selections: apiSelections,
      selectionLabels,
      quantity,
      notes: notes.trim(),
    });

    toast({
      title: `${mealBox.name} added`,
      message: `${quantity} × ${money(unitPrice)} with ${selectionLabels.length} customizations`,
      tone: 'success',
    });
    onClose?.();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Customize ${mealBox.name}`}
      subtitle={`${mealBox.servings} · ready in ${mealBox.prepMinutes} minutes · base ${money(mealBox.basePrice)}`}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-brand-muted">Your price</p>
            <div className="flex items-baseline gap-1.5">
              <p className="font-display text-2xl font-semibold text-brand-primary">{money(unitPrice)}</p>
              <span className="text-[11px] text-brand-muted">per box</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-brand-border bg-white">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="inline-flex h-10 w-10 items-center justify-center text-brand-muted hover:text-brand-primary"
                aria-label="Decrease boxes"
              >
                <Minus size={14} />
              </button>
              <span className="w-7 text-center text-sm font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                className="inline-flex h-10 w-10 items-center justify-center text-brand-muted hover:text-brand-primary"
                aria-label="Increase boxes"
              >
                <Plus size={14} />
              </button>
            </div>
            <Button onClick={addToCart} className="flex-1 sm:flex-none">
              <ShoppingBag size={15} /> Add {money(unitPrice * quantity)}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
        <div>
          <ImageWithFallback src={mealBox.imageUrl} alt={mealBox.name} className="h-36 w-full rounded-2xl sm:h-44" />
          <div className="mt-3 rounded-xl bg-brand-background p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">In the box</p>
            <ul className="mt-2 space-y-1.5">
              {mealBox.items.map((item) => (
                <li key={item.id} className="flex items-start gap-1.5 text-[11.5px] text-brand-text">
                  <Check size={12} className="mt-0.5 shrink-0 text-brand-secondary" />
                  {item.label}
                  {item.quantity > 1 ? <span className="text-brand-muted">×{item.quantity}</span> : null}
                </li>
              ))}
            </ul>
          </div>
          {mealBox.prepMinutes ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-brand-muted">
              <Sparkles size={12} className="text-brand-accent" /> Cooked to order · {mealBox.prepMinutes} min
            </p>
          ) : null}
        </div>

        <div className="space-y-5">
          {mealBox.options.map((option) => {
            const selectedIds = selections[option.id] ?? [];
            return (
              <div key={option.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13px] font-semibold text-brand-text">
                    {option.label}
                    {option.isRequired ? <span className="ml-1 text-brand-danger">*</span> : null}
                  </p>
                  <p className="text-[10.5px] text-brand-muted">
                    {option.type === 'SINGLE'
                      ? option.isRequired
                        ? 'Choose 1'
                        : 'Optional'
                      : option.type === 'ADDON'
                        ? 'Optional add-ons'
                        : `Choose ${option.minSelect}${option.maxSelect !== option.minSelect ? `–${option.maxSelect}` : ''}`}
                  </p>
                </div>
                {option.helpText ? <p className="mt-0.5 text-[11px] text-brand-muted">{option.helpText}</p> : null}

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {option.values.map((value) => {
                    const active = selectedIds.includes(value.id);
                    return (
                      <button
                        key={value.id}
                        type="button"
                        onClick={() => toggleValue(option, value)}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-[12px] transition',
                          active
                            ? 'border-brand-secondary bg-brand-secondary/8 text-brand-primary shadow-sm'
                            : 'border-brand-border bg-white text-brand-text hover:border-brand-secondary/40',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                              active ? 'border-brand-secondary bg-brand-secondary text-white' : 'border-brand-border',
                            )}
                          >
                            {active ? <Check size={10} /> : null}
                          </span>
                          {value.label}
                        </span>
                        {Number(value.priceDelta) > 0 ? (
                          <span className="shrink-0 text-[11px] font-semibold text-brand-secondary">
                            +{money(value.priceDelta)}
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] uppercase tracking-wide text-brand-muted">incl.</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div>
            <p className="text-[13px] font-semibold text-brand-text">Kitchen notes</p>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Less spicy, no onion-garlic, ring the bell twice…"
              rows={2}
              className="mt-1.5"
              maxLength={200}
            />
          </div>

          {error ? (
            <p className="flex items-center gap-1.5 rounded-lg bg-[#FBEAE5] px-3 py-2 text-[12px] font-medium text-brand-danger">
              <Info size={13} /> {error}
            </p>
          ) : null}

          <div className="rounded-xl border border-brand-border bg-brand-background p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Your selection</p>
            <div className="mt-2 space-y-1.5">
              {chosen.filter((entry) => entry.values.length).length === 0 ? (
                <p className="text-[11.5px] text-brand-muted">Pick your options above to build this box.</p>
              ) : (
                chosen
                  .filter((entry) => entry.values.length)
                  .map((entry) => (
                    <div key={entry.option.id} className="flex items-start justify-between gap-3 text-[11.5px]">
                      <span className="text-brand-muted">{entry.option.label}</span>
                      <span className="text-right font-medium text-brand-text">
                        {entry.values.map((value) => value.label).join(', ')}
                      </span>
                    </div>
                  ))
              )}
            </div>
            <div className="mt-3 border-t border-brand-border pt-2 text-[11px] text-brand-muted">
              <div className="flex justify-between">
                <span>Base box</span>
                <span>{money(mealBox.basePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Customizations</span>
                <span>{money(unitPrice - Number(mealBox.basePrice))}</span>
              </div>
              <div className="mt-1 flex justify-between text-[12px] font-semibold text-brand-primary">
                <span>Price per box</span>
                <span>{money(unitPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default MealBoxCustomizer;
