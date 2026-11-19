"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GatewayProvider = "umum" | "midtrans" | "xendit";
export type GatewayAuth = "bearer" | "basic" | "x-api-key";

export type GatewayConfig = {
  aktif: boolean;
  provider: GatewayProvider;
  mode: "sandbox" | "produksi";
  baseUrl: string;
  apiKey: string;
  merchantId: string;
  auth: GatewayAuth;
  headerName: string;
  pathBuat: string;
  pathStatus: string;
  kodeAkunGateway: string;
  intervalPolling: number;
  timeoutDetik: number;
};

export const GATEWAY_DEFAULT: GatewayConfig = {
  aktif: false,
  provider: "midtrans",
  mode: "sandbox",
  baseUrl: "https://api.sandbox.midtrans.com",
  apiKey: "",
  merchantId: "",
  auth: "basic",
  headerName: "X-Api-Key",
  pathBuat: "/charges",
  pathStatus: "/charges/{id}",
  kodeAkunGateway: "",
  intervalPolling: 5,
  timeoutDetik: 30,
};

type GatewayState = {
  config: GatewayConfig;
  simpan: (config: GatewayConfig) => void;
  reset: () => void;
};

export const useGateway = create<GatewayState>()(
  persist(
    (set) => ({
      config: GATEWAY_DEFAULT,
      simpan: (config) => set({ config }),
      reset: () => set({ config: GATEWAY_DEFAULT }),
    }),
    { name: "pos-sinaptex-gateway" },
  ),
);
