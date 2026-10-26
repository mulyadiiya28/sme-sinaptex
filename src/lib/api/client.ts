import type {
  AuditEntry,
  Biaya,
  CheckoutPayload,
  CheckoutResult,
  JurnalEntry,
  LabaRugi,
  LoginResult,
  PaymentMethod,
  Pembelian,
  PembelianInput,
  PenyesuaianStokInput,
  Product,
  ShiftBukaInput,
  ShiftInfo,
  ShiftMutasiInput,
  ShiftRiwayat,
  TransaksiRiwayat,
  User,
} from "@/lib/api/types";
import { mockDb, produkBaruId } from "@/lib/api/mock/db";

export const API_MODE = process.env.NEXT_PUBLIC_API_MODE ?? "mock";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let nomorBerikut = 25;

export function hitungKembalian(total: number, allocations: CheckoutPayload["allocations"]): number {
  const covered = allocations.reduce((sum, a) => sum + a.nominal, 0);
  return Math.max(0, covered - total);
}

export function hitungTotal(payload: Pick<CheckoutPayload, "lines" | "diskonTransaksi">): number {
  const subtotal = payload.lines.reduce(
    (sum, l) => sum + Math.max(0, l.product.hargaJual * l.qty - l.diskon),
    0,
  );
  return Math.max(0, subtotal - payload.diskonTransaksi);
}

export const api = {
  auth: {
    login: async (username: string, password: string): Promise<LoginResult> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(400);
      return mockDb.login(username, password);
    },
    logout: async (user?: User): Promise<void> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(150);
      mockDb.logout(user);
    },
    users: async (): Promise<User[]> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(120);
      return mockDb.users.map(({ password: _, ...u }) => u);
    },
    auditList: async (): Promise<AuditEntry[]> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(120);
      return structuredClone(mockDb.auditLog).reverse();
    },
  },

  master: {
    products: async (): Promise<Product[]> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(150);
      return structuredClone(mockDb.products);
    },
    createProduct: async (p: Omit<Product, "id">): Promise<Product> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(250);
      if (p.barcode !== "" && mockDb.products.some((x) => x.barcode === p.barcode)) {
        throw new Error("Barcode sudah dipakai produk lain.");
      }
      const baru: Product = { ...p, id: produkBaruId() };
      mockDb.products.push(baru);
      return structuredClone(baru);
    },
    penyesuaianStok: async (input: PenyesuaianStokInput, user: User): Promise<Product> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(300);
      return mockDb.penyesuaianStok(input, user);
    },
    updateProduct: async (id: string, p: Omit<Product, "id">): Promise<Product> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(250);
      const idx = mockDb.products.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error("Produk tidak ditemukan.");
      if (p.barcode !== "" && mockDb.products.some((x) => x.id !== id && x.barcode === p.barcode)) {
        throw new Error("Barcode sudah dipakai produk lain.");
      }
      mockDb.products[idx] = { ...p, id };
      return structuredClone(mockDb.products[idx]);
    },
    deleteProduct: async (id: string): Promise<void> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(200);
      mockDb.products = mockDb.products.filter((x) => x.id !== id);
    },
  },

  shift: {
    aktif: async (): Promise<ShiftInfo | null> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(100);
      return structuredClone(mockDb.shiftAktif);
    },
    riwayat: async (): Promise<ShiftRiwayat[]> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(100);
      return structuredClone(mockDb.shiftRiwayat);
    },
    buka: async (input: ShiftBukaInput): Promise<ShiftInfo> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(300);
      return mockDb.bukaShift(input);
    },
    mutasiKas: async (input: ShiftMutasiInput): Promise<ShiftInfo> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(250);
      return mockDb.mutasiKas(input);
    },
    tutup: async (uangFisik: number): Promise<ShiftRiwayat> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(400);
      return mockDb.tutupShift(uangFisik);
    },
  },

  pembelian: {
    list: async (): Promise<Pembelian[]> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(150);
      return structuredClone(mockDb.pembelian);
    },
    buat: async (input: PembelianInput): Promise<Pembelian> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(400);
      return mockDb.registerPembelian(input);
    },
  },

  hutang: {
    bayar: async (pembelianId: string, nominal: number, metode: "tunai" | "transfer"): Promise<Pembelian> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(350);
      return mockDb.bayarHutang(pembelianId, nominal, metode);
    },
  },

  piutang: {
    bayar: async (nomor: string, nominal: number, metode: "tunai" | "transfer"): Promise<TransaksiRiwayat> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(350);
      return mockDb.bayarPiutang(nomor, nominal, metode);
    },
  },

  biaya: {
    list: async (): Promise<Biaya[]> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(120);
      return structuredClone(mockDb.biaya);
    },
    catat: async (input: { kategori: string; nominal: number; metode: "tunai" | "transfer"; catatan?: string }): Promise<Biaya> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(350);
      return mockDb.catatBiaya(input);
    },
  },

  akuntansi: {
    jurnal: async (): Promise<JurnalEntry[]> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(120);
      return structuredClone(mockDb.jurnal);
    },
    akun: async (): Promise<ReturnType<typeof mockDb.akunSaldos>> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(120);
      return structuredClone(mockDb.akunSaldos());
    },
    labaRugi: async (): Promise<LabaRugi> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(120);
      return structuredClone(mockDb.labaRugi());
    },
  },

  transaksi: {
    checkout: async (payload: CheckoutPayload): Promise<CheckoutResult> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(600);

      if (!mockDb.shiftAktif) throw new Error("Shift belum dibuka.");

      if (mockDb.kunciCheckout.has(payload.idempotensiKunci)) {
        throw new Error("Transaksi ganda terdeteksi (idempotensi) — refresh dan ulangi.");
      }

      const total = hitungTotal(payload);
      const kembalian = hitungKembalian(total, payload.allocations);
      const terbayar = payload.allocations.reduce((sum, a) => sum + a.nominal, 0) - kembalian;
      const sisa = Math.max(0, total - terbayar);
      const jadiPiutang = sisa > 0 && payload.gunakanPiutang;
      const digitalPending = payload.allocations.some((a) => a.metode === "qris");

      if (sisa > 0 && !jadiPiutang) {
        throw new Error("Pembayaran kurang dan penjualan kredit tidak diizinkan.");
      }

      let belum = total - kembalian;
      let masukTunai = 0;
      let masukBank = 0;
      const pembayaran: Array<{ metode: PaymentMethod; nominal: number }> = [];
      for (const a of payload.allocations) {
        if (belum <= 0) break;
        const masuk = Math.min(a.nominal, belum);
        if (a.metode === "tunai") masukTunai += masuk;
        else masukBank += masuk;
        if (masuk > 0) pembayaran.push({ metode: a.metode, nominal: masuk });
        belum -= masuk;
      }

      nomorBerikut += 1;
      const status: CheckoutResult["status"] =
        sisa > 0 ? "dibayar_sebagian" : digitalPending ? "menunggu_pembayaran" : "lunas";
      const nomor = `PTR-${String(nomorBerikut).padStart(6, "0")}`;

      mockDb.catatTransaksi({
        nomor,
        waktu: new Date().toISOString(),
        kasir: payload.kasir,
        shiftId: payload.shiftId,
        pelanggan: payload.pelanggan,
        items: payload.lines.map((l) => ({
          nama: l.product.nama,
          qty: l.qty,
          hargaJual: l.product.hargaJual,
          diskon: l.diskon,
        })),
        diskonTransaksi: payload.diskonTransaksi,
        total,
        kembalian,
        piutang: jadiPiutang ? sisa : 0,
        status,
        pembayaran,
      });

      mockDb.jurnalPenjualan(
        {
          shiftId: payload.shiftId,
          items: payload.lines.map((l) => ({
            nama: l.product.nama,
            qty: l.qty,
            hargaBeli: l.product.hargaBeli,
          })),
        },
        total,
        kembalian,
        jadiPiutang ? sisa : 0,
        payload.allocations,
      );

      for (const l of payload.lines) {
        const p = mockDb.products.find((x) => x.id === l.product.id);
        if (p) p.stok = Math.max(0, p.stok - l.qty);
      }

      return { nomor, total, kembalian, piutang: jadiPiutang ? sisa : 0, status };
    },

    riwayat: async (): Promise<TransaksiRiwayat[]> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(120);
      return mockDb.riwayatTransaksi();
    },

    batal: async (nomor: string, user: User): Promise<TransaksiRiwayat> => {
      if (API_MODE === "live") throw new Error("API C# belum disambung.");
      await delay(400);
      return mockDb.batalTransaksi(nomor, user);
    },
  },
};
