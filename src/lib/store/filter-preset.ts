"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FilterPreset = {
  nama: string;
  keyword: string;
  dari: string;
  sampai: string;
  statusFilter: "semua" | "lunas" | "menunggu_pembayaran" | "menunggu_persetujuan" | "dibayar_sebagian" | "dibatalkan";
  metodeFilter: "semua" | "tunai" | "transfer" | "qris";
};

type State = {
  presets: FilterPreset[];
  simpan: (preset: FilterPreset) => void;
  hapus: (nama: string) => void;
};

export const useFilterPreset = create<State>()(
  persist(
    (set) => ({
      presets: [],
      simpan: (preset) =>
        set((s) => {
          const lain = s.presets.filter((p) => p.nama !== preset.nama);
          return { presets: [...lain, preset] };
        }),
      hapus: (nama) => set((s) => ({ presets: s.presets.filter((p) => p.nama !== nama) })),
    }),
    { name: "pos-sinaptex-filter-preset" },
  ),
);