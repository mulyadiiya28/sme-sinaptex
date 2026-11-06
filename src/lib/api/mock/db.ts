import type {
  AgedInvoice,
  AgingReport,
  ApprovalRule,
  Biaya,
  CashAccount,
  CreateApprovalRuleRequest,
  CreateFiscalPeriodRequest,
  CreateSupplierRequest,
  DailyMovementEntry,
  DailyMovementReport,
  FiscalPeriod,
  HasilImpor,
  HealthIndicator,
  HealthSummary,
  ImporPelangganBaris,
  ImporProdukBaris,
  ImporSaldoAwalBaris,
  JurnalBaris,
  JurnalEntry,
  LoginResult,
  Pelanggan,
  Pembelian,
  PembelianInput,
  Product,
  Reconciliation,
  ReturInput,
  ReturPenjualan,
  Role,
  ShiftBukaInput,
  ShiftInfo,
  ShiftMutasiInput,
  ShiftRiwayat,
  Supplier,
  TransferKas,
  TransferKasInput,
  TransaksiRiwayat,
  User,
} from "@/lib/api/types";
import { formatNilaiIndikator } from "@/lib/format";

const produkSeed: Product[] = [
  { id: "p1", sku: "BRS-5KG", barcode: "8991000010015", nama: "Beras 5 kg", satuan: "sak", kategori: "Sembako", hargaBeli: 60000, hargaJual: 75000, stok: 12, stokMinimum: 5, status: "aktif" },
  { id: "p2", sku: "MNY-1L", barcode: "8991000010022", nama: "Minyak 1 L", satuan: "pcs", kategori: "Sembako", hargaBeli: 14000, hargaJual: 18000, stok: 40, stokMinimum: 10, status: "aktif" },
  { id: "p3", sku: "GLA-1KG", barcode: "8991000010039", nama: "Gula 1 kg", satuan: "pcs", kategori: "Sembako", hargaBeli: 13500, hargaJual: 17000, stok: 25, stokMinimum: 8, status: "aktif" },
  { id: "p4", sku: "TLR-1KG", barcode: "8991000010046", nama: "Telur 1 kg", satuan: "kg", kategori: "Sembako", hargaBeli: 22000, hargaJual: 28000, stok: 18, stokMinimum: 6, status: "aktif" },
  { id: "p5", sku: "KCP-600", barcode: "8991000010053", nama: "Kecap 600 ml", satuan: "pcs", kategori: "Bumbu", hargaBeli: 11000, hargaJual: 15000, stok: 30, stokMinimum: 10, status: "aktif" },
  { id: "p6", sku: "PKG-A", barcode: "8991000010060", nama: "Sembako Paket A", satuan: "pak", kategori: "Paket", hargaBeli: 118000, hargaJual: 150000, stok: 6, stokMinimum: 3, status: "aktif" },
  { id: "p7", sku: "TER-200", barcode: "8991000010077", nama: "Tepung 200 g", satuan: "pcs", kategori: "Sembako", hargaBeli: 5000, hargaJual: 7000, stok: 50, stokMinimum: 12, status: "aktif" },
  { id: "p8", sku: "KBK-1KG", barcode: "8991000010084", nama: "Kopi Bubuk 1 kg", satuan: "pcs", kategori: "Minuman", hargaBeli: 32000, hargaJual: 42000, stok: 4, stokMinimum: 6, status: "aktif" },
  { id: "p9", sku: "SUN-BRG", barcode: "8991000010091", nama: "Sabun Batiul", satuan: "pcs", kategori: "Kebersihan", hargaBeli: 4000, hargaJual: 5500, stok: 60, stokMinimum: 20, status: "aktif" },
  { id: "p10", sku: "DTR-BLK", barcode: "8991000010107", nama: "Deterjen 800 g", satuan: "pcs", kategori: "Kebersihan", hargaBeli: 9500, hargaJual: 12500, stok: 22, stokMinimum: 10, status: "aktif" },
];

const DAFTAR_AKUN = [
  "Kas",
  "Bank",
  "Penampung gateway",
  "Piutang usaha",
  "Persediaan",
  "Hutang usaha",
  "Modal",
  "Penjualan",
  "Retur penjualan",
  "Pajak keluaran",
  "HPP",
  "Biaya operasional",
  "Selisih stok",
];

// Kode akun mengikuti default `.env.example` (chart SAK EMKM), supaya input
// kode akun di halaman laporan berperilaku sama dengan mode live.
const KODE_AKUN: Record<string, string> = {
  Kas: "1121",
  Bank: "1111",
  "Penampung gateway": "1112",
  "Piutang usaha": "1200",
  Persediaan: "1300",
  "Hutang usaha": "2101",
  "Pajak keluaran": "2402",
  Modal: "3100",
  Penjualan: "4000",
  "Retur penjualan": "4100",
  HPP: "5000",
  "Selisih stok": "5900",
  "Biaya operasional": "6900",
};

const KAS_TUNAI_AWAL = 1_500_000;
const KAS_BANK_AWAL = 3_000_000;
const NILAI_PERSEDIAAN_AWAL = produkSeed.reduce((s, p) => s + p.stok * p.hargaBeli, 0);

let jurnalCounter = 0;
let pembelianCounter = 0;
let biayaCounter = 0;
let returCounter = 0;
let transferCounter = 0;

function waktuSekarang(): string {
  return new Date().toISOString();
}

function buatJurnal(keterangan: string, ref: string, baris: JurnalBaris[]): JurnalEntry {
  jurnalCounter += 1;
  return {
    id: `JE-${String(jurnalCounter).padStart(4, "0")}`,
    waktu: waktuSekarang(),
    keterangan,
    ref,
    baris,
  };
}

function kasTunaiSistem(shift: ShiftInfo): number {
  return shift.saldoAwal + shift.kasMasuk - shift.kasKeluar + shift.penjualanTunai;
}

function umurFaktur(
  asOf: Date,
  tanggal: string,
): Pick<AgedInvoice, "daysOverdue" | "bucket"> {
  const selisih = Math.floor(
    (asOf.getTime() - new Date(tanggal).getTime()) / (24 * 60 * 60 * 1000),
  );
  const hari = Math.max(0, selisih);
  const bucket: AgedInvoice["bucket"] =
    hari === 0 ? "CURRENT" : hari <= 30 ? "DAYS_30" : hari <= 60 ? "DAYS_60" : hari <= 90 ? "DAYS_90" : "OVER_90";
  return { daysOverdue: hari, bucket };
}

export const mockDb = {
  products: [...produkSeed] as Product[],
  retur: [] as ReturPenjualan[],
  pelanggan: [] as Pelanggan[],
  suppliers: [
    {
      id: "sup-1",
      businessId: "toko-utama",
      code: "SUP-001",
      name: "Toko Grosir Sembako",
      address: "Pasar Induk Kedaung",
      phone: "0812-1000-0001",
      email: null,
      taxNumber: null,
      isActive: true,
    },
  ] as Supplier[],
  fiscalPeriods: [] as FiscalPeriod[],
  approvalRules: [] as ApprovalRule[],
  users: [
    { id: "u1", nama: "Pemilik Toko", username: "pemilik", password: "pemilik123", role: "pemilik" as const },
    { id: "u2", nama: "Kasir 1", username: "kasir", password: "kasir123", role: "kasir" as const },
  ] as Array<User & { password: string }>,
  sesi: null as LoginResult | null,
  auditLog: [] as Array<{ id: string; waktu: string; user: string; aksi: string; detail: string }>,
  login(username: string, password: string): LoginResult {
    const user = this.users.find((u) => u.username === username && u.password === password);
    if (!user) throw new Error("Username atau password salah.");
    const sesi: LoginResult = {
      user: { id: user.id, nama: user.nama, username: user.username, role: user.role as Role },
      accessToken: `mock-at-${user.id}-${Date.now()}`,
      refreshToken: `mock-rt-${user.id}-${Date.now()}`,
      kedaluwarsa: Date.now() + 15 * 60 * 1000,
    };
    this.sesi = sesi;
    this.audit(sesi.user, "login", `Masuk sebagai ${sesi.user.role}`);
    return structuredClone(sesi);
  },
  logout(user?: User): void {
    if (user) this.audit(user, "logout", "Keluar sesi");
    this.sesi = null;
  },
  audit(user: User, aksi: string, detail: string): void {
    this.auditLog.push({
      id: `AUD-${String(this.auditLog.length + 1).padStart(4, "0")}`,
      waktu: waktuSekarang(),
      user: `${user.nama} (${user.username})`,
      aksi,
      detail,
    });
  },
  buatUser(input: { nama: string; username: string; password: string; role: Role }, actor: User): User {
    if (actor.role !== "pemilik") throw new Error("Hanya pemilik yang boleh menambah pengguna.");
    const nama = input.nama.trim();
    const username = input.username.trim().toLowerCase();
    if (!nama || !username) throw new Error("Nama dan username wajib diisi.");
    if (input.password.length < 6) throw new Error("Password minimal 6 karakter.");
    if (this.users.some((u) => u.username.toLowerCase() === username)) {
      throw new Error("Username sudah dipakai.");
    }
    const baru = {
      id: `u${Date.now().toString(36)}`,
      nama,
      username,
      password: input.password,
      role: input.role,
    };
    this.users.push(baru);
    this.audit(actor, "buat-user", `Tambah pengguna ${nama} (${input.role})`);
    return { id: baru.id, nama: baru.nama, username: baru.username, role: baru.role };
  },
  ubahUser(id: string, input: { password?: string; role?: Role }, actor: User): User {
    if (actor.role !== "pemilik") throw new Error("Hanya pemilik yang boleh mengubah pengguna.");
    const target = this.users.find((u) => u.id === id);
    if (!target) throw new Error("Pengguna tidak ditemukan.");
    if (input.password !== undefined && input.password.length < 6) {
      throw new Error("Password minimal 6 karakter.");
    }
    if (input.role && input.role !== target.role && target.role === "pemilik") {
      const pemilikLain = this.users.some((u) => u.id !== id && u.role === "pemilik");
      if (!pemilikLain) throw new Error("Minimal harus ada satu pemilik.");
    }
    if (input.password !== undefined) target.password = input.password;
    if (input.role !== undefined) target.role = input.role;
    this.audit(actor, "ubah-user", `Ubah pengguna ${target.nama} (${target.username})`);
    return { id: target.id, nama: target.nama, username: target.username, role: target.role };
  },
  hapusUser(id: string, actor: User): void {
    if (actor.role !== "pemilik") throw new Error("Hanya pemilik yang boleh menghapus pengguna.");
    if (id === actor.id) throw new Error("Tidak bisa menghapus akun sendiri.");
    const target = this.users.find((u) => u.id === id);
    if (!target) throw new Error("Pengguna tidak ditemukan.");
    if (target.role === "pemilik" && this.users.filter((u) => u.role === "pemilik").length <= 1) {
      throw new Error("Minimal harus ada satu pemilik.");
    }
    this.users = this.users.filter((u) => u.id !== id);
    this.audit(actor, "hapus-user", `Hapus pengguna ${target.nama} (${target.username})`);
  },
  shiftAktif: null as ShiftInfo | null,
  shiftRiwayat: [] as ShiftRiwayat[],
  transaksi: [] as TransaksiRiwayat[],
  pembelian: [] as Pembelian[],
  biaya: [] as Biaya[],
  transferKasRiwayat: [] as TransferKas[],
  jurnal: [
    buatJurnal("Modal awal usaha", "OPEN-001", [
      { akun: "Kas", debit: KAS_TUNAI_AWAL, kredit: 0 },
      { akun: "Bank", debit: KAS_BANK_AWAL, kredit: 0 },
      { akun: "Persediaan", debit: NILAI_PERSEDIAAN_AWAL, kredit: 0 },
      { akun: "Modal", debit: 0, kredit: KAS_TUNAI_AWAL + KAS_BANK_AWAL + NILAI_PERSEDIAAN_AWAL },
    ]),
  ] as JurnalEntry[],
  kas: { tunai: KAS_TUNAI_AWAL, bank: KAS_BANK_AWAL },

  sinkronKasDariJurnal(): void {
    let tunai = 0;
    let bank = 0;
    for (const j of this.jurnal) {
      for (const b of j.baris) {
        if (b.akun === "Kas") tunai += b.debit - b.kredit;
        if (b.akun === "Bank") bank += b.debit - b.kredit;
      }
    }
    this.kas = { tunai, bank };
  },

  imporProduk(rows: ImporProdukBaris[], user: User): HasilImpor {
    if (user.role !== "pemilik") throw new Error("Hanya pemilik yang boleh mengimpor produk.");
    const hasil: HasilImpor = { sukses: 0, gagal: 0, pesan: [] };
    const skuDipakai = new Set(this.products.map((p) => p.sku.toLowerCase()));
    const barcodeDipakai = new Set(this.products.filter((p) => p.barcode).map((p) => p.barcode));
    const skuDalamBerkas = new Set<string>();
    const barcodeDalamBerkas = new Set<string>();

    rows.forEach((r, idx) => {
      const baris = `Baris ${idx + 2}`;
      if (!r.sku.trim()) {
        hasil.gagal += 1;
        hasil.pesan.push(`${baris}: SKU wajib diisi.`);
        return;
      }
      if (!r.nama.trim()) {
        hasil.gagal += 1;
        hasil.pesan.push(`${baris}: Nama wajib diisi.`);
        return;
      }
      if (!Number.isFinite(r.hargaJual) || r.hargaJual <= 0) {
        hasil.gagal += 1;
        hasil.pesan.push(`${baris}: hargaJual harus angka > 0.`);
        return;
      }
      if (skuDipakai.has(r.sku.trim().toLowerCase()) || skuDalamBerkas.has(r.sku.trim().toLowerCase())) {
        hasil.gagal += 1;
        hasil.pesan.push(`${baris}: SKU "${r.sku}" duplikat.`);
        return;
      }
      if (r.barcode.trim() && (barcodeDipakai.has(r.barcode.trim()) || barcodeDalamBerkas.has(r.barcode.trim()))) {
        hasil.gagal += 1;
        hasil.pesan.push(`${baris}: barcode "${r.barcode}" duplikat.`);
        return;
      }
      skuDalamBerkas.add(r.sku.trim().toLowerCase());
      if (r.barcode.trim()) barcodeDalamBerkas.add(r.barcode.trim());
      this.products.push({
        id: produkBaruId(),
        sku: r.sku.trim(),
        nama: r.nama.trim(),
        barcode: r.barcode.trim(),
        satuan: r.satuan.trim() || "pcs",
        kategori: r.kategori.trim() || "Umum",
        hargaBeli: Math.max(0, Math.round(r.hargaBeli || 0)),
        hargaJual: Math.round(r.hargaJual),
        stok: Math.max(0, Math.round(r.stok || 0)),
        stokMinimum: Math.max(0, Math.round(r.stokMinimum || 0)),
        status: "aktif",
      });
      hasil.sukses += 1;
    });

    if (hasil.sukses > 0) this.audit(user, "impor-produk", `${hasil.sukses} produk baru dari berkas (${hasil.gagal} baris ditolak)`);
    return hasil;
  },

  imporPelanggan(rows: ImporPelangganBaris[], user: User): HasilImpor {
    if (user.role !== "pemilik") throw new Error("Hanya pemilik yang boleh mengimpor pelanggan.");
    const hasil: HasilImpor = { sukses: 0, gagal: 0, pesan: [] };
    const namaDipakai = new Set(this.pelanggan.map((p) => p.nama.toLowerCase()));
    const namaDalamBerkas = new Set<string>();

    rows.forEach((r, idx) => {
      const baris = `Baris ${idx + 2}`;
      if (!r.nama.trim()) {
        hasil.gagal += 1;
        hasil.pesan.push(`${baris}: nama wajib diisi.`);
        return;
      }
      if (namaDipakai.has(r.nama.trim().toLowerCase()) || namaDalamBerkas.has(r.nama.trim().toLowerCase())) {
        hasil.gagal += 1;
        hasil.pesan.push(`${baris}: pelanggan "${r.nama}" sudah terdaftar.`);
        return;
      }
      namaDalamBerkas.add(r.nama.trim().toLowerCase());
      this.pelanggan.push({
        id: `plg-${Date.now().toString(36)}-${this.pelanggan.length}`,
        nama: r.nama.trim(),
        telepon: r.telepon.trim(),
        alamat: r.alamat.trim() || undefined,
        batasKredit: Number.isFinite(r.batasKredit) && r.batasKredit > 0 ? Math.round(r.batasKredit) : undefined,
      });
      hasil.sukses += 1;
    });

    if (hasil.sukses > 0) this.audit(user, "impor-pelanggan", `${hasil.sukses} pelanggan baru dari berkas (${hasil.gagal} baris ditolak)`);
    return hasil;
  },

  imporSaldoAwal(rows: ImporSaldoAwalBaris[], user: User): HasilImpor {
    if (user.role !== "pemilik") throw new Error("Hanya pemilik yang boleh mengimpor saldo awal.");
    const hasil: HasilImpor = { sukses: 0, gagal: 0, pesan: [] };
    const barisJurnal: JurnalBaris[] = [];

    rows.forEach((r, idx) => {
      const baris = `Baris ${idx + 2}`;
      const nama = r.akun.trim();
      const cocok = DAFTAR_AKUN.find((a) => a.toLowerCase() === nama.toLowerCase());
      if (!cocok) {
        hasil.gagal += 1;
        hasil.pesan.push(`${baris}: akun "${r.akun}" tidak dikenal — gunakan nama akun dari daftar.`);
        return;
      }
      if (!Number.isFinite(r.debit) || !Number.isFinite(r.kredit)) {
        hasil.gagal += 1;
        hasil.pesan.push(`${baris}: debit/kredit harus angka.`);
        return;
      }
      if (r.debit > 0 && r.kredit > 0) {
        hasil.gagal += 1;
        hasil.pesan.push(`${baris}: isi salah satu saja (debit ATAU kredit).`);
        return;
      }
      if (r.debit === 0 && r.kredit === 0) return;
      barisJurnal.push({ akun: cocok, debit: Math.round(r.debit), kredit: Math.round(r.kredit) });
      hasil.sukses += 1;
    });

    if (barisJurnal.length === 0) {
      hasil.pesan.push("Tidak ada baris valid untuk disimpan.");
      return hasil;
    }

    const totalDebit = barisJurnal.reduce((s, b) => s + b.debit, 0);
    const totalKredit = barisJurnal.reduce((s, b) => s + b.kredit, 0);
    if (totalDebit !== totalKredit) {
      hasil.gagal += 1;
      hasil.pesan.push(`Jurnal tidak seimbang: debit ${totalDebit.toLocaleString("id-ID")} ≠ kredit ${totalKredit.toLocaleString("id-ID")}.`);
      return hasil;
    }

    // Ganti saldo pembuka lama (ref OPEN-*) dengan migrasi terbaru
    this.jurnal = this.jurnal.filter((j) => !j.ref.startsWith("OPEN-"));
    this.jurnal.unshift(
      buatJurnal("Saldo awal (migrasi)", "OPEN-MIG", barisJurnal),
    );
    this.sinkronKasDariJurnal();
    this.audit(user, "impor-saldo-awal", `Neraca pembuka diganti: ${barisJurnal.length} baris, total ${totalDebit.toLocaleString("id-ID")}`);
    return hasil;
  },

  daftarPelanggan(): Pelanggan[] {
    return structuredClone(this.pelanggan);
  },

  /**
   * Master pemasok mode mock.
   *
   * Tanpa daftar ini dropdown pemasok di form pembelian kosong — dan karena
   * faktur wajib menunjuk master, pembelian jadi tidak bisa dibuat sama
   * sekali di mode mock.
   */
  buatSupplier(input: CreateSupplierRequest): Supplier {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code) throw new Error("Kode pemasok wajib diisi.");
    if (!name) throw new Error("Nama pemasok wajib diisi.");
    if (this.suppliers.some((s) => s.code.toLowerCase() === code.toLowerCase())) {
      throw new Error(`Kode pemasok ${code} sudah dipakai.`);
    }
    const supplier: Supplier = {
      id: `sup-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`,
      businessId: "toko-utama",
      code,
      name,
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      taxNumber: input.taxNumber?.trim() || null,
      isActive: true,
    };
    this.suppliers.push(supplier);
    return structuredClone(supplier);
  },

  nonaktifkanSupplier(id: string): Supplier {
    const target = this.suppliers.find((s) => s.id === id);
    if (!target) throw new Error("Pemasok tidak ditemukan.");
    target.isActive = false;
    return structuredClone(target);
  },

  /**
   * Periode fiskal mode mock.
   *
   * Disimpan in-memory seperti data mock lain — tanpa ini, daftar periode
   * selalu kosong dan tombol "Buat periode" seolah tidak berefek.
   */
  daftarPeriodeFiskal(): FiscalPeriod[] {
    return structuredClone(this.fiscalPeriods);
  },

  buatPeriodeFiskal(input: CreateFiscalPeriodRequest): FiscalPeriod {
    if (!input.name.trim()) throw new Error("Nama periode wajib diisi.");
    if (!input.startDate || !input.endDate) throw new Error("Tanggal mulai dan selesai wajib diisi.");
    if (input.endDate < input.startDate) throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
    const bertumpuk = this.fiscalPeriods.some(
      (p) => input.startDate <= p.endDate && input.endDate >= p.startDate,
    );
    if (bertumpuk) throw new Error("Rentang tanggal bertumpuk dengan periode lain.");

    const periode: FiscalPeriod = {
      id: crypto.randomUUID(),
      businessId: "toko-utama",
      name: input.name.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status ?? "OPEN",
      version: 1,
    };
    this.fiscalPeriods.push(periode);
    return structuredClone(periode);
  },

  ubahStatusPeriodeFiskal(id: string, status: FiscalPeriod["status"]): FiscalPeriod {
    const periode = this.fiscalPeriods.find((p) => p.id === id);
    if (!periode) throw new Error("Periode fiskal tidak ditemukan.");
    periode.status = status;
    periode.version += 1;
    return structuredClone(periode);
  },

  periodeFiskalMenungguTutup(): FiscalPeriod[] {
    const sekarang = new Date();
    const hariIni = `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, "0")}-${String(sekarang.getDate()).padStart(2, "0")}`;
    return structuredClone(
      this.fiscalPeriods.filter((p) => p.status === "OPEN" && p.endDate < hariIni),
    );
  },

  daftarAturanApproval(): ApprovalRule[] {
    return structuredClone(this.approvalRules);
  },

  buatAturanApproval(input: CreateApprovalRuleRequest): ApprovalRule {
    if (!input.transactionType.trim()) throw new Error("Jenis transaksi wajib diisi.");
    if (input.minimumAmount < 0) throw new Error("Ambang batas tidak boleh negatif.");
    const sekarang = waktuSekarang();
    const aturan: ApprovalRule = {
      id: crypto.randomUUID(),
      businessId: "toko-utama",
      name: input.name?.trim() || null,
      transactionType: input.transactionType.trim(),
      minimumAmount: input.minimumAmount,
      requiredLevel: input.requiredLevel,
      resolutionMode: input.resolutionMode ?? "HIGHEST_LEVEL",
      isActive: true,
      version: 1,
      createdAt: sekarang,
      updatedAt: sekarang,
    };
    this.approvalRules.push(aturan);
    return structuredClone(aturan);
  },

  nonaktifkanAturanApproval(id: string): ApprovalRule {
    const aturan = this.approvalRules.find((a) => a.id === id);
    if (!aturan) throw new Error("Aturan approval tidak ditemukan.");
    aturan.isActive = false;
    aturan.version += 1;
    aturan.updatedAt = waktuSekarang();
    return structuredClone(aturan);
  },

  /**
   * Umur piutang/hutang mode mock.
   *
   * Dihitung dari transaksi/pembelian yang masih bersisa, bukan dari angka
   * karangan — supaya KPI umur di halaman Keuangan cocok dengan daftar
   * fakturnya. Mock tidak menyimpan tanggal jatuh tempo, jadi tanggal faktur
   * dipakai sebagai patokan umur.
   */
  laporanAging(side: "RECEIVABLE" | "PAYABLE", asOfDate?: string): AgingReport {
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    const invoices: AgedInvoice[] =
      side === "RECEIVABLE"
        ? this.transaksi
            .filter((t) => t.status !== "dibatalkan" && t.piutang > 0)
            .map((t) => ({
              invoiceId: t.nomor,
              invoiceNumber: t.nomor,
              counterpartyId: null,
              invoiceDate: t.waktu,
              dueDate: null,
              invoiceTotal: t.total,
              allocatedTotal: t.total - t.piutang,
              outstandingAmount: t.piutang,
              ...umurFaktur(asOf, t.waktu),
            }))
        : this.pembelian
            .filter((p) => p.terbayar < p.total)
            .map((p) => {
              const sisa = p.total - p.terbayar;
              return {
                invoiceId: p.id,
                invoiceNumber: p.nomor,
                counterpartyId: p.supplierId ?? null,
                invoiceDate: p.waktu,
                dueDate: null,
                invoiceTotal: p.total,
                allocatedTotal: p.terbayar,
                outstandingAmount: sisa,
                ...umurFaktur(asOf, p.waktu),
              };
            });

    const total = (pilih: (i: AgedInvoice) => boolean) =>
      invoices.filter(pilih).reduce((s, i) => s + i.outstandingAmount, 0);

    return {
      side,
      asOfDate: asOf.toISOString(),
      outstandingTotal: total(() => true),
      current: total((i) => i.bucket === "CURRENT"),
      days30: total((i) => i.bucket === "DAYS_30"),
      days60: total((i) => i.bucket === "DAYS_60"),
      days90: total((i) => i.bucket === "DAYS_90"),
      over90: total((i) => i.bucket === "OVER_90"),
      invoices: structuredClone(invoices),
    };
  },

  rekonsiliasi(
    side: "RECEIVABLE" | "PAYABLE",
    accountCode: string,
    asOfDate?: string,
  ): Reconciliation {
    const laporan = this.laporanAging(side, asOfDate);
    const namaAkun = side === "RECEIVABLE" ? "Piutang usaha" : "Hutang usaha";
    const saldoAkun = this.akunSaldos().find((a) => a.akun === namaAkun)?.saldoAkhir ?? 0;
    // Piutang bersaldo normal debit, hutang bersaldo normal kredit. Saldo akun
    // mock disimpan sebagai debit - kredit, jadi sisi hutang dibalik agar bisa
    // dibandingkan dengan total outstanding.
    const ledgerBalance = side === "RECEIVABLE" ? saldoAkun : -saldoAkun;
    const difference = Math.round((laporan.outstandingTotal - ledgerBalance) * 100) / 100;

    return {
      side,
      accountCode,
      invoiceCount: laporan.invoices.length,
      invoicedTotal: laporan.invoices.reduce((s, i) => s + i.invoiceTotal, 0),
      allocatedTotal: laporan.invoices.reduce((s, i) => s + i.allocatedTotal, 0),
      outstandingTotal: laporan.outstandingTotal,
      ledgerBalance,
      difference,
      isReconciled: Math.abs(difference) < 0.01,
    };
  },

  /**
   * Gerakan harian satu akun, diturunkan dari jurnal mock.
   *
   * Mock menyimpan jurnal lengkap, jadi laporan ini tidak perlu angka karangan:
   * saldo awal dihitung dari jurnal sebelum tanggal yang dipilih, lalu setiap
   * baris pada hari itu dijalankan berurutan.
   */
  gerakanHarian(tanggal: string, accountCode: string): DailyMovementReport {
    const akun = this.akunSaldos().find(
      (a) => a.kode === accountCode || a.akun === accountCode,
    );
    const awal = new Date(`${(tanggal || waktuSekarang()).slice(0, 10)}T00:00:00`);
    const akhir = new Date(awal.getTime() + 24 * 60 * 60 * 1000);

    const baris = this.jurnal
      .slice()
      .reverse()
      .flatMap((j) =>
        j.baris
          .filter((b) => b.akun === akun?.akun)
          .map((b) => ({ j, b, waktu: new Date(j.waktu) })),
      );

    let saldo = baris
      .filter((x) => x.waktu < awal)
      .reduce((s, x) => s + x.b.debit - x.b.kredit, 0);
    const openingBalance = saldo;

    const entries: DailyMovementEntry[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const x of baris) {
      if (x.waktu < awal) continue;
      if (x.waktu >= akhir) break;
      saldo += x.b.debit - x.b.kredit;
      totalDebit += x.b.debit;
      totalCredit += x.b.kredit;
      entries.push({
        journalId: x.j.id,
        entryDate: x.j.waktu,
        transactionType: null,
        transactionDescription: x.j.keterangan,
        referenceType: null,
        referenceId: x.j.ref,
        reversalOfJournalId: null,
        lineDescription: x.j.keterangan,
        debit: x.b.debit,
        credit: x.b.kredit,
        runningBalance: saldo,
      });
    }

    return {
      date: `${awal.getFullYear()}-${String(awal.getMonth() + 1).padStart(2, "0")}-${String(awal.getDate()).padStart(2, "0")}`,
      accountCode,
      accountName: akun?.nama ?? "-",
      openingBalance,
      entries,
      closingBalance: saldo,
      totalDebit,
      totalCredit,
    };
  },

  bukaShift(input: ShiftBukaInput): ShiftInfo {
    if (this.shiftAktif) throw new Error("Masih ada shift aktif. Tutup dulu.");
    const d = new Date();
    const tanggal = d.toISOString().slice(0, 10).replaceAll("-", "");
    const sesi = d.getHours() < 15 ? "AM" : "PM";
    this.shiftAktif = {
      id: `SH-${tanggal}-${sesi}`,
      cashierUserId: input.cashierUserId ?? "",
      kasir: input.kasir,
      mulai: d.toISOString(),
      saldoAwal: input.saldoAwal,
      kasMasuk: 0,
      kasKeluar: 0,
      penjualanTunai: 0,
      kasTunaiSistem: input.saldoAwal,
    };
    return structuredClone(this.shiftAktif);
  },

  mutasiKas(input: ShiftMutasiInput): ShiftInfo {
    const shift = this.shiftAktif;
    if (!shift) throw new Error("Shift belum dibuka.");
    if (input.jenis === "keluar" && input.nominal > shift.saldoAwal + shift.kasMasuk + shift.penjualanTunai) {
      throw new Error("Saldo kas tidak cukup untuk pengeluaran ini.");
    }
    if (input.jenis === "masuk") shift.kasMasuk += input.nominal;
    else shift.kasKeluar += input.nominal;
    shift.kasTunaiSistem = kasTunaiSistem(shift);
    return structuredClone(shift);
  },

  catatPenjualanTunai(nominal: number): void {
    const shift = this.shiftAktif;
    if (!shift) throw new Error("Shift belum dibuka.");
    shift.penjualanTunai += nominal;
    shift.kasTunaiSistem = kasTunaiSistem(shift);
  },

  tutupShift(uangFisik: number): ShiftRiwayat {
    const shift = this.shiftAktif;
    if (!shift) throw new Error("Shift belum dibuka.");
    const sistem = kasTunaiSistem(shift);
    const riwayat: ShiftRiwayat = {
      ...structuredClone(shift),
      selesai: waktuSekarang(),
      uangFisik,
      selisih: uangFisik - sistem,
    };
    this.shiftRiwayat.unshift(riwayat);
    this.shiftAktif = null;
    return structuredClone(riwayat);
  },

  catatTransaksi(r: TransaksiRiwayat): void {
    this.transaksi.unshift(r);
  },

  kunciCheckout: new Set<string>(),
  piutangTerbayar: new Map<string, Array<{ metode: "tunai" | "transfer"; nominal: number }>>(),

  batalTransaksi(nomor: string, user: User): TransaksiRiwayat {
    if (user.role !== "pemilik") throw new Error("Hanya pemilik yang boleh membatalkan transaksi.");
    const t = this.transaksi.find((x) => x.nomor === nomor);
    if (!t) throw new Error("Transaksi tidak ditemukan.");
    if (t.status === "dibatalkan") throw new Error("Transaksi sudah dibatalkan sebelumnya.");

    const tunaiPortion = (t.pembayaran ?? []).find((b) => b.metode === "tunai")?.nominal ?? 0;
    const bankPortion = (t.pembayaran ?? []).find((b) => b.metode === "transfer")?.nominal ?? 0;
    const gatewayPortion = (t.pembayaran ?? []).find((b) => b.metode === "qris")?.nominal ?? 0;
    const tertagih = this.piutangTerbayar.get(t.nomor) ?? [];
    const tuneraiTagih = tertagih.filter((p) => p.metode === "tunai").reduce((s, p) => s + p.nominal, 0);
    const bankTagih = tertagih.filter((p) => p.metode === "transfer").reduce((s, p) => s + p.nominal, 0);

    if (t.shiftId === this.shiftAktif?.id) {
      this.shiftAktif.penjualanTunai = Math.max(0, this.shiftAktif.penjualanTunai - tunaiPortion - tuneraiTagih);
      this.shiftAktif.kasTunaiSistem = kasTunaiSistem(this.shiftAktif);
    }

    for (const item of t.items) {
      const p = this.products.find((x) => x.nama === item.nama);
      if (p) p.stok += item.qty;
    }

    const baris: JurnalBaris[] = [];
    baris.push({ akun: "Penjualan", debit: Math.max(0, t.total - t.pajak), kredit: 0 });
    if (t.pajak > 0) baris.push({ akun: "Pajak keluaran", debit: t.pajak, kredit: 0 });
    if (tunaiPortion > 0) baris.push({ akun: "Kas", debit: 0, kredit: tunaiPortion });
    if (bankPortion > 0) baris.push({ akun: "Bank", debit: 0, kredit: bankPortion });
    if (gatewayPortion > 0) baris.push({ akun: "Penampung gateway", debit: 0, kredit: gatewayPortion });
    if (tuneraiTagih > 0) baris.push({ akun: "Kas", debit: 0, kredit: tuneraiTagih });
    if (bankTagih > 0) baris.push({ akun: "Bank", debit: 0, kredit: bankTagih });
    if (t.piutang > 0) baris.push({ akun: "Piutang usaha", debit: 0, kredit: t.piutang });
    const hpp = t.items.reduce((s, i) => {
      const p = this.products.find((x) => x.nama === i.nama);
      const beli = i.hargaBeli ?? (p ? p.hargaBeli : 0);
      return s + beli * i.qty;
    }, 0);
    if (hpp > 0) {
      baris.push({ akun: "Persediaan", debit: hpp, kredit: 0 });
      baris.push({ akun: "HPP", debit: 0, kredit: hpp });
    }
    this.jurnal.unshift(buatJurnal(`Pembatalan transaksi ${t.nomor}`, `VOID-${t.nomor}`, baris));

    this.kas.tunai = Math.max(0, this.kas.tunai - tunaiPortion - tuneraiTagih);
    this.kas.bank = Math.max(0, this.kas.bank - bankPortion - bankTagih);
    this.piutangTerbayar.delete(t.nomor);

    t.status = "dibatalkan";
    t.piutang = 0;
    this.audit(user, "void", `Batalkan transaksi ${t.nomor} (Rp${t.total.toLocaleString("id-ID")})`);
    return structuredClone(t);
  },

  penyesuaianStok(input: { productId: string; stokFisik: number; alasan: string }, user: User): Product {
    if (user.role !== "pemilik") throw new Error("Hanya pemilik yang boleh menyesuaikan stok.");
    const p = this.products.find((x) => x.id === input.productId);
    if (!p) throw new Error("Produk tidak ditemukan.");
    if (input.stokFisik < 0) throw new Error("Stok fisik tidak boleh negatif.");
    const lama = p.stok;
    const selisih = input.stokFisik - lama;
    if (selisih === 0) throw new Error("Stok fisik sama dengan stok sistem — tidak ada penyesuaian.");

    const nilai = Math.abs(selisih) * p.hargaBeli;
    const baris: JurnalBaris[] =
      selisih > 0
        ? [{ akun: "Persediaan", debit: nilai, kredit: 0 }, { akun: "Selisih stok", debit: 0, kredit: nilai }]
        : [{ akun: "Selisih stok", debit: nilai, kredit: 0 }, { akun: "Persediaan", debit: 0, kredit: nilai }];
    this.jurnal.unshift(buatJurnal(`Penyesuaian stok ${p.nama}`, `ADJ-${p.sku}`, baris));

    p.stok = input.stokFisik;
    this.audit(user, "penyesuaian_stok", `${p.nama}: ${lama} → ${input.stokFisik} (${input.alasan || "tanpa alasan"})`);
    return structuredClone(p);
  },

  riwayatTransaksi(): TransaksiRiwayat[] {
    return structuredClone(this.transaksi);
  },

  jurnalPenjualan(
    payload: { shiftId: string; items: Array<{ nama: string; qty: number; hargaBeli: number }> },
    portions: { tunai: number; bank: number; gateway: number; piutang: number },
    total: number,
    pajak: number,
  ): void {
    const baris: JurnalBaris[] = [];
    if (portions.tunai > 0) baris.push({ akun: "Kas", debit: portions.tunai, kredit: 0 });
    if (portions.bank > 0) baris.push({ akun: "Bank", debit: portions.bank, kredit: 0 });
    if (portions.gateway > 0) baris.push({ akun: "Penampung gateway", debit: portions.gateway, kredit: 0 });
    if (portions.piutang > 0) baris.push({ akun: "Piutang usaha", debit: portions.piutang, kredit: 0 });
    baris.push({ akun: "Penjualan", debit: 0, kredit: total - pajak });
    if (pajak > 0) baris.push({ akun: "Pajak keluaran", debit: 0, kredit: pajak });

    const hpp = payload.items.reduce((s, i) => s + i.qty * i.hargaBeli, 0);
    if (hpp > 0) {
      baris.push({ akun: "HPP", debit: hpp, kredit: 0 });
      baris.push({ akun: "Persediaan", kredit: hpp, debit: 0 });
    }
    this.kas.tunai += portions.tunai;
    this.kas.bank += portions.bank;
    this.jurnal.unshift(
      buatJurnal(`Penjualan kasir (shift ${payload.shiftId})`, "penjualan", baris),
    );
  },

  konfirmasiDigital(nomor: string, user: User): TransaksiRiwayat {
    if (user.role !== "pemilik") throw new Error("Hanya pemilik yang boleh mengonfirmasi pembayaran digital.");
    const t = this.transaksi.find((x) => x.nomor === nomor);
    if (!t) throw new Error("Transaksi tidak ditemukan.");
    if (t.status !== "menunggu_pembayaran") throw new Error("Transaksi ini tidak menunggu konfirmasi pembayaran.");
    const nominal = (t.pembayaran ?? []).find((b) => b.metode === "qris")?.nominal ?? 0;
    this.kas.bank += nominal;
    this.jurnal.unshift(
      buatJurnal(`Konfirmasi pembayaran QRIS ${t.nomor}`, t.nomor, [
        { akun: "Bank", debit: nominal, kredit: 0 },
        { akun: "Penampung gateway", debit: 0, kredit: nominal },
      ]),
    );
    t.status = "lunas";
    this.audit(user, "konfirmasi_qris", `QRIS ${t.nomor} diterima (Rp${nominal.toLocaleString("id-ID")})`);
    return structuredClone(t);
  },

  prosesRetur(input: ReturInput, user: User): ReturPenjualan {
    if (user.role !== "pemilik") throw new Error("Hanya pemilik yang boleh memproses retur.");
    const t = this.transaksi.find((x) => x.nomor === input.referensi);
    if (!t) throw new Error("Transaksi referensi tidak ditemukan.");
    if (t.status === "dibatalkan") throw new Error("Transaksi referensi sudah dibatalkan.");
    if (input.items.length === 0) throw new Error("Pilih minimal satu item untuk diretur.");

    let grossReturn = 0;
    let netReturn = 0;
    const items: ReturPenjualan["items"] = [];
    for (const r of input.items) {
      const asli = t.items.find((i) => i.nama === r.nama);
      if (!asli) throw new Error(`Item ${r.nama} tidak ada di transaksi ${t.nomor}.`);
      if (r.qty <= 0 || r.qty > asli.qty) throw new Error(`Qty retur ${r.nama} harus 1–${asli.qty}.`);
      const p = this.products.find((x) => x.nama === r.nama);
      if (p) p.stok += r.qty;
      items.push({ nama: r.nama, qty: r.qty, hargaJual: asli.hargaJual });
      grossReturn += asli.hargaJual * r.qty;
      netReturn += asli.hargaJual * r.qty - asli.diskon;
    }

    const grossAsli = t.items.reduce((s, i) => s + i.hargaJual * i.qty, 0);
    const netAsli = Math.max(0, t.total - t.pajak);
    const share = grossAsli > 0 ? grossReturn / grossAsli : 0; // proporsi item yang diretur
    const netKembali = Math.round(share * netAsli);             // penjualan neto yang dibatalkan
    const pajakKembali = Math.round(share * t.pajak);           // pajak keluaran yang dibatalkan
    const refund = netKembali + pajakKembali;                   // uang yang dikembalikan ke pelanggan

    const sumber = input.metodeRefund === "tunai" ? "Kas" : "Bank";
    if (input.metodeRefund === "tunai" && refund > this.kas.tunai) {
      throw new Error("Saldo kas tunai tidak cukup untuk refund.");
    }
    if (input.metodeRefund === "transfer" && refund > this.kas.bank) {
      throw new Error("Saldo bank tidak cukup untuk refund.");
    }

    returCounter += 1;
    const retur: ReturPenjualan = {
      id: `RT-${String(returCounter).padStart(4, "0")}`,
      nomor: `RTN-${String(returCounter).padStart(6, "0")}`,
      referensi: input.referensi,
      waktu: waktuSekarang(),
      items,
      total: refund,
      alasan: input.alasan,
      metodeRefund: input.metodeRefund,
    };
    this.retur.unshift(retur);

    this.kas[input.metodeRefund === "tunai" ? "tunai" : "bank"] -= refund;
    if (input.metodeRefund === "tunai" && this.shiftAktif?.id === t.shiftId) {
      this.shiftAktif.penjualanTunai = Math.max(0, this.shiftAktif.penjualanTunai - refund);
      this.shiftAktif.kasTunaiSistem = kasTunaiSistem(this.shiftAktif);
    }
    const hpp = items.reduce((s, i) => {
      const asli = t.items.find((x) => x.nama === i.nama);
      const p = this.products.find((x) => x.nama === i.nama);
      const beli = asli?.hargaBeli ?? (p ? p.hargaBeli : 0);
      return s + beli * i.qty;
    }, 0);
    const baris: JurnalBaris[] = [];
    if (netKembali > 0) baris.push({ akun: "Retur penjualan", debit: netKembali, kredit: 0 });
    if (pajakKembali > 0) baris.push({ akun: "Pajak keluaran", debit: pajakKembali, kredit: 0 });
    baris.push({ akun: sumber, debit: 0, kredit: refund });
    if (hpp > 0) {
      baris.push({ akun: "Persediaan", debit: hpp, kredit: 0 });
      baris.push({ akun: "HPP", debit: 0, kredit: hpp });
    }
    this.jurnal.unshift(buatJurnal(`Retur penjualan dari ${input.referensi}`, retur.nomor, baris));

    this.audit(user, "retur", `${retur.nomor} dari ${input.referensi} (Rp${refund.toLocaleString("id-ID")}) — ${input.alasan}`);
    return structuredClone(retur);
  },


  riwayatRetur(): ReturPenjualan[] {
    return structuredClone(this.retur);
  },

  registerPembelian(input: PembelianInput): Pembelian {
    const total = input.items.reduce((s, i) => s + i.qty * i.hargaBeli, 0);
    if (total <= 0) throw new Error("Total pembelian harus lebih besar dari nol.");
    if (input.metode === "tunai" && total > this.kas.tunai) throw new Error("Saldo kas tunai tidak cukup.");
    if (input.metode === "bank" && total > this.kas.bank) throw new Error("Saldo bank tidak cukup.");

    pembelianCounter += 1;
    const pembelian: Pembelian = {
      id: `PB-${String(pembelianCounter).padStart(4, "0")}`,
      nomor: `POB-${String(pembelianCounter).padStart(6, "0")}`,
      pemasok: input.pemasok,
      supplierId: input.supplierId,
      waktu: waktuSekarang(),
      items: input.items,
      total,
      metode: input.metode,
      terbayar: input.metode === "hutang" ? 0 : total,
    };
    this.pembelian.unshift(pembelian);

    for (const item of input.items) {
      const p = this.products.find((x) => x.id === item.productId);
      if (p) {
        p.stok += item.qty;
        p.hargaBeli = item.hargaBeli;
      }
    }

    const akunSumber = input.metode === "tunai" ? "Kas" : input.metode === "bank" ? "Bank" : "Hutang usaha";
    this.jurnal.unshift(
      buatJurnal(`Pembelian dari ${input.pemasok}`, pembelian.nomor, [
        { akun: "Persediaan", debit: total, kredit: 0 },
        { akun: akunSumber, debit: 0, kredit: total },
      ]),
    );
    if (input.metode === "tunai") this.kas.tunai -= total;
    if (input.metode === "bank") this.kas.bank -= total;

    return structuredClone(pembelian);
  },

  bayarHutang(pembelianId: string, nominal: number, metode: "tunai" | "transfer"): Pembelian {
    const p = this.pembelian.find((x) => x.id === pembelianId);
    if (!p) throw new Error("Faktur pembelian tidak ditemukan.");
    const sisa = p.total - p.terbayar;
    if (sisa <= 0) throw new Error("Faktur ini sudah lunas.");
    if (nominal > sisa) throw new Error(`Nominal melebihi sisa hutang (${sisa}).`);
    const sumber = metode === "tunai" ? "Kas" : "Bank";
    if (metode === "tunai" && nominal > this.kas.tunai) throw new Error("Saldo kas tunai tidak cukup.");
    if (metode === "transfer" && nominal > this.kas.bank) throw new Error("Saldo bank tidak cukup.");

    p.terbayar += nominal;
    this.kas[metode === "tunai" ? "tunai" : "bank"] -= nominal;
    this.jurnal.unshift(
      buatJurnal(`Pelunasan hutang ${p.nomor} kepada ${p.pemasok}`, p.nomor, [
        { akun: "Hutang usaha", debit: nominal, kredit: 0 },
        { akun: sumber, debit: 0, kredit: nominal },
      ]),
    );
    return structuredClone(p);
  },

  bayarPiutang(nomor: string, nominal: number, metode: "tunai" | "transfer"): TransaksiRiwayat {
    const t = this.transaksi.find((x) => x.nomor === nomor);
    if (!t) throw new Error("Transaksi tidak ditemukan.");
    if (t.piutang <= 0) throw new Error("Transaksi ini tidak memiliki piutang.");
    if (nominal > t.piutang) throw new Error(`Nominal melebihi sisa piutang (${t.piutang}).`);
    const sumber = metode === "tunai" ? "Kas" : "Bank";

    t.piutang -= nominal;
    t.status = t.piutang === 0 ? "lunas" : "dibayar_sebagian";
    this.kas[metode === "tunai" ? "tunai" : "bank"] += nominal;
    const tertagih = this.piutangTerbayar.get(t.nomor) ?? [];
    tertagih.push({ metode, nominal });
    this.piutangTerbayar.set(t.nomor, tertagih);
    if (metode === "tunai" && this.shiftAktif?.id === t.shiftId) {
      this.shiftAktif.penjualanTunai += nominal;
      this.shiftAktif.kasTunaiSistem = kasTunaiSistem(this.shiftAktif);
    }
    this.jurnal.unshift(
      buatJurnal(`Pembayaran piutang ${t.nomor}`, t.nomor, [
        { akun: sumber, debit: nominal, kredit: 0 },
        { akun: "Piutang usaha", debit: 0, kredit: nominal },
      ]),
    );
    return structuredClone(t);
  },

  catatBiaya(input: { kategori: string; nominal: number; metode: "tunai" | "transfer"; catatan?: string }): Biaya {
    if (input.kategori.trim() === "") throw new Error("Kategori biaya wajib diisi.");
    if (input.nominal <= 0) throw new Error("Nominal biaya harus lebih besar dari nol.");
    const sumber = input.metode === "tunai" ? "Kas" : "Bank";
    if (input.metode === "tunai" && input.nominal > this.kas.tunai) throw new Error("Saldo kas tunai tidak cukup.");
    if (input.metode === "transfer" && input.nominal > this.kas.bank) throw new Error("Saldo bank tidak cukup.");

    biayaCounter += 1;
    const biaya: Biaya = {
      id: `BY-${String(biayaCounter).padStart(4, "0")}`,
      waktu: waktuSekarang(),
      kategori: input.kategori,
      nominal: input.nominal,
      metode: input.metode,
      catatan: input.catatan,
    };
    this.biaya.unshift(biaya);
    this.kas[input.metode === "tunai" ? "tunai" : "bank"] -= input.nominal;
    this.jurnal.unshift(
      buatJurnal(`Biaya ${input.kategori}`, biaya.id, [
        { akun: "Biaya operasional", debit: input.nominal, kredit: 0 },
        { akun: sumber, debit: 0, kredit: input.nominal },
      ]),
    );
    return structuredClone(biaya);
  },

  cashAccounts(): CashAccount[] {
    return [
      {
        id: "cash-kas",
        nama: "Kas tunai",
        kode: KODE_AKUN.Kas,
        saldo: this.kas.tunai,
        bawaan: true,
        aktif: true,
      },
      {
        id: "cash-bank",
        nama: "Bank",
        kode: KODE_AKUN.Bank,
        saldo: this.kas.bank,
        bawaan: false,
        aktif: true,
      },
    ];
  },

  /**
   * Transfer antar akun kas: dua sisi kas bergerak, jurnal hanya memindahkan
   * saldo (tanpa akun pendapatan/biaya). Kalau shift aktif, perpindahan dari
   * kas tunai dicatat sebagai kas keluar shift supaya kas sistem tetap cocok.
   */
  catatTransferKas(input: TransferKasInput, user: User): TransferKas {
    if (user.role !== "pemilik") throw new Error("Hanya pemilik yang boleh memindahkan kas antar-rekening.");
    if (!Number.isFinite(input.nominal) || input.nominal <= 0) {
      throw new Error("Nominal transfer harus lebih besar dari nol.");
    }
    if (input.dariAkunId === input.keAkunId) {
      throw new Error("Rekening asal dan tujuan harus berbeda.");
    }

    const akun = this.cashAccounts();
    const asal = akun.find((a) => a.id === input.dariAkunId);
    const tujuan = akun.find((a) => a.id === input.keAkunId);
    if (!asal || !tujuan) throw new Error("Rekening kas tidak ditemukan.");
    if (!asal.aktif || !tujuan.aktif) throw new Error("Rekening kas tidak aktif.");
    if (input.nominal > asal.saldo) {
      throw new Error(`Saldo ${asal.nama} tidak cukup untuk transfer.`);
    }

    const namaAkun = (id: string) => (id === "cash-kas" ? "Kas" : "Bank");
    this.kas[asal.id === "cash-kas" ? "tunai" : "bank"] -= input.nominal;
    this.kas[tujuan.id === "cash-kas" ? "tunai" : "bank"] += input.nominal;

    if (this.shiftAktif) {
      if (asal.id === "cash-kas") this.shiftAktif.kasKeluar += input.nominal;
      if (tujuan.id === "cash-kas") this.shiftAktif.kasMasuk += input.nominal;
      this.shiftAktif.kasTunaiSistem = kasTunaiSistem(this.shiftAktif);
    }

    transferCounter += 1;
    const transfer: TransferKas = {
      id: `TRF-${String(transferCounter).padStart(4, "0")}`,
      waktu: waktuSekarang(),
      dariAkunId: asal.id,
      dariNama: asal.nama,
      keAkunId: tujuan.id,
      keNama: tujuan.nama,
      nominal: input.nominal,
      keterangan: input.keterangan?.trim() || undefined,
      menungguPersetujuan: false,
    };
    this.transferKasRiwayat.unshift(transfer);
    this.jurnal.unshift(
      buatJurnal(`Transfer kas ${asal.nama} → ${tujuan.nama}`, transfer.id, [
        { akun: namaAkun(tujuan.id), debit: input.nominal, kredit: 0 },
        { akun: namaAkun(asal.id), debit: 0, kredit: input.nominal },
      ]),
    );
    this.audit(
      user,
      "transfer-kas",
      `${transfer.id}: ${asal.nama} → ${tujuan.nama} Rp${input.nominal.toLocaleString("id-ID")}`,
    );
    return structuredClone(transfer);
  },

  akunSaldos(params: { from?: string; to?: string } = {}): Array<{
    akun: string;
    kode: string;
    nama: string;
    saldoAwal: number;
    debit: number;
    kredit: number;
    saldo: number;
    saldoAkhir: number;
  }> {
    const map = new Map<string, { awal: number; debit: number; kredit: number }>();
    for (const akun of DAFTAR_AKUN) map.set(akun, { awal: 0, debit: 0, kredit: 0 });
    const from = params.from ? new Date(params.from).getTime() : Number.NEGATIVE_INFINITY;
    // Tanggal akhir dipakai sampai akhir hari itu: jurnal pada jam 23:00 masih
    // bagian dari hari yang dipilih, bukan hari berikutnya.
    const to = params.to
      ? new Date(params.to).getTime() + 24 * 60 * 60 * 1000 - 1
      : Number.POSITIVE_INFINITY;
    for (const j of this.jurnal) {
      const waktu = new Date(j.waktu).getTime();
      for (const b of j.baris) {
        const cur = map.get(b.akun) ?? { awal: 0, debit: 0, kredit: 0 };
        if (waktu < from) cur.awal += b.debit - b.kredit;
        else if (waktu <= to) {
          cur.debit += b.debit;
          cur.kredit += b.kredit;
        }
        map.set(b.akun, cur);
      }
    }
    return DAFTAR_AKUN.map((akun) => {
      const { awal, debit, kredit } = map.get(akun)!;
      return {
        akun,
        kode: KODE_AKUN[akun] ?? "",
        nama: akun,
        saldoAwal: awal,
        debit,
        kredit,
        saldo: debit - kredit,
        saldoAkhir: awal + debit - kredit,
      };
    });
  },

  labaRugi(): { pendapatan: number; retur: number; hpp: number; biaya: number; pajak: number; laba: number } {
    const s = new Map(this.akunSaldos().map((a) => [a.akun, a]));
    const pendapatan = -(s.get("Penjualan")?.saldo ?? 0);
    const retur = s.get("Retur penjualan")?.saldo ?? 0;
    const hpp = s.get("HPP")?.saldo ?? 0;
    const biaya = s.get("Biaya operasional")?.saldo ?? 0;
    const pajak = -(s.get("Pajak keluaran")?.saldo ?? 0);
    return { pendapatan, retur, hpp, biaya, pajak, laba: pendapatan - retur - hpp - biaya - pajak };
  },

  /**
   * Ringkasan kesehatan usaha versi mock.
   *
   * Hanya tiga indikator yang bisa dihitung jujur dari akun mock: aset
   * lancar, liabilitas lancar, dan kas. Indikator profitabilitas dan
   * perputaran butuh periode 12 bulan seperti engine — di mode mock
   * lebih baik jujur soal batasnya daripada mengarang angka.
   */
  ringkasanKesehatan(tanggal: string): HealthSummary {
    const s = new Map(this.akunSaldos().map((a) => [a.akun, a.saldoAkhir]));
    const kas = s.get("Kas") ?? 0;
    const bank = s.get("Bank") ?? 0;
    const gateway = s.get("Penampung gateway") ?? 0;
    const piutang = s.get("Piutang usaha") ?? 0;
    const persediaan = s.get("Persediaan") ?? 0;
    const hutang = s.get("Hutang usaha") ?? 0;

    const asetLancar = kas + bank + gateway + piutang + persediaan;
    const liabilitasLancar = hutang;
    const kasBisa = kas + bank;

    const indikator: HealthIndicator[] = [];

    if (liabilitasLancar > 0) {
      const rasioLancar = asetLancar / liabilitasLancar;
      indikator.push({
        name: "Rasio Lancar",
        unit: "×",
        value: rasioLancar,
        displayValue: formatNilaiIndikator(rasioLancar, "×"),
        previousValue: null,
        trend: "TIDAK ADA PERBANDINGAN",
        rating: rasioLancar >= 1.5 ? "BAIK" : rasioLancar >= 1 ? "CUKUP" : "KURANG SEHAT",
        explanation:
          rasioLancar >= 1.5
            ? "Aset lancar menutup liabilitas lancar lebih dari 1,5 kali — ada ruang untuk menghadapi penurunan penjualan atau penundaan tagihan."
            : rasioLancar >= 1
              ? "Aset lancar masih menutup liabilitas lancar, tapi ruang amannya tipis."
              : "Liabilitas lancar lebih besar dari aset lancar — kewajiban jangka pendek bisa menekan kas.",
        benchmark: "Patokan praktis: 1,0× — titik impas; 1,5× — ruang aman untuk fluktuasi penjualan.",
      });

      const rasioKas = kasBisa / liabilitasLancar;
      indikator.push({
        name: "Rasio Kas",
        unit: "×",
        value: rasioKas,
        displayValue: formatNilaiIndikator(rasioKas, "×"),
        previousValue: null,
        trend: "TIDAK ADA PERBANDINGAN",
        rating: rasioKas >= 0.2 ? "BAIK" : rasioKas >= 0.1 ? "CUKUP" : "KURANG SEHAT",
        explanation:
          rasioKas >= 0.2
            ? "Kas menutup sedikitnya 20% liabilitas lancar — kewajiban jangka pendek bisa dibayar tanpa menyentuh aset lain."
            : rasioKas >= 0.1
              ? "Kas menutup sebagian liabilitas lancar, tapi belum ada ruang aman yang nyaman."
              : "Kas hampir tidak menutup liabilitas lancar — rupiah yang masuk sebaiknya ditahan untuk kewajiban jangka pendek.",
        benchmark: "Patokan praktis: 0,2× — kas menutup seperlima liabilitas lancar.",
      });
    } else {
      indikator.push({
        name: "Rasio Lancar",
        unit: "×",
        value: 0,
        displayValue: "—",
        previousValue: null,
        trend: "TIDAK ADA PERBANDINGAN",
        rating: "TIDAK BERLAKU",
        explanation: "Tidak ada liabilitas lancar — rasio tidak punya arti karena tidak ada yang harus ditutup.",
        benchmark: "Patokan praktis: 1,0× — titik impas; 1,5× — ruang aman untuk fluktuasi penjualan.",
      });
      indikator.push({
        name: "Rasio Kas",
        unit: "×",
        value: 0,
        displayValue: "—",
        previousValue: null,
        trend: "TIDAK ADA PERBANDINGAN",
        rating: "TIDAK BERLAKU",
        explanation: "Tidak ada liabilitas lancar — rasio tidak punya arti karena tidak ada yang harus ditutup.",
        benchmark: "Patokan praktis: 0,2× — kas menutup seperlima liabilitas lancar.",
      });
    }

    const modalKerja = asetLancar - liabilitasLancar;
    indikator.push({
      name: "Modal Kerja",
      unit: "Rp",
      value: modalKerja,
      displayValue: formatNilaiIndikator(modalKerja, "Rp"),
      previousValue: null,
      trend: "TIDAK ADA PERBANDINGAN",
      rating: modalKerja > 0 ? "BAIK" : "KURANG SEHAT",
      explanation:
        modalKerja > 0
          ? "Modal kerja positif — ada dana sendiri yang menutup kegiatan harian tanpa bergantung pada pinjaman."
          : "Modal kerja negatif — kegiatan harian dibiayai dari utang.",
      benchmark: "Patokan praktis: modal kerja di atas nol berarti aman untuk kegiatan harian.",
    });

    const adaYangKurangSehat = indikator.some((i) => i.rating === "KURANG SEHAT");
    const adaYangTidakTerukur = indikator.some((i) => i.rating === "TIDAK BERLAKU");
    const verdict = adaYangKurangSehat
      ? "PERLU TINDAKAN"
      : adaYangTidakTerukur
        ? "CUKUP SEHAT"
        : "SEHAT";

    return {
      date: tanggal,
      startDate: tanggal,
      endDate: tanggal,
      comparisonStartDate: tanggal,
      comparisonEndDate: tanggal,
      overallVerdict: verdict,
      overallExplanation: adaYangKurangSehat
        ? "Ada indikator yang berada di zona kurang sehat — bagian ini yang paling mendesak untuk dibenahi."
        : adaYangTidakTerukur
          ? "Tidak ada indikator yang bermasalah, tapi sebagian rasio tidak bisa diukur karena tidak ada liabilitas lancar untuk dibandingkan."
          : "Semua indikator yang dihitung berada di zona aman.",
      indicators: indikator,
      dupont: {
        returnOnEquity: 0,
        netProfitMargin: 0,
        assetTurnover: 0,
        equityMultiplier: 0,
        dominantDriver: "-",
      },
    };
  },
};

export function produkBaruId(): string {
  return `p${Date.now().toString(36)}`;
}
