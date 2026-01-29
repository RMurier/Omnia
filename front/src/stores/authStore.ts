import { create } from "zustand";
import { authFetchResponse, signout } from "../utils/authFetch";

type AuthState = {
  isAuthenticated: boolean;
  hydrated: boolean;
  email: string | null;
  name: string | null;
  lastName: string | null;
  setAuthenticated: (v: boolean) => void;
  setUser: (email: string | null, name?: string | null, lastName?: string | null) => void;
  hydrateFromServer: () => Promise<void>;
  logout: (redirectTo?: string) => Promise<void>;
};

function redirectToSignin() {
  const from = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.href = `/signin?from=${encodeURIComponent(from)}`;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  hydrated: false,
  email: null,
  name: null,
  lastName: null,

  setAuthenticated: (v) => set({ isAuthenticated: v }),
  setUser: (email, name, lastName) => set({ email, name: name ?? null, lastName: lastName ?? null }),

  hydrateFromServer: async () => {
    try {
      const res = await authFetchResponse("/auth/me", { method: "GET", noRedirect: true });

      if (!res.ok) {
        set({ isAuthenticated: false, hydrated: true, email: null, name: null, lastName: null });
        return;
      }

      const data = (await res.json()) as { email?: string; name?: string; lastName?: string };
      set({
        isAuthenticated: true,
        hydrated: true,
        email: data?.email ?? null,
        name: data?.name ?? null,
        lastName: data?.lastName ?? null,
      });
    } catch {
      set({ isAuthenticated: false, hydrated: true, email: null, name: null, lastName: null });
    }
  },

  logout: async (redirectTo) => {
    try {
      await signout();
    } finally {
      set({ isAuthenticated: false, email: null, name: null, lastName: null });
      if (redirectTo) window.location.href = redirectTo;
      else redirectToSignin();
    }
  },
}));
