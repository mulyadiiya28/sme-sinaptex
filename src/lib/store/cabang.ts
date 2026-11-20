"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cabang } from "@/lib/api/types";

type CabangState = {
  /** null = Pusat (semua cabang / tenant utuh). */
  cabangAktif: string | null;
  daftar: Cabang[];
  setCabangAktif: (id: string | null) => void;
  setDaftar: (daftar: Cabang[]) => void;
};

export const useCabang = create<CabangState>()(
  persist(
    (set) => ({
      cabangAktif: null,
      daftar: [],
      setCabangAktif: (cabangAktif) => set({ cabangAktif }),
      setDaftar: (daftar) => set({ daftar }),
    }),
    { name: "pos-sinaptex-cabang" },
  ),
);

/** Cabang yang sedang aktif, atau null bila "Pusat". */
export function cabangAktifId(): string | null {
  return useCabang.getState().cabangAktif;
}
