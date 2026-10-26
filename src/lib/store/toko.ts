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
};

type TokoState = {
  profil: ProfilToko;
  simpan: (p: ProfilToko) => void;
  reset: () => void;
};

export const useToko = create<TokoState>()(
  persist(
    (set) => ({
      profil: DEFAULT,
      simpan: (profil) => set({ profil }),
      reset: () => set({ profil: DEFAULT }),
    }),
    { name: "pos-sinaptex-toko" },
  ),
);
