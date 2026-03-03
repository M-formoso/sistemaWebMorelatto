import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
        // También guardar token en localStorage para el api-client
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

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },
    }),
    {
      name: "morelatto-auth",
    }
  )
);
