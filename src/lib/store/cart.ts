import { create } from "zustand";
import type { CartLine, HargaLoyalty, Product, PaymentAllocation, PaymentMethod } from "@/lib/api/types";
import { bulat2, totalParity, pajakNominal as pajakNominalUang } from "@/lib/uang";

/** Voucher yang sedang dipakai keranjang, beserta diskon yang dihitung engine. */
export type VoucherKeranjang = {
  kode: string;
  diskon: number;
};

/** Member beserta harga loyalty yang dihitung engine untuk keranjang ini. */
export type MemberKeranjang = HargaLoyalty & { nama: string };

type CartState = {
  lines: CartLine[];
  diskonTransaksi: number;
  allocations: PaymentAllocation[];
  gunakanPiutang: boolean;
  pelanggan?: string;
  voucher?: VoucherKeranjang;
  member?: MemberKeranjang;
  add: (product: Product) => void;
  setQty: (productId: string, qty: number) => void;
  removeLine: (productId: string) => void;
  setDiskonTransaksi: (nominal: number) => void;
  addAllocation: (metode: PaymentMethod, nominal: number) => void;
  updateAllocation: (index: number, nominal: number) => void;
  removeAllocation: (index: number) => void;
  setPiutang: (pakai: boolean) => void;
  setPelanggan: (nama?: string) => void;
  setVoucher: (voucher: VoucherKeranjang) => void;
  clearVoucher: () => void;
  setMember: (member: MemberKeranjang) => void;
  clearMember: () => void;
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
  setVoucher: (voucher) => set({ voucher }),
  clearVoucher: () => set({ voucher: undefined }),
  setMember: (member) => set({ member }),
  clearMember: () => set({ member: undefined }),
  reset: () =>
    set({
      lines: [],
      diskonTransaksi: 0,
      allocations: [],
      gunakanPiutang: false,
      pelanggan: undefined,
      voucher: undefined,
      member: undefined,
    }),
}));

export function subtotalLines(lines: CartLine[]): number {
  return totalParity({ lines, diskonTransaksi: 0, pajak: 0 }).base;
}

export function totalTransaksi(
  lines: CartLine[],
  diskonTransaksi: number,
  pajakNominal = 0,
  diskonVoucher = 0,
  diskonLoyalty = 0,
): number {
  return totalParity({ lines, diskonTransaksi, pajak: 0, diskonVoucher, diskonLoyalty }).baseAkhir + pajakNominal;
}

export function pajakNominal(
  lines: CartLine[],
  diskonTransaksi: number,
  persen: number,
  diskonVoucher = 0,
  diskonLoyalty = 0,
): number {
  const { baseAkhir } = totalParity({ lines, diskonTransaksi, pajak: 0, diskonVoucher, diskonLoyalty });
  return pajakNominalUang(baseAkhir, persen);
}

/**
 * Rekap Keranjang: base, diskon voucher, pajak, dan total.
 *
 * Voucher dipotong dari atas dokumen, jadi ia ikut menurunkan dasar pajak —
 * promo menurunkan nilai barang yang terjual.
 */
export function rekapKeranjang(
  lines: CartLine[],
  diskonTransaksi: number,
  diskonVoucher: number,
  persenPajak: number,
  diskonLoyalty = 0,
): {
  base: number;
  diskonVoucher: number;
  baseVoucher: number;
  diskonLoyalty: number;
  baseAkhir: number;
  pajak: number;
  total: number;
} {
  const { base, baseVoucher, baseAkhir } = totalParity({
    lines,
    diskonTransaksi,
    pajak: 0,
    diskonVoucher,
    diskonLoyalty,
  });
  const pajak = pajakNominalUang(baseAkhir, persenPajak);
  return {
    base,
    diskonVoucher: bulat2(Math.max(0, diskonVoucher)),
    baseVoucher,
    diskonLoyalty: bulat2(Math.max(0, diskonLoyalty)),
    baseAkhir,
    pajak,
    total: bulat2(baseAkhir + pajak),
  };
}
