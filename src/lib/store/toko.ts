"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProfilToko } from "@/lib/api/types";

const DEFAULT: ProfilToko = {
  nama: "Toko Utama",
  alamat: "Jl. Merdeka No. 12, Jakarta",
  telepon: "",
  mataUang: "IDR",
  zonaWaktu: "Asia/Jakarta",
  footerStruk: "Terima kasih atas kunjungan Anda",
  pajakPersen: 0,
};

type TokoState = {
  profil: ProfilToko;
  kebijakan: { izinkanKredit: boolean; saldoAwalShift: number };
  simpan: (p: ProfilToko) => void;
  simpanKebijakan: (k: TokoState["kebijakan"]) => void;
  reset: () => void;
};

const DEFAULT_KEBIJAKAN: TokoState["kebijakan"] = { izinkanKredit: true, saldoAwalShift: 0 };

export const useToko = create<TokoState>()(
  persist(
    (set) => ({
      profil: DEFAULT,
      kebijakan: DEFAULT_KEBIJAKAN,
      simpan: (profil) => set({ profil }),
      simpanKebijakan: (kebijakan) => set({ kebijakan }),
      reset: () => set({ profil: DEFAULT, kebijakan: DEFAULT_KEBIJAKAN }),
    }),
    { name: "pos-sinaptex-toko" },
  ),
);
