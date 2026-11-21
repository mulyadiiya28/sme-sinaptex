"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotifikasiConfig = {
  aktif: boolean;
  provider: "telegram" | "wa";
  telegramBotToken: string;
  telegramChatId: string;
  waNomor: string;
};

export const NOTIFIKASI_DEFAULT: NotifikasiConfig = {
  aktif: false,
  provider: "telegram",
  telegramBotToken: "",
  telegramChatId: "",
  waNomor: "",
};

type State = {
  config: NotifikasiConfig;
  simpan: (c: NotifikasiConfig) => void;
  reset: () => void;
};

export const useNotifikasi = create<State>()(
  persist(
    (set) => ({
      config: NOTIFIKASI_DEFAULT,
      simpan: (config) => set({ config }),
      reset: () => set({ config: NOTIFIKASI_DEFAULT }),
    }),
    { name: "pos-sinaptex-notifikasi" },
  ),
);
