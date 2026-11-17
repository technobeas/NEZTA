import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api.js';
import { readToken, writeToken } from '../services/session.js';

export const useAuth = create(
  persist(
    (set, get) => ({
      token: readToken(),
      user: null,
      shop: null,
      demoMode: true,
      hydrated: false,

      setSession: ({ token, user, shop = null }) => {
        writeToken(token);
        set({ token, user, shop: shop ?? get().shop, demoMode: true });
      },

      patchUser: (partial) => set({ user: { ...(get().user ?? {}), ...partial } }),

      refresh: async () => {
        const token = get().token ?? readToken();
        if (!token) {
          set({ user: null, token: null });
          return null;
        }
        try {
          const payload = await api('/auth/me', { token });
          set({ token, user: payload.user, shop: payload.shop ?? null, demoMode: true });
          return payload.user;
        } catch {
          writeToken(null);
          set({ token: null, user: null, shop: null });
          return null;
        }
      },

      login: async ({ email, password }) => {
        const payload = await api('/auth/login', { method: 'POST', body: { email, password } });
        writeToken(payload.token);
        set({ token: payload.token, user: payload.user, demoMode: true });
        return payload.user;
      },

      switchRole: async (role) => {
        const payload = await api('/auth/switch-role', { method: 'POST', body: { role } });
        writeToken(payload.token);
        set({ token: payload.token, user: payload.user, demoMode: true });
        return payload.user;
      },

      logout: () => {
        writeToken(null);
        set({ token: null, user: null, shop: null });
      },

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'nezta.demo.session',
      partialize: (state) => ({ token: state.token, user: state.user, shop: state.shop }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          writeToken(state.token);
        }
        state?.setHydrated?.();
      },
    },
  ),
);

export function hasRole(user, ...roles) {
  return Boolean(user && roles.includes(user.role));
}
