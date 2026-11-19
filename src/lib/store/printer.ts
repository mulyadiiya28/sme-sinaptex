"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LebarKertas } from "@/lib/printer/escpos";

export type PengaturanPrinter = {
  aktif: boolean;
  namaPrinter: string;
  lebarKertas: LebarKertas;
  salinan: number;
  autoPrint: boolean;
  potongKertas: boolean;
  bukaLaci: boolean;
};

type PrinterState = PengaturanPrinter & {
  simpan: (p: Partial<PengaturanPrinter>) => void;
  reset: () => void;
};

const DEFAULT: PengaturanPrinter = {
  aktif: false,
  namaPrinter: "",
  lebarKertas: 58,
  salinan: 1,
  autoPrint: true,
  potongKertas: true,
  bukaLaci: false,
};

export const usePrinter = create<PrinterState>()(
  persist(
    (set) => ({
      ...DEFAULT,
      simpan: (p) => set(p),
      reset: () => set(DEFAULT),
    }),
    { name: "pos-sinaptex-printer" },
  ),
);
