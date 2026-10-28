export type Product = {
  id: string;
  sku: string;
  barcode: string;
  nama: string;
  satuan: string;
  kategori: string;
  hargaBeli: number;
  hargaJual: number;
  stok: number;
  stokMinimum: number;
  status: "aktif" | "nonaktif";
};

export type CartLine = {
  product: Product;
  qty: number;
  diskon: number;
};

export type PaymentMethod = "tunai" | "transfer" | "qris";

export type PaymentAllocation = {
  metode: PaymentMethod;
  rekening: string;
  nominal: number;
};

export type CheckoutPayload = {
  lines: CartLine[];
  diskonTransaksi: number;
  pajak: number;
  allocations: PaymentAllocation[];
  gunakanPiutang: boolean;
  pelanggan?: string;
  kasir: string;
  shiftId: string;
  idempotensiKunci: string;
};

export type CheckoutResult = {
  nomor: string;
  total: number;
  kembalian: number;
  piutang: number;
  status: "lunas" | "menunggu_pembayaran" | "dibayar_sebagian";
};

export type ShiftInfo = {
  id: string;
  kasir: string;
  mulai: string;
  saldoAwal: number;
  kasMasuk: number;
  kasKeluar: number;
  penjualanTunai: number;
  kasTunaiSistem: number;
};

export type ShiftRiwayat = ShiftInfo & {
  selesai: string;
  uangFisik: number;
  selisih: number;
};

export type ShiftMutasiInput = {
  jenis: "masuk" | "keluar";
  nominal: number;
  catatan?: string;
};

export type ShiftBukaInput = {
  kasir: string;
  saldoAwal: number;
};

export type TransaksiItem = {
  nama: string;
  qty: number;
  hargaJual: number;
  diskon: number;
  hargaBeli?: number; // snapshot HPP pada saat transaksi, untuk pembalikan akurat saat void
};

export type TransaksiRiwayat = {
  nomor: string;
  waktu: string;
  kasir: string;
  shiftId: string;
  pelanggan?: string;
  items: TransaksiItem[];
  diskonTransaksi: number;
  pajak: number;
  total: number;
  kembalian: number;
  piutang: number;
  status: "lunas" | "menunggu_pembayaran" | "dibayar_sebagian" | "dibatalkan";
  pembayaran?: Array<{ metode: PaymentMethod; nominal: number }>;
};

export type SaleReturn = {
  id: string;
  documentNumber: string | null;
  saleId: string;
  customerName: string | null;
  totalAmount: number;
  status: string;
  createdAt: string;
};

export type ReturRiwayatParams = {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type ReturPenjualan = {
  id: string;
  nomor: string;
  referensi: string;
  waktu: string;
  items: Array<{ nama: string; qty: number; hargaJual: number }>;
  total: number;
  alasan: string;
  metodeRefund?: "tunai" | "transfer";
  pelanggan?: string;
  status?: string;
};

export type ReturInput = {
  referensi: string;
  items: Array<{ nama: string; qty: number }>;
  alasan: string;
  metodeRefund: "tunai" | "transfer";
};

export type PenyesuaianStokInput = {
  productId: string;
  stokFisik: number;
  alasan: string;
};

export type PembelianItem = {
  productId: string;
  nama: string;
  qty: number;
  hargaBeli: number;
};

export type PembelianMetode = "tunai" | "bank" | "hutang";

export type Pembelian = {
  id: string;
  nomor: string;
  pemasok: string;
  waktu: string;
  items: PembelianItem[];
  total: number;
  metode: PembelianMetode;
  terbayar: number;
};

export type PembelianInput = {
  pemasok: string;
  items: PembelianItem[];
  metode: PembelianMetode;
};

export type Biaya = {
  id: string;
  waktu: string;
  kategori: string;
  nominal: number;
  metode: "tunai" | "transfer";
  catatan?: string;
};

export type BiayaParams = {
  from?: string;
  to?: string;
};

export type Expense = {
  id: string;
  businessId: string;
  expenseDate: string;
  category: string;
  amount: number;
  paymentMethod: "tunai" | "transfer";
  note?: string | null;
  expenseAccountCode: string;
  paymentAccountCode: string;
  cashAccountId: string;
  cashMovementId: string;
  journalId?: string | null;
  requestedBy: string;
  version: number;
  createdAt: string;
  replayed: boolean;
};

export type CreateExpenseRequest = {
  expenseDate?: string;
  category: string;
  amount: number;
  paymentMethod: "tunai" | "transfer";
  accountCode?: string;
  expenseAccountCode?: string;
  paymentAccountCode?: string;
  note?: string;
  requestedBy?: string;
};

export type JurnalBaris = { akun: string; debit: number; kredit: number };

export type JurnalEntry = {
  id: string;
  waktu: string;
  keterangan: string;
  ref: string;
  baris: JurnalBaris[];
};

export type JurnalParams = {
  from?: string;
  to?: string;
};

export type AkunSaldo = { akun: string; debit: number; kredit: number; saldo: number };

export type LabaRugi = {
  pendapatan: number;
  retur: number;
  hpp: number;
  biaya: number;
  pajak: number;
  laba: number;
};

export type Role = "pemilik" | "kasir";

export type User = {
  id: string;
  nama: string;
  username: string;
  role: Role;
};

export type LoginResult = {
  user: User;
  accessToken: string;
  refreshToken: string;
  kedaluwarsa: number;
};

export type AuditEntry = {
  id: string;
  waktu: string;
  user: string;
  aksi: string;
  detail: string;
};

export type ProfilToko = {
  nama: string;
  alamat: string;
  telepon: string;
  mataUang: string;
  zonaWaktu: string;
  footerStruk: string;
  pajakPersen?: number;
};

export type Pelanggan = {
  id: string;
  nama: string;
  telepon: string;
  alamat?: string;
  batasKredit?: number;
};

export type ImporProdukBaris = {
  sku: string;
  nama: string;
  barcode: string;
  satuan: string;
  kategori: string;
  hargaBeli: number;
  hargaJual: number;
  stok: number;
  stokMinimum: number;
};

export type ImporPelangganBaris = {
  nama: string;
  telepon: string;
  alamat: string;
  batasKredit: number;
};

export type ImporSaldoAwalBaris = { akun: string; debit: number; kredit: number };

export type HasilImpor = { sukses: number; gagal: number; pesan: string[] };

export type ImportRowError = { rowNumber: number; message: string };

export type ImportResult = {
  totalRows: number;
  successCount: number;
  failedCount: number;
  errors: ImportRowError[];
};
