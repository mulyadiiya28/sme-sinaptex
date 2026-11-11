import { useAuth } from "@/lib/store/auth";
import type {
  AkunSaldo,
  AuditEntry,
  ArApTurnover,
  Biaya,
  BiayaParams,
  CashAccount,
  CashConversionCycle,
  CheckoutPayload,
  CheckoutResult,
  CompanyProfile,
  Dupont,
  Expense,
  HealthIndicator,
  HealthSummary,
  ImportResult,
  ImporPelangganBaris,
  ImporProdukBaris,
  ImporSaldoAwalBaris,
  InventoryTurnover,
  JurnalEntry,
  JurnalParams,
  KebijakanOperasional,
  LabaRugi,
  LiquidityRatio,
  LoginResult,
  NeracaParams,
  PenyesuaianStokInput,
  Pelanggan,
  PaymentMethod,
  Pembelian,
  PembelianInput,
  PersetujuanBatch,
  PersetujuanTransaksi,
  Product,
  ProductPerformance,
  ProductPerformanceRankings,
  ProfilPerusahaan,
  ProfilToko,
  ProfitabilityRatio,
  ReturInput,
  ReturPembelian,
  ReturPembelianInput,
  ReturPenjualan,
  ReturRiwayatParams,
  SaleReturn,
  ShiftBukaInput,
  ShiftInfo,
  ShiftMutasiInput,
  ShiftRiwayat,
  Solvency,
  TransaksiRiwayat,
  TransferKas,
  TransferKasInput,
  User,
  WorkingCapital,
  WorkingCapitalTurnover,
  AgedInvoice,
  AgingReport,
  ApprovalRule,
  AsetTetap,
  AsetTetapInput,
  CreateApprovalRuleRequest,
  CreateFiscalPeriodRequest,
  CreateSupplierRequest,
  DailyMovementReport,
  FiscalPeriod,
  LaporanAsetTetap,
  MutasiAset,
  PenyusutanItem,
  Reconciliation,
  Supplier,
  Gudang,
  InventorySummary,
  InventoryValuation,
  LowStockItem,
  StockAdjustmentInput,
  StockMovement,
  StockMovementRef,
  StockMovementType,
  StockOpname,
  StockOpnameInput,
  StockTransferInput,
} from "@/lib/api/types";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5121").replace(/\/+$/, "");
export const BUSINESS_ID = process.env.NEXT_PUBLIC_BUSINESS_ID ?? "toko-utama";
export const ENGINE_APPROVER = process.env.NEXT_PUBLIC_ENGINE_APPROVER ?? "pemilik";

const KODE = {
  kas: process.env.NEXT_PUBLIC_ENGINE_KAS ?? "1121",
  bank: process.env.NEXT_PUBLIC_ENGINE_BANK ?? "1111",
  gateway: process.env.NEXT_PUBLIC_ENGINE_GATEWAY ?? "1130",
  piutang: process.env.NEXT_PUBLIC_ENGINE_PIUTANG ?? "1200",
  persediaan: process.env.NEXT_PUBLIC_ENGINE_PERSEDIAAN ?? "1300",
  hutang: process.env.NEXT_PUBLIC_ENGINE_HUTANG ?? "2101",
  pendapatan: process.env.NEXT_PUBLIC_ENGINE_PENDAPATAN ?? "4000",
  hpp: process.env.NEXT_PUBLIC_ENGINE_HPP ?? "5000",
  pajak: process.env.NEXT_PUBLIC_ENGINE_PAJAK ?? "2402",
  biaya: process.env.NEXT_PUBLIC_ENGINE_BIAYA ?? "6900",
};

export const KODE_AKUN = KODE;

export class LiveApiError extends Error {
  readonly status: number;

  constructor(pesan: string, status: number) {
    super(pesan);
    this.name = "LiveApiError";
    this.status = status;
  }
}

type OpsiLive = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  idempotensiKunci?: string;
  headers?: Record<string, string>;
};

type SesiEngine = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

type KlaimToken = {
  sub?: string;
  unique_name?: string;
  name?: string;
  authority_level?: string | number;
  business_id?: string;
};

function jadiError(response: Response): Promise<LiveApiError> {
  return response.text().then((teks) => {
    let pesan = `Permintaan ke engine gagal (${response.status}).`;
    if (teks) {
      try {
        const data = JSON.parse(teks) as {
          title?: string;
          detail?: string;
          error?: string;
          message?: string;
        };
        pesan = data.detail ?? data.title ?? data.error ?? data.message ?? pesan;
      } catch {
        pesan = teks;
      }
    }
    return new LiveApiError(pesan, response.status);
  });
}

async function perbaruiSesi(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  kedaluwarsa: number;
} | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as SesiEngine;
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      kedaluwarsa: Date.parse(data.expiresAt),
    };
  } catch {
    return null;
  }
}

function headerLive(opsi: { json?: boolean; idempotensiKunci?: string } = {}): Record<string, string> {
  const state = useAuth.getState();
  const headers: Record<string, string> = { "X-Business-Id": BUSINESS_ID };
  if (opsi.json) headers["Content-Type"] = "application/json";
  if (state.user) {
    headers["X-Actor-Id"] = state.user.id;
    headers["X-Actor-Level"] = state.user.role === "pemilik" ? "99" : "2";
  }
  if (state.accessToken) headers.Authorization = `Bearer ${state.accessToken}`;
  if (opsi.idempotensiKunci) headers["Idempotency-Key"] = opsi.idempotensiKunci;
  return headers;
}

async function minta<T>(path: string, opsi: OpsiLive = {}, bolehUlang = true): Promise<T> {
  const state = useAuth.getState();
  const headers = { ...headerLive({ json: true, idempotensiKunci: opsi.idempotensiKunci }), ...opsi.headers };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: opsi.method ?? "GET",
    headers,
    body: opsi.body === undefined ? undefined : JSON.stringify(opsi.body),
    cache: "no-store",
  });

  if (response.status === 401 && bolehUlang && state.refreshToken && state.user) {
    const sesiBaru = await perbaruiSesi(state.refreshToken);
    if (sesiBaru) {
      state.setSession({
        user: state.user,
        accessToken: sesiBaru.accessToken,
        refreshToken: sesiBaru.refreshToken,
        kedaluwarsa: sesiBaru.kedaluwarsa,
      });
      return minta<T>(path, opsi, false);
    }
  }

  if (!response.ok) throw await jadiError(response);
  if (response.status === 204) return undefined as T;

  const teks = await response.text();
  return (teks ? (JSON.parse(teks) as T) : (undefined as T));
}

async function ambilBerkas(path: string, bolehUlang = true): Promise<Blob> {
  const state = useAuth.getState();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: headerLive(),
    cache: "no-store",
  });

  if (response.status === 401 && bolehUlang && state.refreshToken && state.user) {
    const sesiBaru = await perbaruiSesi(state.refreshToken);
    if (sesiBaru) {
      state.setSession({
        user: state.user,
        accessToken: sesiBaru.accessToken,
        refreshToken: sesiBaru.refreshToken,
        kedaluwarsa: sesiBaru.kedaluwarsa,
      });
      return ambilBerkas(path, false);
    }
  }

  if (!response.ok) throw await jadiError(response);
  return response.blob();
}

async function kirimForm(
  path: string,
  form: FormData,
  idempotensiKunci?: string,
  bolehUlang = true,
): Promise<Response> {
  const state = useAuth.getState();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: headerLive({ idempotensiKunci }),
    body: form,
    cache: "no-store",
  });

  if (response.status === 401 && bolehUlang && state.refreshToken && state.user) {
    const sesiBaru = await perbaruiSesi(state.refreshToken);
    if (sesiBaru) {
      state.setSession({
        user: state.user,
        accessToken: sesiBaru.accessToken,
        refreshToken: sesiBaru.refreshToken,
        kedaluwarsa: sesiBaru.kedaluwarsa,
      });
      return kirimForm(path, form, idempotensiKunci, false);
    }
  }

  return response;
}

function buatKunciIdempotensi(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `impor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function adalahImportResult(nilai: unknown): nilai is ImportResult {
  if (!nilai || typeof nilai !== "object") return false;
  const data = nilai as Partial<ImportResult>;
  return (
    typeof data.totalRows === "number"
    && typeof data.successCount === "number"
    && typeof data.failedCount === "number"
    && Array.isArray(data.errors)
  );
}

async function bacaImportResult(response: Response): Promise<ImportResult> {
  const teks = await response.text();
  let data: unknown;
  if (teks) {
    try {
      data = JSON.parse(teks);
    } catch {
      data = undefined;
    }
  }

  // Engine menjawab 400 dengan ImportResultDto saat ada baris ditolak —
  // itu hasil impor yang harus ditampilkan, bukan kegagalan HTTP.
  if (adalahImportResult(data)) return data;
  if (!response.ok) {
    const galat = data as { detail?: string; title?: string; message?: string } | undefined;
    throw new LiveApiError(
      galat?.detail ?? galat?.title ?? galat?.message ?? `Impor gagal (${response.status}).`,
      response.status,
    );
  }
  throw new LiveApiError("Respons impor engine tidak dikenali.", response.status);
}

export function bacaKlaim(accessToken: string): {
  id: string;
  username: string;
  nama: string;
  role: User["role"];
} {
  const bagian = accessToken.split(".");
  if (bagian.length < 2) throw new LiveApiError("Token akses tidak valid.", 401);
  const isi = bagian[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = JSON.parse(
    atob(isi.padEnd(isi.length + ((4 - (isi.length % 4)) % 4), "=")),
  ) as KlaimToken;
  const level = String(json.authority_level ?? "2");
  return {
    id: json.sub ?? "",
    username: json.unique_name ?? "",
    nama: json.name ?? json.unique_name ?? "",
    role: level === "99" ? "pemilik" : "kasir",
  };
}

type BtProduk = {
  id: string;
  code: string;
  name: string;
  baseUnitId: string;
  isActive: boolean;
  salePrice: number;
  purchasePrice: number;
  minimumStock: number;
  barcode: string | null;
  category: string | null;
};

type BtSatuan = { id: string; code: string; name: string; isActive: boolean };
type BtStok = { warehouseId: string | null; items: { productId: string; quantity: number }[] };
type BtStockValuation = {
  warehouseId: string;
  items: {
    productId: string;
    warehouseId: string;
    onHand: number;
    averageCost: number;
    totalValue: number;
  }[];
};
type BtMutasiStok = {
  movementId: string;
  productId: string;
  warehouseId: string;
  movementDate: string;
  movementType: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  quantityBefore: number;
  quantityAfter: number;
  purchaseItemId: string | null;
  saleItemId: string | null;
  saleReturnItemId: string | null;
  purchaseReturnItemId: string | null;
  reversalOfMovementId: string | null;
  createdAt: string;
};
type BtOpnameItem = {
  productId: string;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
  unitCost: number;
  valueDifference: number;
  notes: string | null;
};
type BtOpname = {
  id: string;
  number: string;
  warehouseId: string;
  opnameDate: string;
  status: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: BtOpnameItem[];
};
type BtShift = {
  id: string;
  cashierUserId: string;
  kasir: string;
  mulai: string;
  saldoAwal: number;
  kasMasuk: number;
  kasKeluar: number;
  kasTunaiSistem: number;
  status: string;
  selesai: string | null;
  uangFisik: number | null;
  selisih: number | null;
};
type BtPelanggan = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
};
type BtItem = { productId: string; quantity: number; unitPrice: number; lineTotal: number };
type BtDetailPenjualan = {
  id: string;
  items: {
    id: string;
    productId: string;
    warehouseId: string;
    quantity: number;
    unitPrice: number;
  }[];
};
type BtSalePayment = {
  paymentTransactionId: string;
  paymentDate: string;
  amount: number;
  status: string;
  cashAccountCode: string | null;
  cashAccountName: string | null;
};

type BtSalePayments = {
  saleId: string;
  saleNumber: string | null;
  payments: BtSalePayment[];
};

type BtCashMovement = {
  id: string;
  cashAccountId: string;
  movementDate: string;
  movementType: string;
  debit: number;
  credit: number;
  description: string | null;
  cashTransferId: string | null;
  createdAt: string;
};

type BtPenjualan = {
  id: string;
  businessTransactionId: string;
  customerId: string | null;
  saleNumber: string | null;
  saleDate: string;
  description: string | null;
  requestedBy: string;
  requestedByName: string | null;
  status: string;
  totalAmount: number;
  taxAmount: number;
  items: BtItem[];
};
type BtAging = {
  invoices: {
    invoiceNumber: string;
    invoiceTotal: number;
    allocatedTotal: number;
    outstandingAmount: number;
  }[];
};
type BtTransaksi = {
  id: string;
  transactionType: string;
  transactionDate: string;
  status: string;
  requestedBy: string;
  description: string | null;
};
type BtPembelianItem = {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
};

type BtPembelian = {
  id: string;
  supplierId: string | null;
  purchaseNumber: string | null;
  purchaseDate: string;
  status: string;
  totalAmount: number;
  payableAmount: number;
  taxAmount: number;
  items: BtPembelianItem[];
};
type BtAkun = {
  accountCode: string;
  accountName: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  openingBalance: number;
  closingBalance: number;
};
type BtNeraca = {
  fromDate: string;
  toDate: string;
  accounts: BtAkun[];
  grandTotalDebit: number;
  grandTotalCredit: number;
  grandTotalBalance: number;
  isBalanced: boolean;
};
type BtProfil = {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxNumber: string;
  logoUrl: string;
};
type BtIndikatorKesehatan = {
  name: string;
  unit: string;
  value: number;
  displayValue: string;
  rating: string;
  explanation: string;
  benchmark: string;
};
type BtKesehatan = {
  date: string;
  overallVerdict: string;
  overallExplanation: string;
  indicators: BtIndikatorKesehatan[];
};
type BtAkunKas = {
  id: string;
  name: string;
  accountCode: string;
  isDefault: boolean;
  isActive: boolean;
  balance?: number;
};
type BtTransferKas = {
  id: string;
  transferDate: string;
  fromCashAccountId: string;
  toCashAccountId: string;
  amount: number;
  description: string | null;
  approvalRequired?: boolean;
};
type BtGudang = {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  isDefault: boolean;
  isActive: boolean;
  businessId?: string;
  branchId?: string;
  version?: number;
  createdAt?: string;
};
type BtJurnalBaris = {
  accountCode: string;
  accountName: string | null;
  debit: number;
  credit: number;
  description: string | null;
};
type BtJurnal = {
  id: string;
  date: string;
  transactionType: string | null;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  lines: BtJurnalBaris[];
};

function kodeAkunDari(accountCode: string): string {
  return accountCode.trim().toUpperCase();
}

/**
 * Jendela daftar engine: default 30 hari, cap 366 hari. POS meminta rentang
 * terpanjang yang diizinkan supaya arsipMU tidak hilang diam-diam.
 */
function rentangDaftar(): string {
  const sampai = new Date();
  const dari = new Date(sampai.getTime() - 365 * 24 * 60 * 60 * 1000);
  // Tanggal lokal, bukan UTC: transaksi 00.00–06.59 WIB jatuh ke hari sebelumnya bila toISOString dipakai.
  const iso = (nilai: Date) =>
    `${nilai.getFullYear()}-${String(nilai.getMonth() + 1).padStart(2, "0")}-${String(nilai.getDate()).padStart(2, "0")}`;
  return `from=${iso(dari)}&to=${iso(sampai)}`;
}

export async function liveLogin(username: string, password: string): Promise<LoginResult> {
  const data = await minta<SesiEngine>("/api/auth/login", {
    method: "POST",
    body: { username, password },
  });
  const klaim = bacaKlaim(data.accessToken);
  return {
    user: {
      id: klaim.id,
      nama: klaim.nama,
      username: klaim.username,
      role: klaim.role,
    },
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    kedaluwarsa: Date.parse(data.expiresAt),
  };
}

export async function liveLogout(): Promise<void> {
  const { refreshToken } = useAuth.getState();
  if (!refreshToken) return;
  await minta("/api/auth/revoke", { method: "POST", body: { refreshToken } });
}

function petakanProduk(
  p: BtProduk,
  namaSatuan: Map<string, string>,
  jumlahStok: Map<string, number>,
): Product {
  return {
    id: p.id,
    sku: p.code,
    barcode: p.barcode ?? "",
    nama: p.name,
    satuan: namaSatuan.get(p.baseUnitId) ?? p.baseUnitId,
    kategori: p.category ?? "",
    hargaBeli: p.purchasePrice,
    hargaJual: p.salePrice,
    stok: jumlahStok.get(p.id) ?? 0,
    stokMinimum: p.minimumStock,
    status: p.isActive ? "aktif" : "nonaktif",
  };
}

export async function liveProducts(): Promise<Product[]> {
  const [produk, satuan, stok] = await Promise.all([
    minta<BtProduk[]>("/api/products"),
    minta<BtSatuan[]>("/api/units"),
    minta<BtStok>("/api/inventory/stock"),
  ]);
  const namaSatuan = new Map(satuan.map((u) => [u.id, u.name]));
  const jumlahStok = new Map(stok.items.map((s) => [s.productId, s.quantity]));
  return produk.map((p) => petakanProduk(p, namaSatuan, jumlahStok));
}

async function cariAtauBuatSatuan(nama: string): Promise<string> {
  const satuan = await minta<BtSatuan[]>("/api/units");
  const cocok = satuan.find((u) => u.name.toLowerCase() === nama.trim().toLowerCase());
  if (cocok) return cocok.id;
  const dibuat = await minta<BtSatuan>("/api/units", {
    method: "POST",
    body: {
      code: nama.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 50) || "SATUAN",
      name: nama.trim(),
    },
  });
  return dibuat.id;
}

export async function liveCreateProduct(p: Omit<Product, "id">): Promise<Product> {
  const baseUnitId = await cariAtauBuatSatuan(p.satuan || "pcs");
  const dibuat = await minta<BtProduk>("/api/products", {
    method: "POST",
    body: {
      code: p.sku,
      name: p.nama,
      baseUnitId,
      salePrice: p.hargaJual,
      purchasePrice: p.hargaBeli,
      minimumStock: p.stokMinimum,
      barcode: p.barcode === "" ? null : p.barcode,
      category: p.kategori === "" ? null : p.kategori,
    },
  });

  // Stok awal produk: catat sebagai penyesuaian masuk di gudang default
  // agar stok yang terlihat di POS sama dengan yang diinput user.
  if (p.stok > 0) {
    try {
      const gudang = await gudangDefault();
      await minta("/api/inventory/adjustments", {
        method: "POST",
        idempotensiKunci: buatKunciIdempotensi(),
        body: {
          productId: dibuat.id,
          warehouseId: gudang,
          direction: "IN",
          quantity: p.stok,
          movementType: "STOCK_ADJUSTMENT_IN",
          costingMethod: "AVERAGE",
          unitCost: p.hargaBeli,
          reason: `Stok awal produk ${p.nama}`,
        },
      });
    } catch (err) {
      const pesan = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Produk "${p.nama}" sudah dibuat, tetapi stok awal ${p.stok} gagal dicatat: ${pesan}. Catat lewat Penyesuaian Stok — jangan tambah produk lagi karena SKU ${p.sku} sudah dipakai.`,
      );
    }
  }

  const [satuan, stok] = await Promise.all([
    minta<BtSatuan[]>("/api/units"),
    minta<BtStok>("/api/inventory/stock"),
  ]);
  return petakanProduk(
    dibuat,
    new Map(satuan.map((u) => [u.id, u.name])),
    new Map(stok.items.map((s) => [s.productId, s.quantity])),
  );
}

export async function liveUpdateProduct(id: string, p: Omit<Product, "id">): Promise<Product> {
  const diubah = await minta<BtProduk>(`/api/products/${id}`, {
    method: "PUT",
    body: {
      name: p.nama,
      salePrice: p.hargaJual,
      purchasePrice: p.hargaBeli,
      minimumStock: p.stokMinimum,
      barcode: p.barcode,
      category: p.kategori === "" ? null : p.kategori,
    },
  });
  const [satuan, stok] = await Promise.all([
    minta<BtSatuan[]>("/api/units"),
    minta<BtStok>("/api/inventory/stock"),
  ]);
  return petakanProduk(
    diubah,
    new Map(satuan.map((u) => [u.id, u.name])),
    new Map(stok.items.map((s) => [s.productId, s.quantity])),
  );
}

export async function liveDeleteProduct(id: string): Promise<void> {
  await minta(`/api/products/${id}/deactivate`, { method: "POST" });
}

/**
 * Engine hanya punya impor produk (`POST /api/products/import`, multipart).
 * POS menerima baris CSV yang sudah diparse, jadi baris itu ditulis ulang ke
 * berkas CSV dengan header yang dikenali engine. Kolom `stok` sengaja tidak
 * ikut: impor produk engine tidak menerima stok awal.
 */
export function fileCsvProdukDariBaris(rows: ImporProdukBaris[]): File {
  const header = ["sku", "nama", "barcode", "satuan", "kategori", "hargaBeli", "hargaJual", "stokMinimum"];
  const isi = [
    header,
    ...rows.map((r) => [
      r.sku,
      r.nama,
      r.barcode,
      r.satuan,
      r.kategori,
      r.hargaBeli,
      r.hargaJual,
      r.stokMinimum,
    ]),
  ]
    .map((baris) => baris.map((sel) => `"${String(sel ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  return new File(["\uFEFF" + isi], "produk.csv", { type: "text/csv;charset=utf-8" });
}

export function fileCsvPelangganDariBaris(rows: ImporPelangganBaris[]): File {
  const header = ["nama", "telepon", "alamat", "batasKredit"];
  const isi = [
    header,
    ...rows.map((r) => [r.nama, r.telepon, r.alamat, r.batasKredit]),
  ]
    .map((baris) => baris.map((sel) => `"${String(sel ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  return new File(["\uFEFF" + isi], "pelanggan.csv", { type: "text/csv;charset=utf-8" });
}

export function fileCsvSaldoAwalDariBaris(rows: ImporSaldoAwalBaris[]): File {
  const header = ["akun", "debit", "kredit"];
  const isi = [
    header,
    ...rows.map((r) => [r.akun, r.debit, r.kredit]),
  ]
    .map((baris) => baris.map((sel) => `"${String(sel ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  return new File(["\uFEFF" + isi], "saldo-awal.csv", { type: "text/csv;charset=utf-8" });
}

export async function liveImporProduk(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  const response = await kirimForm("/api/products/import", form, buatKunciIdempotensi());
  return bacaImportResult(response);
}

export async function liveImporPelanggan(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  const response = await kirimForm("/api/customers/import", form, buatKunciIdempotensi());
  return bacaImportResult(response);
}

export async function liveImporSaldoAwal(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  const response = await kirimForm("/api/accounts/opening-balances", form, buatKunciIdempotensi());
  return bacaImportResult(response);
}

export async function livePenyesuaianStok(input: PenyesuaianStokInput): Promise<Product> {
  const [produk, satuan, stok] = await Promise.all([
    minta<BtProduk[]>("/api/products"),
    minta<BtSatuan[]>("/api/units"),
    minta<BtStok>("/api/inventory/stock"),
  ]);

  const target = produk.find((p) => p.id === input.productId);
  if (!target) throw new LiveApiError("Produk tidak ditemukan.", 404);

  const jumlahStok = new Map(stok.items.map((s) => [s.productId, s.quantity]));
  const delta = input.stokFisik - (jumlahStok.get(input.productId) ?? 0);
  if (delta === 0) {
    throw new LiveApiError("Stok fisik sama dengan stok sistem — tidak ada penyesuaian.", 400);
  }

  const warehouseId = await gudangDefault();
  const masuk = delta > 0;

  await minta<unknown>("/api/inventory/adjustments", {
    method: "POST",
    idempotensiKunci: buatKunciIdempotensi(),
    body: {
      productId: input.productId,
      warehouseId,
      direction: masuk ? "IN" : "OUT",
      quantity: Math.abs(delta),
      movementType: masuk ? "STOCK_ADJUSTMENT_IN" : "STOCK_ADJUSTMENT_OUT",
      costingMethod: "AVERAGE",
      ...(masuk ? { unitCost: target.purchasePrice } : {}),
      reason: input.alasan || null,
    },
  });

  const sesudah = await minta<BtStok>("/api/inventory/stock");
  const stokBaru = new Map(sesudah.items.map((s) => [s.productId, s.quantity]));
  return petakanProduk(target, new Map(satuan.map((u) => [u.id, u.name])), stokBaru);
}

export async function liveKonfirmasiDigital(nomor: string): Promise<TransaksiRiwayat> {
  const actor = useAuth.getState().user?.id ?? ENGINE_APPROVER;

  // Rute engine memakai ID penjualan, sedangkan POS menyimpan nomor dokumen
  // (SALE-00001). Nomor diterjemahkan dulu supaya endpointnya tidak 404.
  const sale = await cariPenjualanByNomor(nomor);

  const kaki = await minta<BtSalePayment[]>(`/api/sales/${sale.id}/payments`);
  const qris = kaki.filter((k) => k.cashAccountCode === KODE.gateway);
  const nominal = qris.reduce((s, k) => s + k.amount, 0);

  // Pembayaran QRIS sudah duduk di akun penampung gateway; konfirmasi berarti
  // memindahkan dana itu ke bank. Bila tidak ada kaki gateway, ini jalur lama
  // (CustomerPayment yang ditahan approval) dan confirm-payment yang memposting.
  let status: TransaksiRiwayat["status"];
  let pembayaran: TransaksiRiwayat["pembayaran"];

  if (nominal > 0) {
    const [gatewayId, bankId] = await Promise.all([
      pastikanAkunKas(KODE.gateway, "Penampung Gateway QRIS"),
      pastikanAkunKas(KODE.bank, "Bank"),
    ]);

    const transfer = await minta<{ approvalRequired?: boolean }>("/api/cash-transfers", {
      method: "POST",
      idempotensiKunci: buatKunciIdempotensi(),
      body: {
        fromCashAccountId: gatewayId,
        toCashAccountId: bankId,
        amount: nominal,
        requestedBy: actor,
        description: `[QRIS ${nomor}] konfirmasi penampung gateway ke bank`,
      },
    });

    const tertahan = transfer.approvalRequired === true;
    const lunas = !tertahan && nominal >= sale.totalAmount;
    status = tertahan ? "menunggu_persetujuan" : lunas ? "lunas" : "dibayar_sebagian";
    pembayaran = kaki.map((k) => ({
      metode: metodeDariAkun(k.cashAccountCode),
      nominal: k.amount,
      status: tertahan ? "MENUNGGU_KONFIRMASI" : k.status,
    }));
  } else {
    await minta<{
      paymentTransactionId: string;
      journalIds: string[];
      replayed: boolean;
    }>(`/api/sales/${sale.id}/confirm-payment`, {
      method: "POST",
      idempotensiKunci: buatKunciIdempotensi(),
      body: {
        actorId: actor,
      },
    });
    status = "lunas";
  }

  // Setelah konfirmasi, transaksi dikembalikan apa adanya: total, item, dan
  // kasir diambil dari dokumen, bukan dari objek kosong.
  const [produk, pelanggan] = await Promise.all([
    minta<BtProduk[]>("/api/products"),
    minta<BtPelanggan[]>("/api/customers"),
  ]);

  return petakanPenjualan(
    sale,
    new Map(produk.map((p) => [p.id, p.name])),
    new Map(pelanggan.map((c) => [c.id, c.name])),
    0,
    status,
    pembayaran,
  );
}

export async function livePelanggan(): Promise<Pelanggan[]> {
  const pelanggan = await minta<BtPelanggan[]>("/api/customers");
  return pelanggan.map((c) => ({
    id: c.id,
    nama: c.name,
    telepon: c.phone ?? "",
    alamat: c.address ?? undefined,
  }));
}

function petakanShift(s: BtShift): ShiftInfo {
  const penjualanTunai = Math.max(
    0,
    s.kasTunaiSistem - s.saldoAwal - s.kasMasuk + s.kasKeluar,
  );
  return {
    id: s.id,
    cashierUserId: s.cashierUserId ?? "",
    kasir: s.kasir,
    mulai: s.mulai,
    saldoAwal: s.saldoAwal,
    kasMasuk: s.kasMasuk,
    kasKeluar: s.kasKeluar,
    penjualanTunai,
    kasTunaiSistem: s.kasTunaiSistem,
  };
}

/**
 * POS menulis deskripsi batch sebagai "Kasir <nama> · shift <id>". Dokumen
 * penjualan tidak punya field shift, jadi id-nya dibaca dari sana — deskripsi
 * itu ditulis oleh POS sendiri, bukan teks bebas pengguna.
 */
function shiftDariDeskripsi(deskripsi: string | null | undefined): string {
  const cocok = /shift\s+([^\s·]+)/i.exec(deskripsi ?? "");
  return cocok?.[1] ?? "";
}

/**
 * Satu bentuk untuk satu dokumen penjualan.
 *
 * Riwayat, void, dan konfirmasi digital semuanya membaca dokumen yang sama,
 * jadi pemetaannya ditulis sekali — kalau tidak, tiap jalur bisa menampilkan
 * versi yang berbeda dari transaksi yang sama.
 */
function petakanPenjualan(
  sale: BtPenjualan,
  namaProduk: Map<string, string>,
  namaPelanggan: Map<string, string>,
  piutang: number,
  status: TransaksiRiwayat["status"],
  pembayaran?: TransaksiRiwayat["pembayaran"],
): TransaksiRiwayat {
  return {
    nomor: sale.saleNumber ?? sale.id,
    waktu: sale.saleDate,
    kasir: sale.requestedByName ?? "-",
    shiftId: shiftDariDeskripsi(sale.description),
    pelanggan: sale.customerId ? namaPelanggan.get(sale.customerId) : undefined,
    items: sale.items.map((item) => ({
      nama: namaProduk.get(item.productId) ?? item.productId,
      qty: item.quantity,
      hargaJual: item.unitPrice,
      diskon: 0,
    })),
    diskonTransaksi: 0,
    pajak: sale.taxAmount,
    total: sale.totalAmount,
    kembalian: 0,
    piutang,
    status,
    pembayaran,
  };
}

export async function liveShiftAktif(): Promise<ShiftInfo | null> {
  const shift = await minta<BtShift | null>("/api/shifts/active");
  return shift ? petakanShift(shift) : null;
}

export async function liveShiftRiwayat(): Promise<ShiftRiwayat[]> {
  const daftar = await minta<BtShift[]>("/api/shifts");
  return daftar.map((s) => ({
    ...petakanShift(s),
    selesai: s.selesai ?? "",
    uangFisik: s.uangFisik ?? 0,
    selisih: s.selisih ?? 0,
  }));
}

export async function liveShiftBuka(input: ShiftBukaInput): Promise<ShiftInfo> {
  const shift = await minta<BtShift>("/api/shifts", {
    method: "POST",
    body: {
      cashierUserId: input.cashierUserId ?? "",
      kasir: input.kasir,
      saldoAwal: input.saldoAwal,
    },
  });
  return petakanShift(shift);
}

export async function liveShiftMutasi(
  shiftId: string,
  input: ShiftMutasiInput,
): Promise<ShiftInfo> {
  const shift = await minta<BtShift>(`/api/shifts/${shiftId}/cash-movements`, {
    method: "POST",
    body: { jenis: input.jenis, nominal: input.nominal, catatan: input.catatan ?? null },
  });
  return petakanShift(shift);
}

export async function liveShiftTutup(
  shiftId: string,
  uangFisik: number,
): Promise<ShiftRiwayat> {
  const shift = await minta<BtShift>(`/api/shifts/${shiftId}/close`, {
    method: "POST",
    body: { uangFisik },
  });
  return {
    ...petakanShift(shift),
    selesai: shift.selesai ?? "",
    uangFisik: shift.uangFisik ?? uangFisik,
    selisih: shift.selisih ?? 0,
  };
}

export async function liveAkun(params: NeracaParams = {}): Promise<AkunSaldo[]> {
  const query = new URLSearchParams({
    fromDate: params.from || "1900-01-01",
    toDate: params.to || "2999-12-31",
  });
  const neraca = await minta<BtNeraca>(
    `/api/reports/trial-balance?${query.toString()}`,
  );
  return neraca.accounts.map((a) => ({
    akun: `${a.accountCode} ${a.accountName}`,
    kode: a.accountCode,
    nama: a.accountName,
    saldoAwal: a.openingBalance,
    debit: a.totalDebit,
    kredit: a.totalCredit,
    saldo: a.balance,
    saldoAkhir: a.closingBalance,
  }));
}

export async function liveNeracaSaldoExport(dari: string, sampai: string): Promise<Blob> {
  const query = new URLSearchParams({ fromDate: dari, toDate: sampai, format: "csv" });
  return ambilBerkas(`/api/reports/trial-balance/export?${query.toString()}`);
}

export async function liveLabaRugi(): Promise<LabaRugi> {
  const neraca = await minta<BtNeraca>(
    `/api/reports/trial-balance?fromDate=1900-01-01&toDate=2999-12-31`,
  );
  let pendapatan = 0;
  let hpp = 0;
  let biaya = 0;
  let pajak = 0;

  for (const akun of neraca.accounts) {
    const kode = kodeAkunDari(akun.accountCode);
    const bersaldo = akun.totalCredit - akun.totalDebit;
    if (kode.startsWith("4")) pendapatan += bersaldo;
    else if (kode === KODE.hpp) hpp += akun.totalDebit - akun.totalCredit;
    else if (kode.startsWith("6") || kode === "5100") biaya += akun.totalDebit - akun.totalCredit;
    else if (kode === KODE.pajak) pajak += bersaldo;
  }

  return {
    pendapatan,
    retur: 0,
    hpp,
    biaya,
    pajak,
    laba: pendapatan - hpp - biaya - pajak,
  };
}

export async function liveJurnal(params: JurnalParams = {}): Promise<JurnalEntry[]> {
  const ukuranHalaman = 200;
  const hasil: JurnalEntry[] = [];

  for (let halaman = 1; ; halaman++) {
    const query = new URLSearchParams({
      page: String(halaman),
      pageSize: String(ukuranHalaman),
    });
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);

    const rows = await minta<BtJurnal[]>(`/api/journal?${query.toString()}`);

    hasil.push(...rows.map((row) => ({
      id: row.id,
      waktu: row.date,
      keterangan: row.description?.trim() || row.transactionType || "Jurnal",
      ref: row.referenceId?.trim() || row.referenceType || row.id,
      baris: row.lines.map((line) => ({
        akun: line.accountName ? `${line.accountCode} ${line.accountName}` : line.accountCode,
        debit: line.debit,
        kredit: line.credit,
      })),
    })));

    if (rows.length < ukuranHalaman) break;
  }

  return hasil;
}

function biayaDariExpense(expense: Expense): Biaya {
  return {
    id: expense.id,
    waktu: expense.expenseDate,
    kategori: expense.category,
    nominal: expense.amount,
    metode: expense.paymentMethod,
    catatan: expense.note ?? undefined,
  };
}

export async function liveBiayaList(params: BiayaParams = {}): Promise<Biaya[]> {
  const ukuranHalaman = 200;
  const hasil: Biaya[] = [];

  for (let halaman = 1; ; halaman++) {
    const query = new URLSearchParams({
      page: String(halaman),
      pageSize: String(ukuranHalaman),
    });
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);

    const rows = await minta<Expense[]>(`/api/expenses?${query.toString()}`);

    hasil.push(...rows.map(biayaDariExpense));

    if (rows.length < ukuranHalaman) break;
  }

  return hasil;
}

export async function liveBiayaCatat(input: {
  kategori: string;
  nominal: number;
  metode: "tunai" | "transfer";
  catatan?: string;
}): Promise<Biaya> {
  const actor = useAuth.getState().user?.id ?? ENGINE_APPROVER;

  const hasil = await minta<Expense>("/api/expenses", {
    method: "POST",
    idempotensiKunci: buatKunciIdempotensi(),
    body: {
      expenseDate: new Date().toISOString(),
      category: input.kategori,
      amount: input.nominal,
      paymentMethod: input.metode,
      accountCode: KODE.biaya,
      note: input.catatan,
      requestedBy: actor,
    },
  });

  return biayaDariExpense(hasil);
}

export async function liveBayarPiutang(input: {
  nomor: string;
  nominal: number;
  metode: "tunai" | "transfer";
}): Promise<TransaksiRiwayat> {
  const actor = useAuth.getState().user?.id ?? ENGINE_APPROVER;
  const cashAccountId = await akunKasDefault(input.metode === "tunai" ? KODE.kas : KODE.bank);
  // Engine menuntut id penjualan pada rute ini, sedangkan UI memegang nomor
  // dokumen (SALE-00001), jadi nomornya harus diterjemahkan lebih dulu.
  const penjualan = await cariPenjualanByNomor(input.nomor);

  const hasil = await minta<{
    paymentTransactionId: string;
    cashMovementId: string;
    amount: number;
    receivableAccountCode: string;
    outstandingBefore: number;
    outstandingAfter: number;
    allocationsCreated: number;
    journalIds: string[];
    approvalRequired: boolean;
  }>(`/api/sales/${penjualan.id}/payments`, {
    method: "POST",
    idempotensiKunci: buatKunciIdempotensi(),
    body: {
      cashAccountId,
      amount: input.nominal,
      receivableAccountCode: KODE.piutang,
      requestedBy: actor,
      approvedBy: ENGINE_APPROVER,
    },
  });

  // `outstandingAfter` dari engine mengabaikan DP yang sudah dibayar lewat
  // batch penjualan (mis. total 6000, DP 1000, bayar 2000 -> engine bilang
  // 4000 padahal sisanya 3000). Sisa yang benar hanya ada di AR ageing.
  const ar = await minta<BtAging>("/api/reports/ar-ap/aging?side=RECEIVABLE").catch(
    () => ({ invoices: [] }),
  );
  const nomor = penjualan.saleNumber ?? penjualan.id;
  const sisaPiutang =
    ar.invoices.find((i) => i.invoiceNumber === nomor)?.outstandingAmount ??
    Math.max(0, hasil.outstandingAfter);

  return {
    nomor: hasil.paymentTransactionId,
    waktu: new Date().toISOString(),
    kasir: "pemilik",
    shiftId: "",
    items: [],
    diskonTransaksi: 0,
    pajak: 0,
    total: 0,
    kembalian: 0,
    piutang: Math.max(0, sisaPiutang),
    status: sisaPiutang > 0 ? "dibayar_sebagian" : "lunas",
    pembayaran: [{ metode: input.metode, nominal: hasil.amount }],
  };
}

export async function liveBayarHutang(input: {
  pembelianId: string;
  nominal: number;
  metode: "tunai" | "transfer";
}): Promise<Pembelian> {
  const actor = useAuth.getState().user?.id ?? ENGINE_APPROVER;
  const cashAccountId = await akunKasDefault(input.metode === "tunai" ? KODE.kas : KODE.bank);

  const hasil = await minta<{
    paymentTransactionId: string;
    cashMovementId: string;
    amount: number;
    payableAccountCode: string;
    outstandingBefore: number;
    outstandingAfter: number;
    allocationsCreated: number;
    journalIds: string[];
    approvalRequired: boolean;
  }>(`/api/purchases/${input.pembelianId}/payments`, {
    method: "POST",
    idempotensiKunci: buatKunciIdempotensi(),
    body: {
      cashAccountId,
      amount: input.nominal,
      payableAccountCode: KODE.hutang,
      requestedBy: actor,
      approvedBy: ENGINE_APPROVER,
    },
  });

  // Sama seperti pelunasan piutang: `outstandingAfter` mengabaikan DP batch,
  // dan `terbayar` bukan sekadar pembayaran terakhir — keduanya dihitung dari
  // dokumen + AP ageing.
  const [pembelian, ap] = await Promise.all([
    minta<BtPembelian[]>(`/api/purchases?${rentangDaftar()}`),
    minta<BtAging>("/api/reports/ar-ap/aging?side=PAYABLE"),
  ]);
  const dokumen = pembelian.find((p) => p.id === input.pembelianId);
  const nomor = dokumen?.purchaseNumber ?? input.pembelianId;
  const sisaHutang =
    ap.invoices.find((i) => i.invoiceNumber === nomor)?.outstandingAmount ??
    Math.max(0, hasil.outstandingAfter);
  const total = dokumen?.totalAmount ?? 0;

  return {
    id: input.pembelianId,
    nomor,
    waktu: dokumen?.purchaseDate ?? new Date().toISOString(),
    pemasok: dokumen?.supplierId ?? "",
    supplierId: dokumen?.supplierId ?? null,
    items: [],
    total,
    metode: sisaHutang > 0 ? "hutang" : "tunai",
    terbayar: Math.max(0, total - sisaHutang),
  };
}

async function gudangDefault(): Promise<string> {
  const daftar = await minta<BtGudang[]>("/api/warehouses");
  const aktif = daftar.filter((g) => g.isActive);
  const pilihan = aktif.find((g) => g.isDefault) ?? aktif[0];
  if (pilihan) return pilihan.id;
  const dibuat = await minta<BtGudang>("/api/warehouses", {
    method: "POST",
    body: { code: "GUDANG-UTAMA", name: "Gudang Utama", isDefault: true },
  });
  return dibuat.id;
}

async function akunKasDefault(kodeAkun: string): Promise<string> {
  const daftar = await minta<BtAkunKas[]>("/api/cash-accounts");
  const cocok = daftar.find((a) => a.accountCode === kodeAkun && a.isActive);
  if (cocok) return cocok.id;
  const defaultKas = daftar.find((a) => a.isDefault && a.isActive);
  if (defaultKas) return defaultKas.id;
  const dibuat = await minta<BtAkunKas>("/api/cash-accounts", {
    method: "POST",
    body: {
      name: `Kas ${kodeAkun}`,
      accountCode: kodeAkun,
      description: "Dibuat otomatis oleh POS",
      isDefault: !daftar.some((a) => a.isDefault),
    },
  });
  return dibuat.id;
}

/**
 * Resolves the cash account for an EXACT ledger code, creating the ledger
 * account and the cash account when the tenant's chart does not have them yet.
 *
 * Unlike `akunKasDefault`, it never falls back to the default cash account:
 * QRIS money must land in the gateway account, and silently parking it in
 * whatever account happens to be default would make the confirmation step move
 * the wrong funds.
 */
async function pastikanAkunKas(kodeAkun: string, nama: string): Promise<string> {
  const daftar = await minta<BtAkunKas[]>("/api/cash-accounts");
  const ada = daftar.find((a) => a.accountCode === kodeAkun && a.isActive);
  if (ada) return ada.id;

  // The ledger account must exist before a cash account can name it. A 409
  // means someone already created it, which is exactly the state we want.
  try {
    await minta("/api/accounts", {
      method: "POST",
      body: { code: kodeAkun, name: nama, accountType: "ASSET" },
    });
  } catch (err) {
    if (!(err instanceof LiveApiError) || err.status !== 409) throw err;
  }

  const dibuat = await minta<BtAkunKas>("/api/cash-accounts", {
    method: "POST",
    body: {
      name: nama,
      accountCode: kodeAkun,
      description: "Dibuat otomatis oleh POS",
      isDefault: false,
    },
  });
  return dibuat.id;
}

export async function liveCashAccounts(): Promise<CashAccount[]> {
  const daftar = await minta<BtAkunKas[]>("/api/cash-accounts?includeInactive=true");
  return daftar.map((a) => ({
    id: a.id,
    nama: a.name,
    kode: a.accountCode,
    saldo: a.balance ?? 0,
    bawaan: a.isDefault,
    aktif: a.isActive,
  }));
}

function petakanTransferKas(
  t: BtTransferKas,
  namaAkun: Map<string, string>,
): TransferKas {
  return {
    id: t.id,
    waktu: t.transferDate,
    dariAkunId: t.fromCashAccountId,
    dariNama: namaAkun.get(t.fromCashAccountId) ?? t.fromCashAccountId,
    keAkunId: t.toCashAccountId,
    keNama: namaAkun.get(t.toCashAccountId) ?? t.toCashAccountId,
    nominal: t.amount,
    keterangan: t.description ?? undefined,
    menungguPersetujuan: Boolean(t.approvalRequired),
  };
}

export async function liveTransferKasList(): Promise<TransferKas[]> {
  const [akun, daftar] = await Promise.all([
    liveCashAccounts(),
    minta<BtTransferKas[]>("/api/cash-transfers"),
  ]);
  const namaAkun = new Map(akun.map((a) => [a.id, a.nama]));
  return daftar.map((t) => petakanTransferKas(t, namaAkun));
}

export async function liveTransferKasCreate(input: TransferKasInput, user: User): Promise<TransferKas> {
  const hasil = await minta<BtTransferKas>("/api/cash-transfers", {
    method: "POST",
    idempotensiKunci: buatKunciIdempotensi(),
    body: {
      fromCashAccountId: input.dariAkunId,
      toCashAccountId: input.keAkunId,
      amount: input.nominal,
      requestedBy: user.id || user.username,
      description: input.keterangan?.trim() || null,
    },
  });
  const akun = await liveCashAccounts();
  const namaAkun = new Map(akun.map((a) => [a.id, a.nama]));
  return petakanTransferKas(hasil, namaAkun);
}

function ringkasAlokasi(payload: CheckoutPayload): {
  tunai: number;
  transfer: number;
  qris: number;
  nontunai: number;
  total: number;
} {
  const total = payload.lines.reduce(
    (sum, l) => sum + Math.max(0, l.product.hargaJual * l.qty - l.diskon),
    0,
  );
  const bersih = Math.max(0, total - payload.diskonTransaksi + payload.pajak);
  const tunai = payload.allocations
    .filter((a) => a.metode === "tunai")
    .reduce((sum, a) => sum + a.nominal, 0);
  const qris = payload.allocations
    .filter((a) => a.metode === "qris")
    .reduce((sum, a) => sum + a.nominal, 0);
  const transfer = payload.allocations
    .filter((a) => a.metode === "transfer")
    .reduce((sum, a) => sum + a.nominal, 0);
  return { tunai, transfer, qris, nontunai: transfer + qris, total: bersih };
}

function bulat2(nilai: number): number {
  return Math.round(nilai * 100) / 100;
}

/**
 * Engine tidak punya field diskon pada dokumen penjualan — yang boleh dictate
 * total adalah `unitPrice` per baris. Jadi diskon POS (per baris maupun diskon
 * transaksi) dipotong di harga: harga yang dikirim = harga bersih, dan total
 * dokumen engine jadi sama dengan total yang dilihat kasir.
 */
function barisHargaBersih(payload: CheckoutPayload): {
  productId: string;
  qty: number;
  unitPrice: number;
}[] {
  const bersihPerBaris = payload.lines.map((l) => ({
    productId: l.product.id,
    qty: l.qty,
    harga: bulat2(Math.max(0, l.product.hargaJual * l.qty - l.diskon)),
  }));
  const totalBaris = bersihPerBaris.reduce((s, b) => s + b.harga, 0);
  const target = bulat2(Math.max(0, totalBaris - payload.diskonTransaksi));

  const hasil: { productId: string; qty: number; unitPrice: number }[] = [];
  let sisa = target;

  bersihPerBaris.forEach((baris, index) => {
    const terakhir = index === bersihPerBaris.length - 1;
    const proporsi = totalBaris > 0 ? baris.harga / totalBaris : 0;
    const jumlahBaris = terakhir ? sisa : Math.min(bulat2(target * proporsi), sisa);
    const unitPrice = baris.qty > 0 ? bulat2(jumlahBaris / baris.qty) : 0;
    hasil.push({ productId: baris.productId, qty: baris.qty, unitPrice });
    sisa = bulat2(sisa - bulat2(unitPrice * baris.qty));
  });

  return hasil;
}

export async function liveCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
  const gudang = await gudangDefault();
  const ringkasan = ringkasAlokasi(payload);
  const dibayar = ringkasan.tunai + ringkasan.nontunai;

  if (dibayar > ringkasan.total) {
    throw new LiveApiError(
      "Engine C# menolak pembayaran melebihi total (kembalian belum didukung batch penjualan).",
      400,
    );
  }
  if (ringkasan.tunai > 0 && ringkasan.nontunai > 0) {
    throw new LiveApiError(
      "Engine C# menerima satu akun kas per batch — pembayaran campuran (tunai + transfer) belum didukung.",
      400,
    );
  }
  if (ringkasan.qris > 0 && ringkasan.transfer > 0) {
    throw new LiveApiError(
      "Engine C# menerima satu akun kas per batch — QRIS dan transfer tidak bisa digabung dalam satu transaksi.",
      400,
    );
  }
  // Penjualan tanpa uang muka (dibayar 0) adalah penjualan kredit: engine
  // menulis dokumennya saja — tanpa kas movement, tanpa jurnal settlement dan
  // tanpa alokasi — sehingga piutang tetap terbuka.
  // QRIS tidak masuk bank: dananya ditahan di akun penampung gateway sampai
  // pemilik mengonfirmasinya, sehingga metode itu tetap bisa dibedakan.
  const cashAccountId =
    dibayar > 0
      ? await (ringkasan.qris > 0
          ? pastikanAkunKas(KODE.gateway, "Penampung Gateway QRIS")
          : akunKasDefault(ringkasan.tunai > 0 ? KODE.kas : KODE.bank))
      : null;
  const pelangganId = payload.pelanggan
    ? await cariPelangganId(payload.pelanggan)
    : null;
  const actor = useAuth.getState().user?.id ?? ENGINE_APPROVER;

  const hasil = await minta<{
    batchId: string;
    documentId: string;
    documentNumber: string | null;
    documentTotal: number;
    outstandingAmount: number;
    approvalRequired: boolean;
  }>("/api/cash-batches/sales", {
    method: "POST",
    idempotensiKunci: payload.idempotensiKunci,
    body: {
      requestedBy: actor,
      approvedBy: actor === ENGINE_APPROVER ? `${ENGINE_APPROVER}-otorisasi` : ENGINE_APPROVER,
      customerId: pelangganId,
      cashAccountId,
      paymentAmount: dibayar,
      costingMethod: "AVERAGE",
      receivableAccountCode: KODE.piutang,
      revenueAccountCode: KODE.pendapatan,
      cogsAccountCode: KODE.hpp,
      inventoryAccountCode: KODE.persediaan,
      description: `Kasir ${payload.kasir} · shift ${payload.shiftId}`,
      taxable: payload.pajak > 0,
      taxAmount: payload.pajak > 0 ? payload.pajak : null,
      lines: barisHargaBersih(payload).map((baris) => ({
        productId: baris.productId,
        warehouseId: gudang,
        quantity: baris.qty,
        unitPrice: baris.unitPrice,
      })),
    },
  });

  const piutang = hasil.outstandingAmount;
  const tertahan = hasil.approvalRequired;
  const status: CheckoutResult["status"] = tertahan
    ? "menunggu_persetujuan"
    : piutang > 0
      ? "dibayar_sebagian"
      : ringkasan.qris > 0
        ? "menunggu_pembayaran"
        : "lunas";

  return {
    nomor: hasil.documentNumber ?? hasil.documentId,
    total: hasil.documentTotal,
    kembalian: 0,
    // Batch yang tertahan belum memposting apa pun: piutangnya belum lahir,
    // dan uang yang diserahkan kasir belum tercatat sebagai kas.
    piutang: tertahan ? 0 : piutang,
    status,
    menungguPersetujuan: tertahan,
  };
}
async function cariPelangganId(nama: string): Promise<string | null> {
  const pelanggan = await minta<BtPelanggan[]>("/api/customers");
  const cocok = pelanggan.find((c) => c.name.toLowerCase() === nama.trim().toLowerCase());
  return cocok?.id ?? null;
}

/**
 * Metode pembayaran ditebak dari akun kas yang menerima uangnya: engine tidak
 * menyimpan label metode, hanya akun kas. Akun gateway menandai QRIS; akun kas
 * default menandai tunai; sisanya (bank) transfer.
 */
function metodeDariAkun(kode: string | null): PaymentMethod {
  if (kode === KODE.gateway) return "qris";
  if (kode === KODE.kas) return "tunai";
  return "transfer";
}

export async function liveTransaksiRiwayat(): Promise<TransaksiRiwayat[]> {
  const [penjualan, produk, pelanggan, ar, kakiSemua, daftarKas] = await Promise.all([
    minta<BtPenjualan[]>(`/api/sales?${rentangDaftar()}`),
    minta<BtProduk[]>("/api/products"),
    minta<BtPelanggan[]>("/api/customers"),
    minta<BtAging>("/api/reports/ar-ap/aging?side=RECEIVABLE"),
    minta<BtSalePayments[]>(`/api/sales/payments?${rentangDaftar()}`),
    minta<BtAkunKas[]>("/api/cash-accounts"),
  ]);
  const namaProduk = new Map(produk.map((p) => [p.id, p.name]));
  const namaPelanggan = new Map(pelanggan.map((c) => [c.id, c.name]));
  // Dokumen penjualan tidak menyimpan sisa piutang; angka itu hanya ada di
  // laporan AR ageing, jadi diambil sekali dan dipetakan lewat nomor dokumen.
  const sisaPiutang = new Map(
    ar.invoices.map((i) => [i.invoiceNumber, i.outstandingAmount]),
  );

  const kakiPerPenjualan = new Map(kakiSemua.map((k) => [k.saleId, k.payments]));
  const akunGateway = daftarKas.find(
    (a) => a.accountCode === KODE.gateway && a.isActive,
  );
  const sudahDikonfirmasi = await nomorQrisTerkonfirmasi(akunGateway?.id);

  const hasil: TransaksiRiwayat[] = [];
  for (const sale of penjualan) {
    const nomor = sale.saleNumber ?? sale.id;
    const dibatalkan = sale.status === "VOIDED" || sale.status === "CANCELLED";
    const piutang = dibatalkan ? 0 : (sisaPiutang.get(nomor) ?? 0);
    const kaki = kakiPerPenjualan.get(sale.id) ?? [];
    const adaQris = kaki.some((k) => k.cashAccountCode === KODE.gateway);
    const qrisTerkonfirmasi = sudahDikonfirmasi.has(nomor);

    const dasar: TransaksiRiwayat["status"] = dibatalkan
      ? "dibatalkan"
      : sale.status === "SUBMITTED"
        ? "menunggu_persetujuan"
        : sale.status !== "POSTED"
          ? "menunggu_pembayaran"
          : piutang <= 0
            ? "lunas"
            : piutang >= sale.totalAmount
              ? "menunggu_pembayaran"
              : "dibayar_sebagian";

    // QRIS yang belum dikonfirmasi masih menunggu, walaupun uangnya sudah
    // tercatat di akun penampung (piutangnya nol).
    const status: TransaksiRiwayat["status"] =
      dasar === "lunas" && adaQris && !qrisTerkonfirmasi
        ? "menunggu_pembayaran"
        : dasar;

    const pembayaran: TransaksiRiwayat["pembayaran"] =
      kaki.length === 0
        ? undefined
        : kaki.map((k) => ({
            metode: metodeDariAkun(k.cashAccountCode),
            nominal: k.amount,
            status:
              k.cashAccountCode === KODE.gateway && !qrisTerkonfirmasi
                ? "MENUNGGU_KONFIRMASI"
                : k.status,
          }));

    hasil.push(
      petakanPenjualan(sale, namaProduk, namaPelanggan, piutang, status, pembayaran),
    );
  }
  return hasil;
}

/**
 * Nomor penjualan yang QRIS-nya sudah dipindahkan dari penampung gateway ke
 * bank. Konfirmasi menulis cash transfer dengan deskripsi bertanda
 * `[QRIS <nomor>]`, dan movement keluar dari akun gateway membawa deskripsi
 * itu — satu pembacaan untuk seluruh halaman, bukan satu per penjualan.
 */
async function nomorQrisTerkonfirmasi(gatewayId?: string): Promise<Set<string>> {
  if (!gatewayId) return new Set();

  const movements = await minta<BtCashMovement[]>(
    `/api/cash-accounts/${gatewayId}/movements?${rentangDaftar()}`,
  );

  const hasil = new Set<string>();
  for (const m of movements) {
    if (m.credit <= 0 || !m.description) continue;
    const cocok = m.description.match(/\[QRIS ([^\]]+)\]/);
    if (cocok) hasil.add(cocok[1]);
  }
  return hasil;
}

export async function livePembelianList(): Promise<Pembelian[]> {
  const [pembelian, produk, pemasok, ap] = await Promise.all([
    minta<BtPembelian[]>(`/api/purchases?${rentangDaftar()}`),
    minta<BtProduk[]>("/api/products"),
    minta<{ id: string; name: string }[]>("/api/suppliers?includeInactive=true"),
    minta<BtAging>("/api/reports/ar-ap/aging?side=PAYABLE"),
  ]);
  const namaProduk = new Map(produk.map((p) => [p.id, p.name]));
  const namaPemasok = new Map(pemasok.map((s) => [s.id, s.name]));
  // `payableAmount` pada dokumen adalah nilai hutang bruto, bukan sisa —
  // sisa hutang yang sebenarnya hanya ada di laporan AP ageing.
  const sisaHutang = new Map(
    ap.invoices.map((i) => [i.invoiceNumber, i.outstandingAmount]),
  );

  return pembelian.map((p) => {
    const nomor = p.purchaseNumber ?? p.id;
    const outstanding = sisaHutang.get(nomor) ?? 0;
    return {
      id: p.id,
      nomor,
      pemasok: p.supplierId ? namaPemasok.get(p.supplierId) ?? p.supplierId : "Tanpa pemasok",
      supplierId: p.supplierId,
      waktu: p.purchaseDate,
      items: p.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        nama: namaProduk.get(item.productId) ?? item.productId,
        qty: item.quantity,
        hargaBeli: item.unitCost,
      })),
      total: p.totalAmount,
      metode: outstanding > 0 ? "hutang" : "tunai",
      terbayar: Math.max(0, p.totalAmount - outstanding),
    };
  });
}

export async function livePembelianBuat(input: PembelianInput): Promise<Pembelian> {
  const gudang = await gudangDefault();
  const actor = useAuth.getState().user?.id ?? ENGINE_APPROVER;
  const total = input.items.reduce((sum, i) => sum + i.hargaBeli * i.qty, 0);
  const hutang = input.metode === "hutang";

  // Pembelian hutang pays nothing now: engine writes the document alone, so
  // the payable stays open and no till is touched.
  const cashAccountId = hutang
    ? null
    : await akunKasDefault(input.metode === "bank" ? KODE.bank : KODE.kas);

  const hasil = await minta<{
    documentId: string;
    documentNumber: string | null;
    documentTotal: number;
  }>("/api/cash-batches/purchases", {
    method: "POST",
    idempotensiKunci: `pembelian-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    body: {
      requestedBy: actor,
      approvedBy: actor === ENGINE_APPROVER ? `${ENGINE_APPROVER}-otorisasi` : ENGINE_APPROVER,
      supplierId: input.supplierId,
      cashAccountId,
      paymentAmount: hutang ? 0 : total,
      costingMethod: "AVERAGE",
      payableAccountCode: KODE.hutang,
      inventoryAccountCode: KODE.persediaan,
      description: input.supplierId ? `Pembelian ${input.pemasok}` : "Pembelian tanpa pemasok",
      lines: input.items.map((i) => ({
        productId: i.productId,
        warehouseId: gudang,
        quantity: i.qty,
        unitCost: i.hargaBeli,
        unitPrice: i.hargaBeli,
      })),
    },
  });

  return {
    id: hasil.documentId,
    nomor: hasil.documentNumber ?? hasil.documentId,
    pemasok: input.pemasok,
    supplierId: input.supplierId,
    waktu: new Date().toISOString(),
    items: input.items,
    total: hasil.documentTotal,
    metode: input.metode === "bank" ? "bank" : hutang ? "hutang" : "tunai",
    terbayar: hutang ? 0 : hasil.documentTotal,
  };
}

async function cariPembelianByNomor(nomor: string): Promise<BtPembelian> {
  const pembelian = await minta<BtPembelian[]>(`/api/purchases?${rentangDaftar()}`);
  const cocok = pembelian.find((p) => p.purchaseNumber === nomor || p.id === nomor);
  if (!cocok) throw new LiveApiError(`Faktur pembelian ${nomor} tidak ditemukan.`, 404);
  return cocok;
}

/**
 * Retur pembelian: barang kembali ke pemasok dan hutang dikreditkan.
 *
 * Engine menunjuk baris pembelian, bukan produknya — jadi nama yang sama di
 * dua faktur tidak bercampur. Barisnya dibaca dari detail faktur karena
 * daftar pembelian tidak selalu membawa id baris.
 */
export async function liveReturPembelian(input: ReturPembelianInput): Promise<ReturPembelian> {
  const pembelian = await cariPembelianByNomor(input.referensi);
  const [produk, pemasok, detail] = await Promise.all([
    minta<BtProduk[]>("/api/products"),
    minta<{ id: string; name: string }[]>("/api/suppliers?includeInactive=true").catch(() => []),
    minta<{ items: BtPembelianItem[] }>(`/api/purchases/${pembelian.id}`),
  ]);

  const namaProduk = new Map(produk.map((p) => [p.id, p.name]));
  const namaPemasok = new Map(pemasok.map((s) => [s.id, s.name]));

  // Satu produk bisa muncul di beberapa baris faktur dengan harga beli
  // berbeda. Retur menunjuk baris, jadi qty dialokasikan berurutan dan tiap
  // potongan dikirim sebagai baris retur tersendiri.
  const terpakai = new Map<string, number>();
  const barisRetur: Array<{ purchaseItemId: string; quantity: number }> = [];
  const items: ReturPembelian["items"] = [];
  for (const baris of input.items) {
    const kandidat = detail.items.filter((item) => namaProduk.get(item.productId) === baris.nama);
    if (kandidat.length === 0) {
      throw new LiveApiError(`Item "${baris.nama}" tidak ada di faktur ${input.referensi}.`, 400);
    }
    const tersedia = kandidat.reduce(
      (s, item) => s + item.quantity - (terpakai.get(item.id) ?? 0),
      0,
    );
    if (baris.qty > tersedia) {
      throw new LiveApiError(
        `Jumlah retur "${baris.nama}" melebihi jumlah yang dibeli (${tersedia}).`,
        400,
      );
    }
    let sisa = baris.qty;
    let nilai = 0;
    for (const line of kandidat) {
      if (sisa <= 0) break;
      const sudah = terpakai.get(line.id) ?? 0;
      const bisa = line.quantity - sudah;
      if (bisa <= 0) continue;
      const pakai = Math.min(bisa, sisa);
      barisRetur.push({ purchaseItemId: line.id, quantity: pakai });
      terpakai.set(line.id, sudah + pakai);
      nilai += pakai * line.unitCost;
      sisa -= pakai;
    }
    items.push({
      nama: baris.nama,
      qty: baris.qty,
      hargaBeli: baris.qty > 0 ? nilai / baris.qty : 0,
    });
  }

  const retur = await minta<{
    purchaseReturnId: string;
    purchaseReturnNumber: string | null;
    totalAmount: number;
    approvalRequired: boolean;
  }>("/api/purchase-returns", {
    method: "POST",
    idempotensiKunci: `retur-pembelian-${input.referensi}-${Date.now()}`,
    body: {
      purchaseId: pembelian.id,
      description: input.alasan,
      costingMethod: "AVERAGE",
      payableAccountCode: KODE.hutang,
      inventoryAccountCode: KODE.persediaan,
      taxable: false,
      items: barisRetur,
    },
  });

  return {
    id: retur.purchaseReturnId,
    nomor: retur.purchaseReturnNumber ?? retur.purchaseReturnId,
    referensi: input.referensi,
    pemasok: pembelian.supplierId
      ? namaPemasok.get(pembelian.supplierId) ?? pembelian.supplierId
      : "Tanpa pemasok",
    supplierId: pembelian.supplierId,
    waktu: new Date().toISOString(),
    items,
    total: retur.totalAmount,
    alasan: input.alasan,
    menungguPersetujuan: retur.approvalRequired,
  };
}

async function cariPenjualanByNomor(nomor: string): Promise<BtPenjualan> {
  const penjualan = await minta<BtPenjualan[]>(`/api/sales?${rentangDaftar()}`);
  const cocok = penjualan.find(
    (s) => s.saleNumber === nomor || s.id === nomor,
  );
  if (!cocok) throw new LiveApiError(`Transaksi ${nomor} tidak ditemukan.`, 404);
  return cocok;
}

export async function liveVoidTransaksi(nomor: string): Promise<TransaksiRiwayat> {
  const sale = await cariPenjualanByNomor(nomor);
  const [produk, pelanggan] = await Promise.all([
    minta<BtProduk[]>("/api/products"),
    minta<BtPelanggan[]>("/api/customers"),
  ]);
  const namaProduk = new Map(produk.map((p) => [p.id, p.name]));
  const namaPelanggan = new Map(pelanggan.map((c) => [c.id, c.name]));

  const items = sale.items.map((item) => ({
    nama: namaProduk.get(item.productId) ?? item.productId,
    qty: item.quantity,
  }));

  try {
    await minta<BtTransaksi>(`/api/transactions/${sale.businessTransactionId}/void`, {
      method: "POST",
      body: { note: "Dibatalkan dari POS" },
    });
  } catch (error) {
    if (!(error instanceof LiveApiError) || error.status !== 409) throw error;
    // Engine: transaksi POSTED tidak boleh di-void — koreksi wajib lewat
    // retur (credit note). POS memakai jalur retur penuh untuk pembatalan.
    await liveRetur({
      referensi: nomor,
      items,
      alasan: "Pembatalan transaksi dari POS",
      metodeRefund: "tunai",
    });
  }

  return petakanPenjualan(
    sale,
    namaProduk,
    namaPelanggan,
    0,
    "dibatalkan",
  );
}

type BtRetur = {
  saleReturnId: string;
  saleReturnNumber: string | null;
  totalAmount: number;
  totalCostOfGoodsSold: number;
  approvalRequired: boolean;
  replayed: boolean;
};

export async function liveRetur(input: ReturInput): Promise<ReturPenjualan> {
  const sale = await cariPenjualanByNomor(input.referensi);
  const [produk, detail] = await Promise.all([
    minta<BtProduk[]>("/api/products"),
    minta<BtDetailPenjualan>(`/api/sales/${sale.id}`),
  ]);
  const namaProduk = new Map(produk.map((p) => [p.id, p.name]));
  const gudang = detail.items[0]?.warehouseId ?? (await gudangDefault());

  const items = input.items.map((baris) => {
    const asal = detail.items.find(
      (item) => namaProduk.get(item.productId) === baris.nama,
    );
    if (!asal) {
      throw new LiveApiError(
        `Item "${baris.nama}" tidak ada di transaksi ${input.referensi}.`,
        400,
      );
    }
    return { saleItemId: asal.id, warehouseId: gudang, quantity: baris.qty };
  });

  const retur = await minta<BtRetur>("/api/sale-returns", {
    method: "POST",
    idempotensiKunci: `retur-${input.referensi}-${Date.now()}`,
    body: {
      saleId: sale.id,
      description: input.alasan,
      costingMethod: "AVERAGE",
      receivableAccountCode: KODE.piutang,
      revenueAccountCode: KODE.pendapatan,
      cogsAccountCode: KODE.hpp,
      inventoryAccountCode: KODE.persediaan,
      items,
    },
  });

  return {
    id: retur.saleReturnId,
    nomor: retur.saleReturnNumber ?? retur.saleReturnId,
    referensi: input.referensi,
    waktu: new Date().toISOString(),
    items: input.items.map((baris) => {
      const asal = detail.items.find(
        (item) => namaProduk.get(item.productId) === baris.nama,
      );
      return {
        nama: baris.nama,
        qty: baris.qty,
        hargaJual: asal?.unitPrice ?? 0,
      };
    }),
    total: retur.totalAmount,
    alasan: input.alasan,
    metodeRefund: input.metodeRefund,
  };
}

type BtDetailRetur = {
  id: string;
  saleReturnNumber: string | null;
  description: string | null;
  totalAmount: number;
  items: { id: string; saleItemId: string; quantity: number }[];
};

export async function liveReturRiwayat(
  params: ReturRiwayatParams = {},
): Promise<ReturPenjualan[]> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));
  const qs = query.toString();

  const rows = await minta<SaleReturn[]>(
    `/api/sale-returns${qs ? `?${qs}` : ""}`,
  );
  if (rows.length === 0) return [];

  // Daftar retur dari engine hanya memuat angka: nama item dan alasannya ada
  // di dokumennya. Satu halaman dibatasi 20 baris, jadi detailnya diambil
  // paralel — satu permintaan per retur, plus satu per penjualan asal.
  const [produk, penjualan] = await Promise.all([
    minta<BtProduk[]>("/api/products"),
    minta<BtPenjualan[]>(`/api/sales?${rentangDaftar()}`),
  ]);
  const namaProduk = new Map(produk.map((p) => [p.id, p.name]));
  const nomorPenjualan = new Map(
    penjualan.map((s) => [s.id, s.saleNumber ?? s.id]),
  );

  const cacheDetail = new Map<string, Promise<BtDetailPenjualan | null>>();
  const detailPenjualan = (id: string): Promise<BtDetailPenjualan | null> => {
    let ada = cacheDetail.get(id);
    if (!ada) {
      ada = minta<BtDetailPenjualan>(`/api/sales/${id}`).catch(() => null);
      cacheDetail.set(id, ada);
    }
    return ada;
  };

  const detailRetur = await Promise.all(
    rows.map((row) =>
      minta<BtDetailRetur>(`/api/sale-returns/${row.id}`).catch(() => null),
    ),
  );

  const hasil: ReturPenjualan[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const detail = detailRetur[i];
    const asal = detail ? await detailPenjualan(row.saleId) : null;
    const itemAsal = new Map((asal?.items ?? []).map((it) => [it.id, it]));

    hasil.push({
      id: row.id,
      nomor: detail?.saleReturnNumber ?? row.documentNumber ?? row.id,
      referensi: nomorPenjualan.get(row.saleId) ?? row.saleId,
      waktu: row.createdAt,
      items: (detail?.items ?? []).map((it) => {
        const asalItem = itemAsal.get(it.saleItemId);
        return {
          nama: asalItem ? namaProduk.get(asalItem.productId) ?? asalItem.productId : "-",
          qty: it.quantity,
          hargaJual: asalItem?.unitPrice ?? 0,
        };
      }),
      total: row.totalAmount,
      alasan: detail?.description ?? "",
      pelanggan: row.customerName ?? undefined,
      status: row.status,
    });
  }
  return hasil;
}

export async function liveBuatUser(input: {
  nama: string;
  username: string;
  password: string;
  role: User["role"];
}): Promise<User> {
  const dibuat = await minta<{
    id: string;
    username: string;
    fullName: string;
    email: string | null;
    isActive: boolean;
    authorityLevel: number;
  }>("/api/users/direct", {
    method: "POST",
    body: {
      username: input.username,
      email: `${input.username}@${BUSINESS_ID}.local`,
      password: input.password,
      fullName: input.nama,
      authorityLevel: input.role === "pemilik" ? 99 : 2,
    },
  });
  return {
    id: dibuat.id,
    nama: dibuat.fullName || input.nama,
    username: dibuat.username,
    role: (dibuat.authorityLevel ?? 2) >= 90 ? "pemilik" : "kasir",
  };
}

export async function liveUsers(): Promise<User[]> {
  const data = await minta<{
    id: string;
    username: string;
    fullName: string;
    email: string | null;
    isActive: boolean;
    authorityLevel: number;
  }[]>("/api/users");
  return data.map((u) => ({
    id: u.id,
    nama: u.fullName,
    username: u.username,
    role: (u.authorityLevel ?? 2) >= 90 ? "pemilik" : "kasir",
  }));
}

export async function liveUbahUser(id: string, input: { password?: string; role?: User["role"] }): Promise<User> {
  const data = await minta<{
    id: string;
    username: string;
    fullName: string;
    email: string | null;
    isActive: boolean;
    authorityLevel: number;
  }>(`/api/users/${id}`, {
    method: "PUT",
    body: {
      password: input.password,
      authorityLevel: input.role === undefined ? undefined : input.role === "pemilik" ? 99 : 2,
    },
  });
  return {
    id: data.id,
    nama: data.fullName,
    username: data.username,
    role: (data.authorityLevel ?? 2) >= 90 ? "pemilik" : "kasir",
  };
}

export async function liveHapusUser(id: string): Promise<void> {
  await minta(`/api/users/${id}`, { method: "DELETE" });
}

export async function liveAuditLog(): Promise<AuditEntry[]> {
  const data = await minta<{
    id: string;
    businessId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    detailsJson: string | null;
    ipAddress: string | null;
    createdAt: string;
  }[]>("/api/audit-log");
  return data.map((a) => ({
    id: a.id,
    waktu: a.createdAt,
    user: a.userId,
    aksi: a.action,
    detail: a.detailsJson ?? "",
  }));
}

/**
 * Profil toko dari engine.
 *
 * Engine memakai nama field berbahasa Inggris (`companyName`, `address`, ...)
 * dan ASP.NET menyerializkannya sebagai camelCase — jadi pemetaan ke nama
 * field POS dilakukan di sini, bukan diasumsikan sama.
 */
export async function liveCompanyProfileGet(): Promise<CompanyProfile> {
  const p = await minta<BtProfil>("/api/settings/company-profile");
  return petakanProfil(p);
}

export async function liveCompanyProfilePut(input: CompanyProfile): Promise<CompanyProfile> {
  const p = await minta<BtProfil>("/api/settings/company-profile", {
    method: "PUT",
    idempotensiKunci: buatKunciIdempotensi(),
    body: {
      companyName: input.nama,
      address: input.alamat,
      phone: input.telepon,
      email: input.email,
      website: input.website,
      taxNumber: input.npwp,
      logoUrl: input.logoUrl,
    },
  });
  return petakanProfil(p);
}

/**
 * Logo diunggah ke engine, bukan ke POS: filenya disimpan di server yang
 * mencetak faktur PDF, jadi struk dan faktur memakai logo yang sama.
 */
export async function liveUnggahLogo(file: File): Promise<ProfilPerusahaan> {
  const form = new FormData();
  form.append("file", file);

  const response = await kirimForm("/api/settings/company-profile/logo", form);
  if (!response.ok) throw await jadiError(response);

  const p = (await response.json()) as BtProfil;
  return petakanProfil(p);
}

/**
 * URL logo dari engine bersifat relatif (`/uploads/logos/...`) — browser
 * harus tahu host engine supaya gambarnya benar-benar termuat.
 */
export function urlLogoAbsolut(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function petakanProfil(p: BtProfil): ProfilPerusahaan {
  return {
    nama: p.companyName ?? "",
    alamat: p.address ?? "",
    telepon: p.phone ?? "",
    email: p.email ?? "",
    website: p.website ?? "",
    npwp: p.taxNumber ?? "",
    logoUrl: p.logoUrl ?? "",
  };
}

export async function liveKebijakanGet(): Promise<KebijakanOperasional> {
  const data = await minta<KebijakanOperasional>("/api/settings/operational-policy");
  return {
    izinkanKredit: data.izinkanKredit,
    saldoAwalShift: data.saldoAwalShift,
  };
}

export async function liveKebijakanPut(input: KebijakanOperasional): Promise<KebijakanOperasional> {
  const data = await minta<KebijakanOperasional>("/api/settings/operational-policy", {
    method: "PUT",
    idempotensiKunci: buatKunciIdempotensi(),
    body: {
      izinkanKredit: input.izinkanKredit,
      saldoAwalShift: input.saldoAwalShift,
    },
  });
  return {
    izinkanKredit: data.izinkanKredit,
    saldoAwalShift: data.saldoAwalShift,
  };
}

export async function liveProfitability(startDate: string, endDate: string): Promise<ProfitabilityRatio> {
  const data = await minta<ProfitabilityRatio>(`/api/analytics/profitability?startDate=${startDate}&endDate=${endDate}`);
  return data;
}

export async function liveInventoryTurnover(startDate: string, endDate: string): Promise<InventoryTurnover> {
  const data = await minta<InventoryTurnover>(`/api/analytics/inventory-turnover?startDate=${startDate}&endDate=${endDate}`);
  return data;
}

export async function liveArTurnover(startDate: string, endDate: string): Promise<ArApTurnover> {
  const data = await minta<ArApTurnover>(`/api/analytics/ar-turnover?startDate=${startDate}&endDate=${endDate}`);
  return data;
}

export async function liveApTurnover(startDate: string, endDate: string): Promise<ArApTurnover> {
  const data = await minta<ArApTurnover>(`/api/analytics/ap-turnover?startDate=${startDate}&endDate=${endDate}`);
  return data;
}

export async function liveWorkingCapital(date: string): Promise<WorkingCapital> {
  const data = await minta<WorkingCapital>(`/api/analytics/working-capital?date=${date}`);
  return data;
}

export async function liveWorkingCapitalTurnover(startDate: string, endDate: string): Promise<WorkingCapitalTurnover> {
  const data = await minta<WorkingCapitalTurnover>(`/api/analytics/working-capital-turnover?startDate=${startDate}&endDate=${endDate}`);
  return data;
}

export async function liveCurrentRatio(date: string): Promise<LiquidityRatio> {
  const data = await minta<LiquidityRatio>(`/api/analytics/current-ratio?date=${date}`);
  return data;
}

export async function liveCashRatio(date: string): Promise<LiquidityRatio> {
  const data = await minta<LiquidityRatio>(`/api/analytics/cash-ratio?date=${date}`);
  return data;
}

export async function liveSolvency(date: string): Promise<Solvency> {
  const data = await minta<Solvency>(`/api/analytics/solvency?date=${date}`);
  return data;
}

export async function liveCashConversionCycle(startDate: string, endDate: string): Promise<CashConversionCycle> {
  const data = await minta<CashConversionCycle>(`/api/analytics/cash-conversion-cycle?startDate=${startDate}&endDate=${endDate}`);
  return data;
}

export async function liveHealthSummary(date: string, startDate?: string, endDate?: string): Promise<HealthSummary> {
  const qs = new URLSearchParams({ date });
  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);
  const data = await minta<HealthSummary>(`/api/analytics/health-summary?${qs.toString()}`);
  return data;
}

export async function liveProductPerformance(startDate: string, endDate: string): Promise<ProductPerformance[]> {
  const data = await minta<ProductPerformance[]>(`/api/analytics/product-performance?startDate=${startDate}&endDate=${endDate}`);
  return data;
}

export async function liveProductPerformanceRankings(startDate: string, endDate: string, top = 10): Promise<ProductPerformanceRankings> {
  const data = await minta<ProductPerformanceRankings>(`/api/analytics/product-performance/rankings?startDate=${startDate}&endDate=${endDate}&top=${top}`);
  return data;
}

export async function liveFiscalPeriodList(): Promise<FiscalPeriod[]> {
  const data = await minta<FiscalPeriod[]>("/api/fiscal-periods");
  return data;
}

export async function liveFiscalPeriodCreate(input: CreateFiscalPeriodRequest): Promise<FiscalPeriod> {
  const data = await minta<FiscalPeriod>("/api/fiscal-periods", {
    method: "POST",
    idempotensiKunci: buatKunciIdempotensi(),
    body: {
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status,
    },
  });
  return data;
}

export async function liveFiscalPeriodClose(id: string, actorId: string, idempotensiKunci: string): Promise<FiscalPeriod> {
  const data = await minta<FiscalPeriod>(`/api/fiscal-periods/${id}/close`, {
    method: "POST",
    idempotensiKunci,
    body: {},
  });
  return data;
}

export async function liveFiscalPeriodLock(id: string, actorId: string, actorLevel: string, reason: string, idempotensiKunci: string): Promise<FiscalPeriod> {
  const data = await minta<FiscalPeriod>(`/api/fiscal-periods/${id}/lock`, {
    method: "POST",
    idempotensiKunci,
    headers: {
      "X-Actor-Id": actorId,
      "X-Actor-Level": actorLevel,
      "X-Reason": reason,
    },
    body: {},
  });
  return data;
}

export async function liveFiscalPeriodReopen(id: string, actorId: string, actorLevel: string, reason: string, idempotensiKunci: string): Promise<FiscalPeriod> {
  const data = await minta<FiscalPeriod>(`/api/fiscal-periods/${id}/reopen`, {
    method: "POST",
    idempotensiKunci,
    headers: {
      "X-Actor-Id": actorId,
      "X-Actor-Level": actorLevel,
      "X-Reason": reason,
    },
    body: {},
  });
  return data;
}

export async function liveFiscalPeriodReverseClosing(id: string, actorId: string, actorLevel: string, reason: string, idempotensiKunci: string): Promise<FiscalPeriod> {
  const data = await minta<FiscalPeriod>(`/api/fiscal-periods/${id}/reverse-closing`, {
    method: "POST",
    idempotensiKunci,
    headers: {
      "X-Actor-Id": actorId,
      "X-Actor-Level": actorLevel,
      "X-Reason": reason,
    },
    body: {},
  });
  return data;
}

export async function liveFiscalPeriodGetPendingClose(): Promise<FiscalPeriod[]> {
  const data = await minta<FiscalPeriod[]>("/api/fiscal-periods/pending-close");
  return data;
}

export async function liveApprovalRuleList(): Promise<ApprovalRule[]> {
  const data = await minta<ApprovalRule[]>("/api/approval-rules");
  return data;
}

export async function liveApprovalRuleCreate(input: CreateApprovalRuleRequest): Promise<ApprovalRule> {
  const data = await minta<ApprovalRule>("/api/approval-rules", {
    method: "POST",
    idempotensiKunci: buatKunciIdempotensi(),
    body: {
      name: input.name,
      transactionType: input.transactionType,
      minimumAmount: input.minimumAmount,
      requiredLevel: input.requiredLevel,
      resolutionMode: input.resolutionMode,
    },
  });
  return data;
}

export async function liveApprovalRuleDeactivate(id: string): Promise<ApprovalRule> {
  const data = await minta<ApprovalRule>(`/api/approval-rules/${id}/deactivate`, {
    method: "POST",
    idempotensiKunci: buatKunciIdempotensi(),
    body: {},
  });
  return data;
}

export async function liveDailyMovement(date: string, accountCode: string): Promise<DailyMovementReport> {
  const qs = new URLSearchParams({ date, accountCode });
  const data = await minta<DailyMovementReport>(`/api/reports/daily-movement?${qs.toString()}`);
  return data;
}

export async function liveAging(side: "RECEIVABLE" | "PAYABLE", asOfDate?: string): Promise<AgingReport> {
  const qs = new URLSearchParams({ side });
  if (asOfDate) qs.set("asOfDate", asOfDate);
  const data = await minta<AgingReport>(`/api/reports/ar-ap/aging?${qs.toString()}`);
  return data;
}

export async function liveReconciliation(side: "RECEIVABLE" | "PAYABLE", accountCode: string, asOfDate?: string): Promise<Reconciliation> {
  const qs = new URLSearchParams({ side, accountCode });
  if (asOfDate) qs.set("asOfDate", asOfDate);
  const data = await minta<Reconciliation>(`/api/reports/ar-ap/reconciliation?${qs.toString()}`);
  return data;
}

export async function liveSupplierList(): Promise<Supplier[]> {
  // `includeInactive` supaya pemasok yang dinonaktifkan tetap terlihat di master.
  const data = await minta<Supplier[]>("/api/suppliers?includeInactive=true");
  return data;
}

export async function liveSupplierCreate(input: CreateSupplierRequest): Promise<Supplier> {
  const data = await minta<Supplier>("/api/suppliers", {
    method: "POST",
    idempotensiKunci: buatKunciIdempotensi(),
    body: {
      code: input.code,
      name: input.name,
      address: input.address,
      phone: input.phone,
      email: input.email,
      taxNumber: input.taxNumber,
    },
  });
  return data;
}

export async function liveSupplierDeactivate(id: string): Promise<Supplier> {
  const data = await minta<Supplier>(`/api/suppliers/${id}/deactivate`, {
    method: "POST",
    idempotensiKunci: buatKunciIdempotensi(),
    body: {},
  });
  return data;
}

type BtTransaksiPersetujuan = {
  id: string;
  transactionType: string;
  transactionDate: string;
  status: string;
  requestedBy: string;
  description: string | null;
  batchId: string | null;
};

type BtApprovalTransaksi = {
  transactionId: string;
  transactionStatus: string;
  request: {
    amount: number;
    pendingSteps: number;
    steps: Array<{ stepNumber: number; requiredLevel: number; status: string }>;
  } | null;
};

/// Jenis transaksi yang ditulis oleh batch kas dan diposting lewat
/// `/api/cash-batches/{id}/post`. Transfer kas punya alur sendiri
/// (`/api/cash-transfers/{id}/post`) dan ditangani terpisah.
const TIPE_BATCH_KAS = new Set([
  "SALE",
  "PURCHASE",
  "CUSTOMER_PAYMENT",
  "SUPPLIER_PAYMENT",
  "PURCHASE_RETURN",
  "SALE_RETURN",
]);

export async function livePersetujuanList(): Promise<PersetujuanBatch[]> {
  const [rows, pengguna] = await Promise.all([
    minta<BtTransaksiPersetujuan[]>("/api/transactions?status=SUBMITTED"),
    minta<Array<{ id: string; username: string; fullName: string | null }>>("/api/users").catch(
      () => [],
    ),
  ]);
  const namaPengguna = new Map(pengguna.map((u) => [u.id, u.fullName ?? u.username]));

  const relevan = rows.filter((r) =>
    r.transactionType === "CASH_TRANSFER" ||
    r.transactionType === "PURCHASE_RETURN" ||
    r.transactionType === "SALE_RETURN"
      ? true
      : Boolean(r.batchId) && TIPE_BATCH_KAS.has(r.transactionType),
  );

  // Nominal dan langkah persetujuan hanya ada di snapshot approval, bukan di
  // daftar transaksi, jadi tiap kaki dibaca detailnya.
  const detail = await Promise.all(
    relevan.map(async (r) => ({
      r,
      approval:
        (await minta<BtApprovalTransaksi>(`/api/transactions/${r.id}/approval`).catch(
          () => null,
        )),
    })),
  );

  const peta = new Map<string, PersetujuanBatch>();
  for (const { r, approval } of detail) {
    // Transfer kas tidak lahir dari cash batch; transaksinya sendiri yang
    // menjadi kunci kelompok sekaligus target posting.
    const batchId = r.batchId ?? r.id;
    const baris: PersetujuanTransaksi = {
      id: r.id,
      batchId,
      tipe: r.transactionType,
      peminta: namaPengguna.get(r.requestedBy) ?? r.requestedBy.slice(0, 8),
      tanggal: r.transactionDate,
      keterangan: r.description,
      nominal: approval?.request?.amount ?? 0,
      langkah: (approval?.request?.steps ?? []).map((s) => ({
        nomor: s.stepNumber,
        level: s.requiredLevel,
        status: s.status,
      })),
    };

    const batch = peta.get(batchId) ?? {
      batchId,
      peminta: baris.peminta,
      tanggal: r.transactionDate,
      keterangan: r.description,
      nominal: 0,
      transaksi: [],
    };
    batch.transaksi.push(baris);
    batch.nominal = Math.max(batch.nominal, baris.nominal);
    peta.set(batchId, batch);
  }

  return [...peta.values()].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
}

export async function liveSetujuiBatch(batch: PersetujuanBatch): Promise<void> {
  // Engine menilai tiap kaki sendiri-sendiri; semuanya harus APPROVED sebelum
  // dokumen boleh diposting.
  for (const t of batch.transaksi) {
    await minta(`/api/transactions/${t.id}/approve`, { method: "POST" });
  }

  const transfer = batch.transaksi.find((t) => t.tipe === "CASH_TRANSFER");
  if (transfer) {
    // Transfer tidak punya cash batch; rute postingnya memakai id transaksi.
    await minta(`/api/cash-transfers/${transfer.id}/post`, {
      method: "POST",
      idempotensiKunci: buatKunciIdempotensi(),
    });
    return;
  }

  const returPembelian = batch.transaksi.find((t) => t.tipe === "PURCHASE_RETURN");
  if (returPembelian) {
    // Posting retur memakai id dokumennya, bukan id transaksi approval.
    const dokumen = await minta<{ id: string }>(
      `/api/purchase-returns/by-transaction/${returPembelian.id}`,
    );
    await minta(`/api/purchase-returns/${dokumen.id}/post`, {
      method: "POST",
      idempotensiKunci: buatKunciIdempotensi(),
    });
    return;
  }

  const returPenjualan = batch.transaksi.find((t) => t.tipe === "SALE_RETURN");
  if (returPenjualan) {
    // Sama seperti retur pembelian: lookup dokumen lewat transaksi.
    const dokumen = await minta<{ id: string }>(
      `/api/sale-returns/by-transaction/${returPenjualan.id}`,
    );
    await minta(`/api/sale-returns/${dokumen.id}/post`, {
      method: "POST",
      idempotensiKunci: buatKunciIdempotensi(),
    });
    return;
  }

  await minta(`/api/cash-batches/${batch.batchId}/post`, {
    method: "POST",
    idempotensiKunci: buatKunciIdempotensi(),
  });
}

// ===== ASET TETAP (FIXED ASSETS) =====

type BtAsetTetap = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  branchId: string | null;
  acquisitionDate: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: string;
  depreciationStartPeriod: string;
  lastDepreciatedPeriod: string | null;
  isActive: boolean;
  createdAt: string;
};

type BtMutasiAset = {
  id: string;
  fixedAssetId: string;
  type: string;
  mutationDate: string;
  amount: number;
  note: string | null;
  newLocation: string | null;
  createdAt: string;
};

type BtLaporanAsetTetap = {
  asset: BtAsetTetap;
  depreciationCharge: number;
  accumulatedDepreciation: number;
  bookValue: number;
};

type BtPenyusutanBulan = {
  assetId: string;
  assetName: string;
  code: string;
  monthNumber: number;
  depreciationCharge: number;
  accumulatedDepreciation: number;
  bookValue: number;
};

type BtPostingPenyusutan = {
  fixedAssetId: string;
  code: string;
  name: string;
  period: string;
  monthNumber: number;
  charge: number;
  bookValueAfter: number;
  journalId: string;
};

type BtPostingPenyusutanResponse = {
  period: string;
  postedCount: number;
  totalCharge: number;
  postings: BtPostingPenyusutan[];
};

function metodePenyusutanEngine(method: string): AsetTetap["metodePenyusutan"] {
  if (method === "garis-lurus" || method === "menurun-ganda" || method === "jumlah-tahun") {
    return method;
  }

  throw new LiveApiError(`Metode penyusutan "${method}" belum dikenal POS.`, 500);
}

function petakanAsetTetap(p: BtAsetTetap): AsetTetap {
  return {
    id: p.id,
    kode: p.code,
    nama: p.name,
    kategori: p.category ?? "",
    nilaiPerolehan: p.acquisitionCost,
    nilaiResidu: p.salvageValue,
    umurEkonomis: p.usefulLifeMonths,
    metodePenyusutan: metodePenyusutanEngine(p.depreciationMethod),
    tanggalPerolehan: p.acquisitionDate.slice(0, 10),
    // Engine tidak menyimpan lokasi, akun per aset, maupun catatan; kolomnya
    // kosong dan disembunyikan di UI mode live.
    lokasi: "",
    status: p.isActive ? "aktif" : "nonaktif",
    akunAset: "",
    akunPenyusutan: "",
    akunBebanPenyusutan: "",
    createdAt: p.createdAt,
    updatedAt: p.createdAt,
  };
}

export async function liveDaftarAsetTetap(): Promise<AsetTetap[]> {
  // "Hapus" di POS berarti menonaktifkan; aset nonaktif tetap harus muncul
  // supaya statusnya bisa dibaca.
  const rows = await minta<BtAsetTetap[]>("/api/fixed-assets?includeInactive=true");
  return rows.map(petakanAsetTetap);
}

export async function liveBuatAsetTetap(input: AsetTetapInput, _user: User): Promise<AsetTetap> {
  const row = await minta<BtAsetTetap>("/api/fixed-assets", {
    method: "POST",
    body: {
      code: input.kode,
      name: input.nama,
      category: input.kategori.trim() || null,
      acquisitionDate: input.tanggalPerolehan,
      acquisitionCost: input.nilaiPerolehan,
      salvageValue: input.nilaiResidu,
      usefulLifeMonths: input.umurEkonomis,
      depreciationMethod: input.metodePenyusutan,
    },
  });

  return petakanAsetTetap(row);
}

export async function liveUbahAsetTetap(
  id: string,
  input: Partial<AsetTetapInput>,
  _user: User,
): Promise<AsetTetap> {
  // Hanya field yang boleh berubah di engine; kode, tanggal, dan nilai
  // perolehan sengaja tidak dikirim karena sudah menjadi fakta historis.
  const row = await minta<BtAsetTetap>(`/api/fixed-assets/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: {
      ...(input.nama !== undefined ? { name: input.nama } : {}),
      ...(input.kategori !== undefined ? { category: input.kategori.trim() || null } : {}),
      ...(input.umurEkonomis !== undefined ? { usefulLifeMonths: input.umurEkonomis } : {}),
      ...(input.nilaiResidu !== undefined ? { salvageValue: input.nilaiResidu } : {}),
      ...(input.metodePenyusutan !== undefined
        ? { depreciationMethod: input.metodePenyusutan }
        : {}),
    },
  });

  return petakanAsetTetap(row);
}

export async function liveHapusAsetTetap(id: string, _user: User): Promise<void> {
  await minta<BtAsetTetap>(`/api/fixed-assets/${encodeURIComponent(id)}/deactivate`, {
    method: "POST",
  });
}

export async function liveHitungPenyusutanBulanan(periode: string): Promise<PenyusutanItem[]> {
  const assets = await minta<BtAsetTetap[]>("/api/fixed-assets");

  const rows = await Promise.all(
    assets.map((asset) =>
      minta<BtPenyusutanBulan>(
        `/api/fixed-assets/depreciation?assetId=${encodeURIComponent(asset.id)}&period=${encodeURIComponent(periode)}`,
      ),
    ),
  );

  return rows
    .filter((row) => row.depreciationCharge > 0)
    .map((row) => ({
      asetId: row.assetId,
      periode,
      nilaiPenyusutan: row.depreciationCharge,
      akumulasiPenyusutan: row.accumulatedDepreciation,
      nilaiBuku: row.bookValue,
    }));
}

export async function livePostingPenyusutanBulanan(
  periode: string,
  _user: User,
): Promise<{ jurnalId: string; totalPenyusutan: number }> {
  const row = await minta<BtPostingPenyusutanResponse>("/api/fixed-assets/depreciation/post", {
    method: "POST",
    body: { period: periode },
    idempotensiKunci: buatKunciIdempotensi(),
  });

  if (row.postedCount === 0) {
    throw new LiveApiError("Tidak ada aset yang perlu disusutkan pada periode ini.", 409);
  }

  // Engine menulis satu jurnal per aset; POS hanya butuh totalnya.
  return {
    jurnalId: row.postings.length === 1 ? row.postings[0].journalId : "",
    totalPenyusutan: row.totalCharge,
  };
}

function tipeMutasiAsetEngine(jenis: MutasiAset["jenis"]): string {
  switch (jenis) {
    case "penjualan":
      return "SALE";
    case "pemindahan":
      return "TRANSFER";
    case "penghapusan":
      return "DISPOSAL";
    default:
      throw new LiveApiError(
        "Pembelian aset dicatat lewat form Tambah Aset, bukan lewat mutasi.",
        400,
      );
  }
}

function petakanMutasiAset(m: BtMutasiAset): MutasiAset {
  const jenis: MutasiAset["jenis"] =
    m.type === "SALE" ? "penjualan" : m.type === "TRANSFER" ? "pemindahan" : "penghapusan";

  return {
    id: m.id,
    asetId: m.fixedAssetId,
    jenis,
    tanggal: m.mutationDate.slice(0, 10),
    nilai: m.amount,
    keterangan: m.note ?? "",
    lokasiBaru: m.newLocation ?? undefined,
    createdAt: m.createdAt,
  };
}

export async function liveMutasiAset(
  input: Omit<MutasiAset, "id" | "createdAt">,
  _user: User,
): Promise<MutasiAset> {
  const tipe = tipeMutasiAsetEngine(input.jenis);
  const row = await minta<BtMutasiAset>(
    `/api/fixed-assets/${encodeURIComponent(input.asetId)}/mutations`,
    {
      method: "POST",
      body: {
        type: tipe,
        mutationDate: input.tanggal,
        amount: tipe === "SALE" ? input.nilai : 0,
        note: input.keterangan.trim() || null,
        newLocation: tipe === "TRANSFER" ? (input.lokasiBaru?.trim() || null) : null,
      },
    },
  );

  return petakanMutasiAset(row);
}

export async function liveLaporanAsetTetap(periode: string): Promise<LaporanAsetTetap[]> {
  const rows = await minta<BtLaporanAsetTetap[]>(
    `/api/fixed-assets/report?period=${encodeURIComponent(periode)}`,
  );

  return rows.map((r) => ({
    aset: petakanAsetTetap(r.asset),
    penyusutanPeriode: r.depreciationCharge,
    akumulasiPenyusutan: r.accumulatedDepreciation,
    nilaiBuku: r.bookValue,
  }));
}

// ===== INVENTARIS (INVENTORY) =====

function petakanGudang(w: BtGudang): Gudang {
  return {
    id: w.id,
    kode: w.code,
    nama: w.name,
    alamat: w.address ?? undefined,
    isDefault: w.isDefault,
    isActive: w.isActive,
    createdAt: w.createdAt ?? "",
    updatedAt: w.createdAt ?? "",
  };
}

export async function liveDaftarGudang(): Promise<Gudang[]> {
  const data = await minta<BtGudang[]>("/api/warehouses?includeInactive=true");
  return data.map(petakanGudang);
}

export async function liveBuatGudang(
  input: Omit<Gudang, "id" | "createdAt" | "updatedAt">,
): Promise<Gudang> {
  const data = await minta<BtGudang>("/api/warehouses", {
    method: "POST",
    body: {
      code: input.kode,
      name: input.nama,
      address: input.alamat ?? null,
      isDefault: input.isDefault,
    },
  });
  return petakanGudang(data);
}

export async function liveNonaktifkanGudang(id: string): Promise<void> {
  await minta(`/api/warehouses/${id}/deactivate`, { method: "POST" });
}

export async function liveStokGudang(gudangId?: string): Promise<InventoryValuation> {
  const [produk, gudang] = await Promise.all([
    minta<BtProduk[]>("/api/products"),
    minta<BtGudang[]>("/api/warehouses?includeInactive=true"),
  ]);
  const petaProduk = new Map(produk.map((p) => [p.id, p]));
  const petaGudang = new Map(gudang.map((g) => [g.id, g]));
  const gudangNama = gudangId ? petaGudang.get(gudangId)?.name ?? gudangId : "Semua Gudang";

  // Nilai persediaan harus mengikuti HPP engine, dan endpoint valuasi hanya
  // menerima satu gudang per panggilan. Tampilan "semua gudang" menjumlahkan
  // valuasi tiap gudang (bukan mengalikan qty dengan harga beli master).
  const target = gudangId ? [gudangId] : gudang.map((g) => g.id);
  const valuasi = await Promise.all(
    target.map((id) =>
      minta<BtStockValuation>(
        `/api/inventory/stock-valuation?warehouseId=${encodeURIComponent(id)}`,
      ),
    ),
  );

  const agregat = new Map<string, { qty: number; nilai: number }>();
  for (const v of valuasi) {
    for (const item of v.items) {
      if (item.onHand === 0) continue;
      const cur = agregat.get(item.productId) ?? { qty: 0, nilai: 0 };
      cur.qty += item.onHand;
      cur.nilai += item.totalValue;
      agregat.set(item.productId, cur);
    }
  }

  const items = [...agregat.entries()]
    .filter(([, a]) => a.qty !== 0)
    .map(([productId, a]) => {
      const p = petaProduk.get(productId);
      return {
        productId,
        productNama: p?.name ?? productId,
        sku: p?.code ?? "",
        satuan: p?.baseUnitId ?? "",
        gudangId: gudangId ?? "",
        gudangNama,
        qty: a.qty,
        hargaRataRata: a.nilai / a.qty,
        totalNilai: a.nilai,
      };
    })
    .sort((a, b) => b.totalNilai - a.totalNilai);

  return {
    gudangId,
    gudangNama,
    totalProduk: items.length,
    totalQty: items.reduce((s, i) => s + i.qty, 0),
    totalNilai: items.reduce((s, i) => s + i.totalNilai, 0),
    items,
  };
}

export async function liveRingkasanInventaris(): Promise<InventorySummary> {
  const semuaGudang = await liveDaftarGudang();
  // Satu valuasi per gudang dipakai dua kali: total seluruh gudang dan rincian
  // per gudang. Menghitung total lewat satu panggilan "semua gudang" terpisah
  // hanya menggandakan pekerjaan engine.
  const valuasi = await Promise.all(
    semuaGudang.map(async (g) => ({
      gudang: g,
      nilai: await liveStokGudang(g.id),
    })),
  );
  const gudangAktif = valuasi.filter((v) => v.gudang.isActive);

  const produk = await minta<BtProduk[]>("/api/products");
  const qtyPerProduk = new Map<string, number>();
  let totalQty = 0;
  let totalNilai = 0;
  for (const v of valuasi) {
    totalQty += v.nilai.totalQty;
    totalNilai += v.nilai.totalNilai;
    for (const item of v.nilai.items) {
      qtyPerProduk.set(
        item.productId,
        (qtyPerProduk.get(item.productId) ?? 0) + item.qty,
      );
    }
  }

  let lowStockCount = 0;
  let outOfStockCount = 0;
  for (const p of produk) {
    const qty = qtyPerProduk.get(p.id) ?? 0;
    if (qty === 0) outOfStockCount += 1;
    else if (p.minimumStock > 0 && qty <= p.minimumStock) lowStockCount += 1;
  }

  return {
    totalProduk: produk.filter((p) => p.isActive).length,
    totalGudang: gudangAktif.length,
    totalQty,
    totalNilai,
    lowStockCount,
    outOfStockCount,
    nilaiPerGudang: gudangAktif.map((v) => ({
      gudangId: v.gudang.id,
      gudangNama: v.gudang.nama,
      totalQty: v.nilai.totalQty,
      totalNilai: v.nilai.totalNilai,
    })),
  };
}

export async function liveStokRendah(): Promise<LowStockItem[]> {
  const [produk, stok, satuan] = await Promise.all([
    minta<BtProduk[]>("/api/products"),
    minta<BtStok>("/api/inventory/stock"),
    minta<BtSatuan[]>("/api/units"),
  ]);
  const namaSatuan = new Map(satuan.map((u) => [u.id, u.name]));
  const jumlahStok = new Map(stok.items.map((i) => [i.productId, i.quantity]));

  return produk
    .filter((p) => p.isActive)
    .map((p) => {
      const qty = jumlahStok.get(p.id) ?? 0;
      return {
        productId: p.id,
        productNama: p.name,
        sku: p.code,
        satuan: namaSatuan.get(p.baseUnitId) ?? p.baseUnitId,
        gudangId: "",
        gudangNama: "Semua Gudang",
        qty,
        stokMinimum: p.minimumStock,
        kekurangan: Math.max(0, p.minimumStock - qty),
      };
    })
    .filter((r) => r.stokMinimum > 0 && r.qty > 0 && r.qty <= r.stokMinimum)
    .sort((a, b) => b.kekurangan - a.kekurangan);
}

export async function liveMutasiStok(productId: string, gudangId?: string): Promise<StockMovement[]> {
  const query = new URLSearchParams({ productId });
  if (gudangId) query.set("warehouseId", gudangId);

  const rows = await minta<BtMutasiStok[]>(`/api/inventory/movements?${query.toString()}`);

  return rows.map((row) => ({
    id: row.movementId,
    productId: row.productId,
    gudangId: row.warehouseId,
    tipe: tipeMutasiEngine(row.movementType),
    // Engine menyimpan qty bertanda; tabel menampilkan besaran seperti mode mock.
    qty: Math.abs(row.quantity),
    qtySebelum: row.quantityBefore,
    qtySesudah: row.quantityAfter,
    hargaSatuan: row.unitCost,
    totalNilai: Math.abs(row.totalValue),
    referensi: referensiMutasi(row),
    createdAt: row.createdAt,
    // Engine tidak menyimpan aktor di movement; biarkan kosong daripada mengarang.
    createdBy: "",
  })).reverse();
}

function tipeMutasiEngine(movementType: string): StockMovementType {
  switch (movementType) {
    case "WAREHOUSE_TRANSFER_IN":
      return "transfer_masuk";
    case "WAREHOUSE_TRANSFER_OUT":
      return "transfer_keluar";
    case "SALE_ISSUE":
    case "PURCHASE_RETURN_OUT":
      return "keluar";
    default:
      return "masuk";
  }
}

function referensiMutasi(row: BtMutasiStok): StockMovementRef {
  if (row.purchaseItemId) return { jenis: "pembelian", id: row.purchaseItemId, nomor: row.purchaseItemId };
  if (row.saleItemId) return { jenis: "penjualan", id: row.saleItemId, nomor: row.saleItemId };
  if (row.saleReturnItemId) {
    return { jenis: "retur_penjualan", id: row.saleReturnItemId, nomor: row.saleReturnItemId };
  }
  if (row.purchaseReturnItemId) {
    return { jenis: "retur_pembelian", id: row.purchaseReturnItemId, nomor: row.purchaseReturnItemId };
  }

  if (row.movementType === "WAREHOUSE_TRANSFER_OUT") {
    // Hanya sisi gudang yang diketahui dari baris movement itu sendiri;
    // pasangannya tidak disimpan engine.
    return { jenis: "transfer", id: row.movementId, gudangAsal: row.warehouseId };
  }
  if (row.movementType === "WAREHOUSE_TRANSFER_IN") {
    return { jenis: "transfer", id: row.movementId, gudangTujuan: row.warehouseId };
  }

  return {
    jenis: "penyesuaian",
    id: row.movementId,
    alasan: row.movementType === "STOCK_ADJUSTMENT_IN" ? "penyesuaian masuk" : "penyesuaian keluar",
  };
}

export async function livePenyesuaianStokGudang(
  input: StockAdjustmentInput,
  user: User,
): Promise<StockMovement> {
  const [stok, produk] = await Promise.all([
    minta<BtStok>(`/api/inventory/stock?warehouseId=${encodeURIComponent(input.gudangId)}`),
    minta<BtProduk[]>("/api/products"),
  ]);
  const target = produk.find((p) => p.id === input.productId);
  if (!target) throw new LiveApiError("Produk tidak ditemukan.", 404);

  const qtySebelum = stok.items.find((i) => i.productId === input.productId)?.quantity ?? 0;
  const selisih = input.stokFisik - qtySebelum;
  if (selisih === 0) {
    throw new LiveApiError("Stok fisik sama dengan stok sistem — tidak ada penyesuaian.", 400);
  }

  const masuk = selisih > 0;
  const hasil = await minta<{ movementId: string; quantity: number; unitCost: number; totalCost: number }>(
    "/api/inventory/adjustments",
    {
      method: "POST",
      idempotensiKunci: buatKunciIdempotensi(),
      body: {
        productId: input.productId,
        warehouseId: input.gudangId,
        direction: masuk ? "IN" : "OUT",
        quantity: Math.abs(selisih),
        movementType: masuk ? "STOCK_ADJUSTMENT_IN" : "STOCK_ADJUSTMENT_OUT",
        costingMethod: "AVERAGE",
        ...(masuk ? { unitCost: target.purchasePrice } : {}),
        reason: input.catatan || input.alasan,
      },
    },
  );

  return {
    id: hasil.movementId,
    productId: input.productId,
    gudangId: input.gudangId,
    tipe: masuk ? "masuk" : "keluar",
    qty: Math.abs(selisih),
    qtySebelum,
    qtySesudah: input.stokFisik,
    hargaSatuan: hasil.unitCost,
    totalNilai: hasil.totalCost,
    referensi: { jenis: "penyesuaian", id: hasil.movementId, alasan: input.alasan },
    keterangan: input.catatan,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
  };
}

export async function liveTransferStok(
  input: StockTransferInput,
  user: User,
): Promise<{ keluar: StockMovement; masuk: StockMovement }> {
  const idempotensiKunci = buatKunciIdempotensi();
  const [stokAsal, stokTujuan] = await Promise.all([
    minta<BtStok>(`/api/inventory/stock?warehouseId=${encodeURIComponent(input.gudangAsalId)}`),
    minta<BtStok>(`/api/inventory/stock?warehouseId=${encodeURIComponent(input.gudangTujuanId)}`),
  ]);
  const qtyAsalSebelum = stokAsal.items.find((i) => i.productId === input.productId)?.quantity ?? 0;
  const qtyTujuanSebelum = stokTujuan.items.find((i) => i.productId === input.productId)?.quantity ?? 0;

  const response = await minta<{
    outMovementId: string;
    inMovementId: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    outCostLayerId: string;
    inCostLayerId: string;
  }>(
    "/api/inventory/transfers",
    {
      method: "POST",
      body: {
        transferDate: new Date().toISOString().slice(0, 10),
        productId: input.productId,
        fromWarehouseId: input.gudangAsalId,
        toWarehouseId: input.gudangTujuanId,
        quantity: input.qty,
        costingMethod: "AVERAGE",
        reason: input.catatan ?? null,
      },
      idempotensiKunci,
    },
  );

  const now = new Date().toISOString();

  // Need to get product name and warehouse names for the StockMovement records
  const [gudangAsal, gudangTujuan] = await Promise.all([
    minta<BtGudang>(`/api/warehouses/${input.gudangAsalId}`),
    minta<BtGudang>(`/api/warehouses/${input.gudangTujuanId}`),
  ]);

  const keluar: StockMovement = {
    id: response.outMovementId,
    productId: input.productId,
    gudangId: input.gudangAsalId,
    tipe: "keluar",
    qty: -response.quantity,
    qtySebelum: qtyAsalSebelum,
    qtySesudah: qtyAsalSebelum - response.quantity,
    hargaSatuan: response.unitCost,
    totalNilai: response.totalCost,
    referensi: { jenis: "transfer", id: response.outMovementId, gudangAsal: input.gudangAsalId, gudangTujuan: input.gudangTujuanId },
    keterangan: input.catatan ?? `Transfer ke ${gudangTujuan?.name ?? input.gudangTujuanId}`,
    createdAt: now,
    createdBy: user.id,
  };

  const masuk: StockMovement = {
    id: response.inMovementId,
    productId: input.productId,
    gudangId: input.gudangTujuanId,
    tipe: "masuk",
    qty: response.quantity,
    qtySebelum: qtyTujuanSebelum,
    qtySesudah: qtyTujuanSebelum + response.quantity,
    hargaSatuan: response.unitCost,
    totalNilai: response.totalCost,
    referensi: { jenis: "transfer", id: response.inMovementId, gudangAsal: input.gudangAsalId, gudangTujuan: input.gudangTujuanId },
    keterangan: input.catatan ?? `Transfer dari ${gudangAsal?.name ?? input.gudangAsalId}`,
    createdAt: now,
    createdBy: user.id,
  };

  return { keluar, masuk };
}

export async function liveDaftarOpname(): Promise<StockOpname[]> {
  const rows = await minta<BtOpname[]>("/api/inventory/opnames");
  return rows.map(opnameEngine);
}

export async function liveBuatOpname(
  input: StockOpnameInput,
  _user: User,
): Promise<StockOpname> {
  const row = await minta<BtOpname>("/api/inventory/opnames", {
    method: "POST",
    body: {
      opnameDate: input.tanggal,
      warehouseId: input.gudangId,
      notes: input.catatan ?? null,
      items: input.items.map((item) => ({
        productId: item.productId,
        physicalQuantity: item.qtyFisik,
        notes: item.keterangan ?? null,
      })),
    },
    idempotensiKunci: buatKunciIdempotensi(),
  });

  return opnameEngine(row);
}

export async function liveSelesaikanOpname(id: string, _user: User): Promise<StockOpname> {
  const row = await minta<BtOpname>(
    `/api/inventory/opnames/${encodeURIComponent(id)}/complete?costingMethod=AVERAGE`,
    {
      method: "POST",
      idempotensiKunci: buatKunciIdempotensi(),
    },
  );

  return opnameEngine(row);
}

export async function liveBatalkanOpname(id: string, _user: User): Promise<StockOpname> {
  const row = await minta<BtOpname>(
    `/api/inventory/opnames/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      idempotensiKunci: buatKunciIdempotensi(),
    },
  );

  return opnameEngine(row);
}

function statusOpnameEngine(status: string): StockOpname["status"] {
  switch (status) {
    case "COMPLETED":
      return "selesai";
    case "CANCELLED":
      return "dibatalkan";
    default:
      return "draft";
  }
}

function opnameEngine(row: BtOpname): StockOpname {
  return {
    id: row.id,
    nomor: row.number,
    gudangId: row.warehouseId,
    tanggal: row.opnameDate.slice(0, 10),
    status: statusOpnameEngine(row.status),
    items: row.items.map((item) => ({
      productId: item.productId,
      qtySistem: item.systemQuantity,
      qtyFisik: item.physicalQuantity,
      selisih: item.difference,
      hargaRataRata: item.unitCost,
      nilaiSelisih: item.valueDifference,
      keterangan: item.notes ?? undefined,
    })),
    catatan: row.notes ?? undefined,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
  };
}
