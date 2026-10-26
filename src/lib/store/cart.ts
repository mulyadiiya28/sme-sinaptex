import { create } from "zustand";
import type { CartLine, Product, PaymentAllocation, PaymentMethod } from "@/lib/api/types";

type CartState = {
  lines: CartLine[];
  diskonTransaksi: number;
  allocations: PaymentAllocation[];
  gunakanPiutang: boolean;
  pelanggan?: string;
  add: (product: Product) => void;
  setQty: (productId: string, qty: number) => void;
  removeLine: (productId: string) => void;
  setDiskonTransaksi: (nominal: number) => void;
  addAllocation: (metode: PaymentMethod, nominal: number) => void;
  updateAllocation: (index: number, nominal: number) => void;
  removeAllocation: (index: number) => void;
  setPiutang: (pakai: boolean) => void;
  setPelanggan: (nama?: string) => void;
  reset: () => void;
};

export const useCart = create<CartState>((set) => ({
  lines: [],
  diskonTransaksi: 0,
  allocations: [],
  gunakanPiutang: false,
  pelanggan: undefined,
  add: (product) =>
    set((state) => {
      const ada = state.lines.find((l) => l.product.id === product.id);
      if (ada) {
        return {
          lines: state.lines.map((l) =>
            l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l,
          ),
        };
      }
      return { lines: [...state.lines, { product, qty: 1, diskon: 0 }] };
    }),
  setQty: (productId, qty) =>
    set((state) => ({
      lines:
        qty <= 0
          ? state.lines.filter((l) => l.product.id !== productId)
          : state.lines.map((l) => (l.product.id === productId ? { ...l, qty } : l)),
    })),
  removeLine: (productId) =>
    set((state) => ({ lines: state.lines.filter((l) => l.product.id !== productId) })),
  setDiskonTransaksi: (nominal) => set({ diskonTransaksi: Math.max(0, nominal || 0) }),
  addAllocation: (metode, nominal) =>
    set((state) => ({ allocations: [...state.allocations, { metode, rekening: metode === "tunai" ? "Kas toko" : "Bank utama", nominal }] })),
  updateAllocation: (index, nominal) =>
    set((state) => ({
      allocations: state.allocations.map((a, i) => (i === index ? { ...a, nominal: Math.max(0, nominal || 0) } : a)),
    })),
  removeAllocation: (index) =>
    set((state) => ({ allocations: state.allocations.filter((_, i) => i !== index) })),
  setPiutang: (pakai) => set({ gunakanPiutang: pakai }),
  setPelanggan: (nama) => set({ pelanggan: nama }),
  reset: () => set({ lines: [], diskonTransaksi: 0, allocations: [], gunakanPiutang: false, pelanggan: undefined }),
}));

export function subtotalLines(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + Math.max(0, l.product.hargaJual * l.qty - l.diskon), 0);
}

export function totalTransaksi(lines: CartLine[], diskonTransaksi: number): number {
  return Math.max(0, subtotalLines(lines) - diskonTransaksi);
}
