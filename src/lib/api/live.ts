import { useAuth } from "@/lib/store/auth";
import type {
  AkunSaldo,
  Biaya,
  BiayaParams,
  CheckoutPayload,
  CheckoutResult,
  Expense,
  ImportResult,
  ImporProdukBaris,
  JurnalEntry,
  JurnalParams,
  LabaRugi,
  LoginResult,
  Pelanggan,
  Pembelian,
  PembelianInput,
  Product,
  ReturInput,
  ReturPenjualan,
  ReturRiwayatParams,
  SaleReturn,
  ShiftBukaInput,
  ShiftInfo,
  ShiftMutasiInput,
  ShiftRiwayat,
  TransaksiRiwayat,
  User,
} from "@/lib/api/types";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5121").replace(/\/+$/, "");
export const BUSINESS_ID = process.env.NEXT_PUBLIC_BUSINESS_ID ?? "toko-utama";
export const ENGINE_APPROVER = process.env.NEXT_PUBLIC_ENGINE_APPROVER ?? "pemilik";

const KODE = {
  kas: process.env.NEXT_PUBLIC_ENGINE_KAS ?? "1121",
  bank: process.env.NEXT_PUBLIC_ENGINE_BANK ?? "1111",
  piutang: process.env.NEXT_PUBLIC_ENGINE_PIUTANG ?? "1200",
  persediaan: process.env.NEXT_PUBLIC_ENGINE_PERSEDIAAN ?? "1300",
  hutang: process.env.NEXT_PUBLIC_ENGINE_HUTANG ?? "2101",
  pendapatan: process.env.NEXT_PUBLIC_ENGINE_PENDAPATAN ?? "4000",
  hpp: process.env.NEXT_PUBLIC_ENGINE_HPP ?? "5000",
  pajak: process.env.NEXT_PUBLIC_ENGINE_PAJAK ?? "2402",
  biaya: process.env.NEXT_PUBLIC_ENGINE_BIAYA ?? "6900",
};

export class LiveApiError extends Error {
  readonly status: number;

  constructor(pesan: string, status: number) {
    super(pesan);
    this.name = "LiveApiError";
    this.status = status;
  }
}

export function engineBelumAda(nama: string, endpoint: string): never {
  throw new LiveApiError(
    `${nama} belum tersedia di engine C# — belum ada ${endpoint}.`,
    501,
  );
}

type OpsiLive = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  idempotensiKunci?: string;
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
  const headers = headerLive({ json: true, idempotensiKunci: opsi.idempotensiKunci });

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
type BtShift = {
  id: string;
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
type BtPenjualan = {
  id: string;
  businessTransactionId: string;
  customerId: string | null;
  saleNumber: string | null;
  saleDate: string;
  status: string;
  totalAmount: number;
  taxAmount: number;
  items: BtItem[];
};
type BtTransaksi = {
  id: string;
  transactionType: string;
  transactionDate: string;
  status: string;
  requestedBy: string;
  description: string | null;
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
  items: (BtItem & { unitCost: number })[];
};
type BtAkun = {
  accountCode: string;
  accountName: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
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
type BtAkunKas = {
  id: string;
  name: string;
  accountCode: string;
  isDefault: boolean;
  isActive: boolean;
};
type BtGudang = { id: string; code: string; name: string; isDefault: boolean; isActive: boolean };
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
  const iso = (nilai: Date) => nilai.toISOString().slice(0, 10);
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

export async function liveImporProduk(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  const response = await kirimForm("/api/products/import", form, buatKunciIdempotensi());
  return bacaImportResult(response);
}

export async function liveImporPelanggan(_file: File): Promise<ImportResult> {
  return engineBelumAda("Impor pelanggan", "POST /api/customers/import");
}

export async function liveImporSaldoAwal(_file: File): Promise<ImportResult> {
  return engineBelumAda("Impor saldo awal", "POST /api/accounts/opening-balances");
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
    kasir: s.kasir,
    mulai: s.mulai,
    saldoAwal: s.saldoAwal,
    kasMasuk: s.kasMasuk,
    kasKeluar: s.kasKeluar,
    penjualanTunai,
    kasTunaiSistem: s.kasTunaiSistem,
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
    body: { kasir: input.kasir, saldoAwal: input.saldoAwal },
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

export async function liveAkun(): Promise<AkunSaldo[]> {
  const neraca = await minta<BtNeraca>(
    `/api/reports/trial-balance?fromDate=1900-01-01&toDate=2999-12-31`,
  );
  return neraca.accounts.map((a) => ({
    akun: `${a.accountCode} ${a.accountName}`,
    debit: a.totalDebit,
    kredit: a.totalCredit,
    saldo: a.balance,
  }));
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
  return engineBelumAda("Akun kas", "POST /api/cash-accounts");
}

function ringkasAlokasi(payload: CheckoutPayload): {
  tunai: number;
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
  const nontunai = payload.allocations
    .filter((a) => a.metode !== "tunai")
    .reduce((sum, a) => sum + a.nominal, 0);
  return { tunai, nontunai, total: bersih };
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

  const cashAccountId = await akunKasDefault(
    ringkasan.tunai > 0 ? KODE.kas : KODE.bank,
  );
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
  const status: CheckoutResult["status"] = piutang > 0 ? "dibayar_sebagian" : "lunas";

  return {
    nomor: hasil.documentNumber ?? hasil.documentId,
    total: hasil.documentTotal,
    kembalian: 0,
    piutang,
    status,
  };
}
async function cariPelangganId(nama: string): Promise<string | null> {
  const pelanggan = await minta<BtPelanggan[]>("/api/customers");
  const cocok = pelanggan.find((c) => c.name.toLowerCase() === nama.trim().toLowerCase());
  return cocok?.id ?? null;
}

export async function liveTransaksiRiwayat(): Promise<TransaksiRiwayat[]> {
  const [penjualan, produk, pelanggan] = await Promise.all([
    minta<BtPenjualan[]>(`/api/sales?${rentangDaftar()}`),
    minta<BtProduk[]>("/api/products"),
    minta<BtPelanggan[]>("/api/customers"),
  ]);
  const namaProduk = new Map(produk.map((p) => [p.id, p.name]));
  const namaPelanggan = new Map(pelanggan.map((c) => [c.id, c.name]));

  const hasil: TransaksiRiwayat[] = [];
  for (const sale of penjualan) {
    let transaksi: BtTransaksi | undefined;
    try {
      transaksi = await minta<BtTransaksi>(`/api/transactions/${sale.businessTransactionId}`);
    } catch {
      transaksi = undefined;
    }
    const status: TransaksiRiwayat["status"] =
      sale.status === "VOIDED" || sale.status === "CANCELLED"
        ? "dibatalkan"
        : sale.status === "POSTED"
          ? "lunas"
          : "menunggu_pembayaran";

    hasil.push({
      nomor: sale.saleNumber ?? sale.id,
      waktu: sale.saleDate,
      kasir: transaksi?.requestedBy ?? "-",
      shiftId: "",
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
      piutang: 0,
      status,
    });
  }
  return hasil;
}

export async function livePembelianList(): Promise<Pembelian[]> {
  const [pembelian, produk, pemasok] = await Promise.all([
    minta<BtPembelian[]>(`/api/purchases?${rentangDaftar()}`),
    minta<BtProduk[]>("/api/products"),
    minta<{ id: string; name: string }[]>("/api/suppliers"),
  ]);
  const namaProduk = new Map(produk.map((p) => [p.id, p.name]));
  const namaPemasok = new Map(pemasok.map((s) => [s.id, s.name]));

  return pembelian.map((p) => ({
    id: p.id,
    nomor: p.purchaseNumber ?? p.id,
    pemasok: p.supplierId ? namaPemasok.get(p.supplierId) ?? p.supplierId : "-",
    waktu: p.purchaseDate,
    items: p.items.map((item) => ({
      productId: item.productId,
      nama: namaProduk.get(item.productId) ?? item.productId,
      qty: item.quantity,
      hargaBeli: item.unitCost,
    })),
    total: p.totalAmount,
    metode: p.payableAmount >= p.totalAmount ? "hutang" : "tunai",
    terbayar: p.totalAmount - p.payableAmount,
  }));
}

export async function livePembelianBuat(input: PembelianInput): Promise<Pembelian> {
  const gudang = await gudangDefault();
  const actor = useAuth.getState().user?.id ?? ENGINE_APPROVER;
  const total = input.items.reduce((sum, i) => sum + i.hargaBeli * i.qty, 0);

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
      supplierId: null,
      cashAccountId: await akunKasDefault(input.metode === "bank" ? KODE.bank : KODE.kas),
      paymentAmount: input.metode === "hutang" ? 0 : total,
      costingMethod: "AVERAGE",
      payableAccountCode: KODE.hutang,
      inventoryAccountCode: KODE.persediaan,
      description: `Pembelian ${input.pemasok}`,
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
    waktu: new Date().toISOString(),
    items: input.items,
    total: hasil.documentTotal,
    metode: input.metode === "bank" ? "bank" : input.metode === "hutang" ? "hutang" : "tunai",
    terbayar: input.metode === "hutang" ? 0 : hasil.documentTotal,
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

  return {
    nomor: sale.saleNumber ?? sale.id,
    waktu: sale.saleDate,
    kasir: "-",
    shiftId: "",
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
    piutang: 0,
    status: "dibatalkan",
  };
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
    minta<{
      id: string;
      items: {
        id: string;
        productId: string;
        warehouseId: string;
        quantity: number;
        unitPrice: number;
      }[];
    }>(`/api/sales/${sale.id}`),
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

  return rows.map((row) => ({
    id: row.id,
    nomor: row.documentNumber ?? row.id,
    referensi: row.saleId,
    waktu: row.createdAt,
    items: [],
    total: row.totalAmount,
    alasan: "",
    pelanggan: row.customerName ?? undefined,
    status: row.status,
  }));
}

export async function liveBuatUser(input: {
  nama: string;
  username: string;
  password: string;
  role: User["role"];
}): Promise<User> {
  if (input.role === "pemilik") {
    throw new LiveApiError(
      "Engine C# belum bisa membuat peran pemilik lewat API — endpoint POST /api/users/direct hanya menerima kasir.",
      501,
    );
  }
  const dibuat = await minta<{
    id: string;
    username: string;
    fullName: string;
    email: string | null;
    isActive: boolean;
  }>("/api/users/direct", {
    method: "POST",
    body: {
      username: input.username,
      email: `${input.username}@${BUSINESS_ID}.local`,
      password: input.password,
    },
  });
  return {
    id: dibuat.id,
    nama: dibuat.fullName || input.nama,
    username: dibuat.username,
    role: "kasir",
  };
}
