"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/api/types";

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  kedaluwarsa: number | null;
  setSession: (s: { user: User; accessToken: string; refreshToken: string; kedaluwarsa: number }) => void;
  clearSession: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      kedaluwarsa: null,
      setSession: ({ user, accessToken, refreshToken, kedaluwarsa }) => set({ user, accessToken, refreshToken, kedaluwarsa }),
      clearSession: () => set({ user: null, accessToken: null, refreshToken: null, kedaluwarsa: null }),
    }),
    {
      name: "pos-sinaptex-auth",
      partialize: (s) => ({ user: s.user, refreshToken: s.refreshToken, kedaluwarsa: s.kedaluwarsa }),
    },
  ),
);
