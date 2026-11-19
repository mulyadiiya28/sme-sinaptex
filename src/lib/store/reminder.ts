"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TahapReminder = "jatuhTempo" | "h1" | "h3" | "h7";

export type TemplateReminder = Record<TahapReminder, string>;

export type ReminderLog = {
  id: string;
  invoiceId: string;
  invoiceNumber: string | null;
  pelangganNama: string;
  telepon: string;
  nominal: number;
  tahap: TahapReminder;
  pesan: string;
  dikirimPada: string;
};

type ReminderState = {
  template: TemplateReminder;
  log: ReminderLog[];
  catat: (entri: ReminderLog) => void;
  simpanTemplate: (template: TemplateReminder) => void;
  hapusLog: () => void;
  reset: () => void;
};

export const TEMPLATE_DEFAULT: TemplateReminder = {
  jatuhTempo:
    "Halo {nama}, tagihan {nomor} sebesar {nominal} jatuh tempo hari ini ({jatuhTempo}). Mohon segera melakukan pembayaran. Terima kasih — {toko}",
  h1: "Halo {nama}, tagihan {nomor} sebesar {nominal} akan jatuh tempo besok ({jatuhTempo}). Mohon siapkan pembayaran. Terima kasih — {toko}",
  h3: "Halo {nama}, tagihan {nomor} sebesar {nominal} sudah lewat 3 hari dari jatuh tempo ({jatuhTempo}). Mohon segera melakukan pembayaran. Terima kasih — {toko}",
  h7: "Halo {nama}, tagihan {nomor} sebesar {nominal} sudah lewat 7 hari dari jatuh tempo ({jatuhTempo}). Mohon segera melakukan pembayaran. Terima kasih — {toko}",
};

export const useReminder = create<ReminderState>()(
  persist(
    (set) => ({
      template: TEMPLATE_DEFAULT,
      log: [],
      catat: (entri) => set((s) => ({ log: [entri, ...s.log].slice(0, 500) })),
      simpanTemplate: (template) => set({ template }),
      hapusLog: () => set({ log: [] }),
      reset: () => set({ template: TEMPLATE_DEFAULT, log: [] }),
    }),
    { name: "pos-sinaptex-reminder" },
  ),
);
