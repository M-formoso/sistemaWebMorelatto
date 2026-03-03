import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_token", token);
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
        }
      },
    }),
    {
      name: "morelatto-admin-auth",
    }
  )
);
