import { create } from "zustand";
import {
  getAuthErrorMessage,
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  register as apiRegister,
  type AuthUser,
} from "@/lib/api/auth";
import type { LoginData, RegisterData } from "@/types/auth";

export type AuthStatus = "idle" | "loading" | "authenticated" | "guest";

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  /** Lee la sesión vigente desde la cookie (`GET /api/auth/me`). */
  hydrate: () => Promise<void>;
  signIn: (data: LoginData) => Promise<AuthUser>;
  signUp: (data: RegisterData) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: "idle",
  error: null,

  hydrate: async () => {
    set({ status: "loading", error: null });
    try {
      const user = await apiMe();
      set({ user, status: "authenticated" });
    } catch {
      set({ user: null, status: "guest" });
    }
  },

  signIn: async (data) => {
    set({ status: "loading", error: null });
    try {
      const user = await apiLogin(data);
      set({ user, status: "authenticated" });
      return user;
    } catch (error) {
      set({
        status: "guest",
        error: getAuthErrorMessage(error, "No se pudo iniciar sesión."),
      });
      throw error;
    }
  },

  signUp: async (data) => {
    set({ status: "loading", error: null });
    try {
      // El registro deja la sesión activa de inmediato.
      const user = await apiRegister(data);
      set({ user, status: "authenticated" });
      return user;
    } catch (error) {
      set({
        status: "guest",
        error: getAuthErrorMessage(error, "No se pudo completar el registro."),
      });
      throw error;
    }
  },

  signOut: async () => {
    try {
      await apiLogout();
    } finally {
      set({ user: null, status: "guest", error: null });
    }
  },

  clearError: () => set({ error: null }),
}));
