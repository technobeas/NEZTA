import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Cart line shape:
 *  { key, type: 'PRODUCT' | 'MEAL_BOX', productId?, mealBoxId?, name, imageUrl,
 *    unitPrice, quantity, notes, selections: [{ optionId, valueIds }],
 *    selectionLabels: [{ group, value }] }
 *
 * Prices shown here are an estimate for the UI; the API re-prices every cart
 * before an order is placed.
 */
export const useCart = create(
  persist(
    (set, get) => ({
      lines: [],
      couponCode: '',
      shopId: null,

      addProduct: ({ product, quantity = 1, notes = '' }) => {
        const key = `PRODUCT:${product.id}:${notes}`;
        const existing = get().lines.find((line) => line.key === key);
        if (existing) {
          set({
            lines: get().lines.map((line) =>
              line.key === key ? { ...line, quantity: Math.min(50, line.quantity + quantity) } : line,
            ),
          });
          return;
        }
        set({
          lines: [
            ...get().lines,
            {
              key,
              type: 'PRODUCT',
              productId: product.id,
              name: product.name,
              imageUrl: product.imageUrl,
              unitPrice: product.price,
              quantity,
              notes,
              selections: [],
              selectionLabels: [],
            },
          ],
          shopId: product.shopId ?? get().shopId,
        });
      },

      addMealBox: ({ mealBox, unitPrice, selections, selectionLabels, quantity = 1, notes = '' }) => {
        const signature = selections
          .map((selection) => `${selection.optionId}:${[...selection.valueIds].sort().join(',')}`)
          .sort()
          .join('|');
        const key = `MEAL_BOX:${mealBox.id}:${signature}:${notes}`;
        const existing = get().lines.find((line) => line.key === key);
        if (existing) {
          set({
            lines: get().lines.map((line) =>
              line.key === key ? { ...line, quantity: Math.min(50, line.quantity + quantity) } : line,
            ),
          });
          return;
        }
        set({
          lines: [
            ...get().lines,
            {
              key,
              type: 'MEAL_BOX',
              mealBoxId: mealBox.id,
              name: mealBox.name,
              imageUrl: mealBox.imageUrl,
              unitPrice,
              quantity,
              notes,
              selections,
              selectionLabels,
            },
          ],
          shopId: mealBox.shopId ?? get().shopId,
        });
      },

      setQuantity: (key, quantity) => {
        if (quantity <= 0) {
          set({ lines: get().lines.filter((line) => line.key !== key) });
          return;
        }
        set({
          lines: get().lines.map((line) =>
            line.key === key ? { ...line, quantity: Math.min(50, quantity) } : line,
          ),
        });
      },

      removeLine: (key) => set({ lines: get().lines.filter((line) => line.key !== key) }),
      setCoupon: (couponCode) => set({ couponCode }),
      clear: () => set({ lines: [], couponCode: '', shopId: null }),

      count: () => get().lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: () => get().lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),

      /** Payload accepted by POST /orders and POST /orders/quote. */
      toApiItems: () =>
        get().lines.map((line) =>
          line.type === 'MEAL_BOX'
            ? {
                type: 'MEAL_BOX',
                mealBoxId: line.mealBoxId,
                quantity: line.quantity,
                notes: line.notes || undefined,
                selections: line.selections,
              }
            : {
                type: 'PRODUCT',
                productId: line.productId,
                quantity: line.quantity,
                notes: line.notes || undefined,
              },
        ),
    }),
    {
      name: 'nezta.demo.cart',
      partialize: (state) => ({ lines: state.lines, couponCode: state.couponCode, shopId: state.shopId }),
    },
  ),
);
