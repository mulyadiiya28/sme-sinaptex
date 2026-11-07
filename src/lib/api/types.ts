export type Product = {
  id: string;
  sku: string;
  barcode: string;
  nama: string;
  satuan: string;
  kategori: string;
  hargaBeli: number;
  hargaJual: number;
  stok: number; // total stok semua gudang (legacy compatibility)
  stokMinimum: number;
  status: "aktif" | "nonaktif";
};

/// <summary>Gudang / lokasi penyimpanan.</summary>
export type Gudang = {
  id: string;
  kode: string;
  nama: string;
  alamat?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/// <summary>Kartu stok per produk per gudang.</summary>
export type StockCard = {
  productId: string;
  gudangId: string;
  qty: number;
  hargaRataRata: number; // moving average cost
  lastUpdated: string;
};

/// <summary>Jenis mutasi stok.</summary>
export type StockMovementType =
  | "masuk" // pembelian, retur penjualan, penyesuaian +
  | "keluar" // penjualan, retur pembelian, penyesuaian -
  | "transfer_keluar" // transfer antar gudang (keluar)
  | "transfer_masuk"; // transfer antar gudang (masuk)

/// <summary>Referensi transaksi untuk mutasi stok.</summary>
export type StockMovementRef =
  | { jenis: "pembelian"; id: string; nomor: string }
  | { jenis: "penjualan"; id: string; nomor: string }
  | { jenis: "retur_penjualan"; id: string; nomor: string }
  | { jenis: "retur_pembelian"; id: string; nomor: string }
  | { jenis: "penyesuaian"; id: string; alasan: string }
  | { jenis: "transfer"; id: string; gudangAsal?: string; gudangTujuan?: string }
  | { jenis: "opname"; id: string };

/// <summary>Mutasi stok (stock movement / kardex).</summary>
export type StockMovement = {
  id: string;
  productId: string;
  gudangId: string;
  tipe: StockMovementType;
  qty: number; // besaran selalu positif; arah masuk/keluar dibaca dari `tipe`
  qtySebelum: number;
  qtySesudah: number;
  hargaSatuan: number; // harga rata-rata saat mutasi
  totalNilai: number; // qty * hargaSatuan
  referensi: StockMovementRef;
  keterangan?: string;
  createdAt: string;
  createdBy: string; // user id
};

/// <summary>Input untuk penyesuaian stok manual (di gudang tertentu).</summary>
export type StockAdjustmentInput = {
  productId: string;
  gudangId: string;
  stokFisik: number;
  alasan: "rusak" | "hilang" | "kedaluwarsa" | "opname" | "lainnya";
  catatan?: string;
};

/// <summary>Input untuk transfer stok antar gudang.</summary>
export type StockTransferInput = {
  productId: string;
  gudangAsalId: string;
  gudangTujuanId: string;
  qty: number;
  catatan?: string;
};

/// <summary>Opname stok (stock taking).</summary>
export type StockOpname = {
  id: string;
  /// Nomor dokumen dari engine (mis. OPN-0001). Mode mock tidak menyimpannya.
  nomor?: string;
  gudangId: string;
  tanggal: string;
  status: "draft" | "selesai" | "dibatalkan";
  items: StockOpnameItem[];
  catatan?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
};

/// <summary>Item dalam opname stok.</summary>
export type StockOpnameItem = {
  productId: string;
  qtySistem: number;
  qtyFisik: number;
  selisih: number; // qtyFisik - qtySistem
  hargaRataRata: number;
  nilaiSelisih: number; // selisih * hargaRataRata
  keterangan?: string;
};

/// <summary>Input untuk membuat opname stok.</summary>
export type StockOpnameInput = {
  gudangId: string;
  tanggal: string;
  items: Array<{
    productId: string;
    qtyFisik: number;
    keterangan?: string;
  }>;
  catatan?: string;
};

/// <summary>Nilai persediaan per gudang / total.</summary>
export type InventoryValuation = {
  gudangId?: string; // undefined = total semua gudang
  gudangNama?: string;
  totalProduk: number;
  totalQty: number;
  totalNilai: number; // qty * hargaRataRata
  items: InventoryValuationItem[];
};

/// <summary>Item detail nilai persediaan.</summary>
export type InventoryValuationItem = {
  productId: string;
  productNama: string;
  sku: string;
  satuan: string;
  gudangId: string;
  gudangNama: string;
  qty: number;
  hargaRataRata: number;
  totalNilai: number;
};

/// <summary>Produk dengan stok rendah (di bawah minimum).</summary>
export type LowStockItem = {
  productId: string;
  productNama: string;
  sku: string;
  satuan: string;
  gudangId: string;
  gudangNama: string;
  qty: number;
  stokMinimum: number;
  kekurangan: number; // stokMinimum - qty
};

/// <summary>Ringkasan inventaris untuk dashboard.</summary>
export type InventorySummary = {
  totalProduk: number;
  totalGudang: number;
  totalQty: number;
  totalNilai: number;
  lowStockCount: number;
  outOfStockCount: number;
  nilaiPerGudang: Array<{ gudangId: string; gudangNama: string; totalQty: number; totalNilai: number }>;
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
  status: "lunas" | "menunggu_pembayaran" | "menunggu_persetujuan" | "dibayar_sebagian";
  /**
   * True bila engine menahan batch ini untuk persetujuan. Dokumen sudah
   * tersimpan, tetapi kas, stok, dan jurnal belum berubah sampai pemilik
   * menyetujuinya di menu Persetujuan.
   */
  menungguPersetujuan?: boolean;
};

export type ShiftInfo = {
  id: string;
  cashierUserId: string;
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
  cashierUserId?: string;
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
  status: "lunas" | "menunggu_pembayaran" | "menunggu_persetujuan" | "dibayar_sebagian" | "dibatalkan";
  pembayaran?: Array<{ metode: PaymentMethod; nominal: number }>;
};

/**
 * Satu kaki transaksi yang menunggu persetujuan (GET /api/transactions).
 *
 * Satu batch kas bisa punya dua kaki (dokumen + pembayaran); keduanya harus
 * disetujui sebelum batch boleh diposting.
 */
export type PersetujuanTransaksi = {
  id: string;
  batchId: string;
  tipe: string;
  peminta: string;
  tanggal: string;
  keterangan: string | null;
  nominal: number;
  langkah: Array<{ nomor: number; level: number; status: string }>;
};

/** Batch kas yang tertahan oleh aturan approval. */
export type PersetujuanBatch = {
  batchId: string;
  peminta: string;
  tanggal: string;
  keterangan: string | null;
  nominal: number;
  transaksi: PersetujuanTransaksi[];
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

/// <summary>Aset tetap (fixed asset) — barang tidak lancar untuk operasional.</summary>
export type AsetTetap = {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  nilaiPerolehan: number;
  nilaiResidu: number;
  umurEkonomis: number; // bulan
  metodePenyusutan: "garis-lurus" | "menurun-ganda" | "jumlah-tahun";
  tanggalPerolehan: string; // ISO date
  lokasi: string;
  status: "aktif" | "dijual" | "dihapuskan" | "dipindahkan";
  akunAset: string; // kode akun aset (mis. 1501 Mesin)
  akunPenyusutan: string; // kode akun penyusutan (mis. 1511 Akum. Penyusutan Mesin)
  akunBebanPenyusutan: string; // kode akun beban penyusutan (mis. 6911 Beban Penyusutan)
  catatan?: string;
  createdAt: string;
  updatedAt: string;
};

/// <summary>Input untuk create/update aset tetap (tanpa id & timestamps).</summary>
export type AsetTetapInput = Omit<AsetTetap, "id" | "createdAt" | "updatedAt">;

/// <summary>Item penyusutan bulanan untuk satu aset.</summary>
export type PenyusutanItem = {
  asetId: string;
  periode: string; // YYYY-MM
  nilaiPenyusutan: number;
  akumulasiPenyusutan: number;
  nilaiBuku: number;
};

/// <summary>Mutasi aset tetap (pembelian, penjualan, pemindahan, penghapusan).</summary>
export type MutasiAset = {
  id: string;
  asetId: string;
  jenis: "pembelian" | "penjualan" | "pemindahan" | "penghapusan";
  tanggal: string;
  nilai: number; // untuk penjualan: harga jual; untuk pembelian: nilai perolehan
  keterangan: string;
  lokasiBaru?: string;
  createdAt: string;
};

/// <summary>Laporan aset tetap per periode.</summary>
export type LaporanAsetTetap = {
  aset: AsetTetap;
  penyusutanPeriode: number;
  akumulasiPenyusutan: number;
  nilaiBuku: number;
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
  supplierId: string | null;
  waktu: string;
  items: PembelianItem[];
  total: number;
  metode: PembelianMetode;
  terbayar: number;
};

export type PembelianInput = {
  pemasok: string;
  supplierId: string | null;
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

export type AkunSaldo = {
  akun: string;
  kode: string;
  nama: string;
  saldoAwal: number;
  debit: number;
  kredit: number;
  saldo: number;
  saldoAkhir: number;
};

export type NeracaParams = {
  from?: string;
  to?: string;
};

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

export type PkpStatus = "NON_PKP" | "PKP";

export type ProfilToko = {
  nama: string;
  alamat: string;
  telepon: string;
  email?: string;
  website?: string;
  npwp?: string;
  logoUrl?: string;
  mataUang: string;
  zonaWaktu: string;
  footerStruk: string;
  pajakPersen?: number;
  pkpStatus?: PkpStatus;
  /** Tarif pajak efektif: 11 (PKP/PPN 11%) atau 0.5 (Non-PKP/PPh Final 0.5%) */
  pajakTarifEfektif?: number;
};

/// <summary>Profil toko sesuai kontrak engine (`GET/PUT /api/settings/company-profile`).</summary>
export type CompanyProfile = {
  nama: string;      // CompanyName
  alamat: string;    // Address
  telepon: string;   // Phone
  email: string;     // Email
  website: string;   // Website
  npwp: string;      // TaxNumber
  logoUrl: string;   // LogoUrl
};

/// <summary>Nama lama tipe profil — dipakai POS di beberapa tempat.</summary>
export type ProfilPerusahaan = CompanyProfile;

/// <summary>Kebijakan operasional toko per tenant (engine: /api/settings/operational-policy).</summary>
export type KebijakanOperasional = {
  izinkanKredit: boolean;
  saldoAwalShift: number;
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

/// <summary>The verdict on one figure: how healthy it is, why, and what it was measured against.</summary>
export type Assessment = {
  rating: string;
  explanation: string;
  benchmark: string;
};

/// <summary>The profitability ratios of a period.</summary>
export type ProfitabilityRatio = {
  roe: number;
  roa: number;
  netProfitMargin: number;
  totalNetIncome: number;
  totalEquity: number;
  totalAssets: number;
  totalRevenue: number;
  roeAssessment: Assessment;
  roaAssessment: Assessment;
  netProfitMarginAssessment: Assessment;
  description: string;
};

/// <summary>How fast the stock turns over.</summary>
export type InventoryTurnover = {
  turnoverRatio: number;
  daysInInventory: number;
  costOfGoodsSold: number;
  averageInventory: number;
  assessment: Assessment;
  description: string;
};

/// <summary>How fast receivables or payables turn over.</summary>
export type ArApTurnover = {
  turnoverRatio: number;
  daysOutstanding: number;
  totalBase: number;
  averageBalance: number;
  assessment: Assessment;
  description: string;
};

/// <summary>One liquidity ratio.</summary>
export type LiquidityRatio = {
  ratio: number;
  numerator: number;
  denominator: number;
  description: string;
  assessment: Assessment;
};

/// <summary>Working capital on one date.</summary>
export type WorkingCapital = {
  currentAssets: number;
  currentLiabilities: number;
  workingCapital: number;
  workingCapitalRatio: number;
  description: string;
  assessment: Assessment;
};

/// <summary>How fast working capital turns over in a period.</summary>
export type WorkingCapitalTurnover = {
  turnoverRatio: number;
  daysTurnover: number;
  totalRevenue: number;
  averageWorkingCapital: number;
  openingWorkingCapital: number;
  closingWorkingCapital: number;
  assessment: Assessment;
  description: string;
};

/// <summary>How one product performed.</summary>
export type ProductPerformance = {
  productId: string;
  productName: string;
  totalQuantitySold: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPercentage: number;
  revenueContributionPercentage: number;
  profitContributionPercentage: number;
  assessment: Assessment;
  description: string;
};

/// <summary>Five product rankings of a period.</summary>
export type ProductPerformanceRankings = {
  fastMoving: ProductPerformance[];
  slowMoving: ProductPerformance[];
  highMargin: ProductPerformance[];
  topRevenue: ProductPerformance[];
  topProfit: ProductPerformance[];
};

/// <summary>How the business is financed.</summary>
export type Solvency = {
  debtToAssets: number;
  debtToEquity: number;
  equityRatio: number;
  totalLiabilities: number;
  totalAssets: number;
  totalEquity: number;
  assessment: Assessment;
  description: string;
};

/// <summary>How long money is tied up between paying and being paid.</summary>
export type CashConversionCycle = {
  cashConversionCycleDays: number;
  daysInventoryOutstanding: number;
  daysSalesOutstanding: number;
  daysPayableOutstanding: number;
  assessment: Assessment;
  description: string;
};

/// <summary>Where ROE comes from.</summary>
export type Dupont = {
  returnOnEquity: number;
  netProfitMargin: number;
  assetTurnover: number;
  equityMultiplier: number;
  dominantDriver: string;
};

/// <summary>One indicator in the health summary.</summary>
export type HealthIndicator = {
  name: string;
  unit: string;
  value: number;
  displayValue: string;
  previousValue: number | null;
  trend: string;
  rating: string;
  explanation: string;
  benchmark: string;
};

/// <summary>The health of the business on one date.</summary>
export type HealthSummary = {
  date: string;
  startDate: string;
  endDate: string;
  comparisonStartDate: string;
  comparisonEndDate: string;
  overallVerdict: string;
  overallExplanation: string;
  indicators: HealthIndicator[];
  dupont: Dupont;
};

/// <summary>Umur piutang atau hutang per faktur.</summary>
export type AgedInvoice = {
  invoiceId: string;
  invoiceNumber: string | null;
  counterpartyId: string | null;
  invoiceDate: string;
  dueDate: string | null;
  invoiceTotal: number;
  allocatedTotal: number;
  outstandingAmount: number;
  daysOverdue: number;
  bucket: "CURRENT" | "DAYS_30" | "DAYS_60" | "DAYS_90" | "OVER_90";
};

/// <summary>Laporan umur piutang/hutang dari engine.</summary>
export type AgingReport = {
  side: "RECEIVABLE" | "PAYABLE";
  asOfDate: string;
  outstandingTotal: number;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  invoices: AgedInvoice[];
};

/// <summary>Hasil rekonsiliasi piutang/hutang terhadap saldo akun buku besar.</summary>
export type Reconciliation = {
  side: string;
  accountCode: string;
  invoiceCount: number;
  invoicedTotal: number;
  allocatedTotal: number;
  outstandingTotal: number;
  ledgerBalance: number;
  difference: number;
  isReconciled: boolean;
};

/// <summary>Periode fiskal dari engine (GET/POST /api/fiscal-periods).</summary>
export type FiscalPeriod = {
  id: string;
  businessId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED" | "LOCKED";
  version: number;
};

/// <summary>Request membuat periode fiskal baru (POST /api/fiscal-periods).</summary>
export type CreateFiscalPeriodRequest = {
  name: string;
  startDate: string;
  endDate: string;
  status?: "OPEN" | "CLOSED" | "LOCKED";
};

/// <summary>Satu entri dalam Gerakan Harian: satu baris jurnal pada satu akun.</summary>
export type DailyMovementEntry = {
  journalId: string;
  entryDate: string;
  transactionType: string | null;
  transactionDescription: string | null;
  referenceType: string | null;
  referenceId: string | null;
  reversalOfJournalId: string | null;
  lineDescription: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
};

/// <summary>Gerakan Harian untuk satu akun pada satu tanggal.</summary>
export type DailyMovementReport = {
  date: string;
  accountCode: string;
  accountName: string;
  openingBalance: number;
  entries: DailyMovementEntry[];
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
};

/// <summary>Aturan approval transaksi (engine: GET/POST /api/approval-rules).</summary>
export type ApprovalRule = {
  id: string;
  businessId: string;
  name: string | null;
  transactionType: string;
  minimumAmount: number;
  requiredLevel: number;
  resolutionMode: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

/// <summary>Request membuat aturan approval baru (POST /api/approval-rules).</summary>
export type CreateApprovalRuleRequest = {
  name?: string;
  transactionType: string;
  minimumAmount: number;
  requiredLevel: number;
  resolutionMode?: string;
};

/// <summary>Supplier master data (engine: GET/POST /api/suppliers).</summary>
export type Supplier = {
  id: string;
  businessId: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
  isActive: boolean;
};

/// <summary>Request membuat supplier baru (POST /api/suppliers).</summary>
export type CashAccount = {
  id: string;
  nama: string;
  kode: string;
  saldo: number;
  bawaan: boolean;
  aktif: boolean;
};

/** Satu transfer dana antar akun kas (bukan pendapatan/biaya). */
export type TransferKas = {
  id: string;
  waktu: string;
  dariAkunId: string;
  dariNama: string;
  keAkunId: string;
  keNama: string;
  nominal: number;
  keterangan?: string;
  menungguPersetujuan: boolean;
};

export type TransferKasInput = {
  dariAkunId: string;
  keAkunId: string;
  nominal: number;
  keterangan?: string;
};

export type CreateSupplierRequest = {
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
};
