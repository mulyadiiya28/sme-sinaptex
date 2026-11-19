"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { JenisLisensi } from "@/lib/license";

export type AktivasiTersimpan = {
  key: string;
  jenis: JenisLisensi;
  berakhirPada: string | null;
  mesinId: string;
  diaktifkanPada: string;
};

export type PengecualianAktivasi = "instalasi-lama" | "demo";

type AktivasiState = {
  syaratDisetujuiPada: string | null;
  aktivasi: AktivasiTersimpan | null;
  /** Toko yang sudah jalan, atau mode demo, tidak dikunci ulang. */
  pengecualian: PengecualianAktivasi | null;
  setujuiSyarat: () => void;
  simpanAktivasi: (a: AktivasiTersimpan) => void;
  cabutAktivasi: () => void;
  tandaiPengecualian: (p: PengecualianAktivasi) => void;
};

export const useAktivasi = create<AktivasiState>()(
  persist(
    (set) => ({
      syaratDisetujuiPada: null,
      aktivasi: null,
      pengecualian: null,
      setujuiSyarat: () => set({ syaratDisetujuiPada: new Date().toISOString() }),
      simpanAktivasi: (aktivasi) => set({ aktivasi, pengecualian: null }),
      cabutAktivasi: () => set({ aktivasi: null }),
      tandaiPengecualian: (pengecualian) => set({ pengecualian }),
    }),
    { name: "pos-sinaptex-aktivasi" },
  ),
);
