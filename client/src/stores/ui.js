import { create } from 'zustand';

let counter = 0;

export const useUi = create((set, get) => ({
  toasts: [],

  toast: ({ title, message, tone = 'success', duration = 4200 }) => {
    const id = ++counter;
    set({ toasts: [...get().toasts, { id, title, message, tone }] });
    if (duration) {
      window.setTimeout(() => get().dismiss(id), duration);
    }
    return id;
  },

  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));

export function toast({ title, message, tone = 'success' }) {
  useUi.getState().toast({ title, message, tone });
}

export function toastError(error, fallback = 'Please try again in a moment.') {
  const message = error?.message ?? fallback;
  useUi.getState().toast({ title: 'Something went wrong', message, tone: 'error' });
}
