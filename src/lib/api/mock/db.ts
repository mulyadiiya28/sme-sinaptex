import type {
  Biaya,
  JurnalBaris,
  JurnalEntry,
  LoginResult,
  Pembelian,
  PembelianInput,
  Product,
  ReturInput,
  ReturPenjualan,
  Role,
  ShiftBukaInput,
  ShiftInfo,
  ShiftMutasiInput,
  ShiftRiwayat,
  TransaksiRiwayat,
  User,
} from "@/lib/api/types";

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

const KAS_TUNAI_AWAL = 1_500_000;
const KAS_BANK_AWAL = 3_000_000;
const NILAI_PERSEDIAAN_AWAL = produkSeed.reduce((s, p) => s + p.stok * p.hargaBeli, 0);

let jurnalCounter = 0;
let pembelianCounter = 0;
let biayaCounter = 0;
let returCounter = 0;

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

export const mockDb = {
  products: [...produkSeed] as Product[],
  retur: [] as ReturPenjualan[],
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
  shiftAktif: null as ShiftInfo | null,
  shiftRiwayat: [] as ShiftRiwayat[],
  transaksi: [] as TransaksiRiwayat[],
  pembelian: [] as Pembelian[],
  biaya: [] as Biaya[],
  jurnal: [
    buatJurnal("Modal awal usaha", "OPEN-001", [
      { akun: "Kas", debit: KAS_TUNAI_AWAL, kredit: 0 },
      { akun: "Bank", debit: KAS_BANK_AWAL, kredit: 0 },
      { akun: "Persediaan", debit: NILAI_PERSEDIAAN_AWAL, kredit: 0 },
      { akun: "Modal", debit: 0, kredit: KAS_TUNAI_AWAL + KAS_BANK_AWAL + NILAI_PERSEDIAAN_AWAL },
    ]),
  ] as JurnalEntry[],
  kas: { tunai: KAS_TUNAI_AWAL, bank: KAS_BANK_AWAL },

  bukaShift(input: ShiftBukaInput): ShiftInfo {
    if (this.shiftAktif) throw new Error("Masih ada shift aktif. Tutup dulu.");
    const d = new Date();
    const tanggal = d.toISOString().slice(0, 10).replaceAll("-", "");
    const sesi = d.getHours() < 15 ? "AM" : "PM";
    this.shiftAktif = {
      id: `SH-${tanggal}-${sesi}`,
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

  batalTransaksi(nomor: string, user: User): TransaksiRiwayat {
    const t = this.transaksi.find((x) => x.nomor === nomor);
    if (!t) throw new Error("Transaksi tidak ditemukan.");
    if (t.status === "dibatalkan") throw new Error("Transaksi sudah dibatalkan sebelumnya.");

    if (t.shiftId === this.shiftAktif?.id) {
      const tunai = (t.pembayaran ?? []).find((b) => b.metode === "tunai")?.nominal ?? 0;
      this.shiftAktif.penjualanTunai = Math.max(0, this.shiftAktif.penjualanTunai - tunai);
      this.shiftAktif.kasTunaiSistem = kasTunaiSistem(this.shiftAktif);
      this.kas.tunai = Math.max(0, this.kas.tunai - tunai);
    }

    for (const item of t.items) {
      const p = this.products.find((x) => x.nama === item.nama);
      if (p) p.stok += item.qty;
    }

    const baris: JurnalBaris[] = [
      { akun: "Penjualan", debit: t.total, kredit: 0 },
    ];
    const tunaiPortion = (t.pembayaran ?? []).find((b) => b.metode === "tunai")?.nominal ?? 0;
    const bankPortion = (t.pembayaran ?? []).find((b) => b.metode === "transfer" || b.metode === "qris")?.nominal ?? 0;
    if (tunaiPortion > 0) baris.push({ akun: "Kas", debit: 0, kredit: tunaiPortion });
    if (bankPortion > 0) baris.push({ akun: "Bank", debit: 0, kredit: bankPortion });
    if (t.piutang > 0) baris.push({ akun: "Piutang usaha", debit: 0, kredit: t.piutang });
    const hpp = t.items.reduce((s, i) => {
      const p = this.products.find((x) => x.nama === i.nama);
      return s + (p ? p.hargaBeli * i.qty : 0);
    }, 0);
    if (hpp > 0) {
      baris.push({ akun: "Persediaan", debit: hpp, kredit: 0 });
      baris.push({ akun: "HPP", debit: 0, kredit: hpp });
    }
    this.jurnal.unshift(buatJurnal(`Pembatalan transaksi ${t.nomor}`, `VOID-${t.nomor}`, baris));

    this.kas.bank = Math.max(0, this.kas.bank - bankPortion);

    t.status = "dibatalkan";
    t.piutang = 0;
    this.audit(user, "void", `Batalkan transaksi ${t.nomor} (Rp${t.total.toLocaleString("id-ID")})`);
    return structuredClone(t);
  },

  penyesuaianStok(input: { productId: string; stokFisik: number; alasan: string }, user: User): Product {
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
    total: number,
    kembalian: number,
    piutang: number,
    allocations: Array<{ metode: string; nominal: number }>,
    pajak: number,
  ): void {
    let belum = total - kembalian;
    let masukTunai = 0;
    let masukBank = 0;
    let masukGateway = 0;
    const baris: JurnalBaris[] = [];
    for (const a of allocations) {
      if (belum <= 0) break;
      const masuk = Math.min(a.nominal, belum);
      if (a.metode === "tunai") masukTunai += masuk;
      else if (a.metode === "qris") masukGateway += masuk;
      else masukBank += masuk;
      belum -= masuk;
    }
    if (masukTunai > 0) baris.push({ akun: "Kas", debit: masukTunai, kredit: 0 });
    if (masukBank > 0) baris.push({ akun: "Bank", debit: masukBank, kredit: 0 });
    if (masukGateway > 0) baris.push({ akun: "Penampung gateway", debit: masukGateway, kredit: 0 });
    if (piutang > 0) baris.push({ akun: "Piutang usaha", debit: piutang, kredit: 0 });
    baris.push({ akun: "Penjualan", debit: 0, kredit: total - pajak });
    if (pajak > 0) baris.push({ akun: "Pajak keluaran", debit: 0, kredit: pajak });

    const hpp = payload.items.reduce((s, i) => s + i.qty * i.hargaBeli, 0);
    if (hpp > 0) {
      baris.push({ akun: "HPP", debit: hpp, kredit: 0 });
      baris.push({ akun: "Persediaan", debit: 0, kredit: hpp });
    }
    this.kas.tunai += masukTunai;
    this.kas.bank += masukBank;
    this.jurnal.unshift(
      buatJurnal(`Penjualan kasir (shift ${payload.shiftId})`, "penjualan", baris),
    );
  },

  konfirmasiDigital(nomor: string, user: User): TransaksiRiwayat {
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
    const t = this.transaksi.find((x) => x.nomor === input.referensi);
    if (!t) throw new Error("Transaksi referensi tidak ditemukan.");
    if (t.status === "dibatalkan") throw new Error("Transaksi referensi sudah dibatalkan.");
    if (input.items.length === 0) throw new Error("Pilih minimal satu item untuk diretur.");

    let total = 0;
    const items: ReturPenjualan["items"] = [];
    for (const r of input.items) {
      const asli = t.items.find((i) => i.nama === r.nama);
      if (!asli) throw new Error(`Item ${r.nama} tidak ada di transaksi ${t.nomor}.`);
      if (r.qty <= 0 || r.qty > asli.qty) throw new Error(`Qty retur ${r.nama} harus 1–${asli.qty}.`);
      total += asli.hargaJual * r.qty - asli.diskon;
      items.push({ nama: r.nama, qty: r.qty, hargaJual: asli.hargaJual });

      const p = this.products.find((x) => x.nama === r.nama);
      if (p) p.stok += r.qty;
    }

    if (input.metodeRefund === "tunai" && total > this.kas.tunai) throw new Error("Saldo kas tunai tidak cukup untuk refund.");
    if (input.metodeRefund === "transfer" && total > this.kas.bank) throw new Error("Saldo bank tidak cukup untuk refund.");

    returCounter += 1;
    const retur: ReturPenjualan = {
      id: `RT-${String(returCounter).padStart(4, "0")}`,
      nomor: `RTN-${String(returCounter).padStart(6, "0")}`,
      referensi: input.referensi,
      waktu: waktuSekarang(),
      items,
      total,
      alasan: input.alasan,
      metodeRefund: input.metodeRefund,
    };
    this.retur.unshift(retur);

    const sumber = input.metodeRefund === "tunai" ? "Kas" : "Bank";
    this.kas[input.metodeRefund === "tunai" ? "tunai" : "bank"] -= total;
    const hpp = items.reduce((s, i) => {
      const p = this.products.find((x) => x.nama === i.nama);
      return s + (p ? p.hargaBeli * i.qty : 0);
    }, 0);
    const baris: JurnalBaris[] = [
      { akun: "Retur penjualan", debit: total, kredit: 0 },
      { akun: sumber, debit: 0, kredit: total },
    ];
    if (hpp > 0) {
      baris.push({ akun: "Persediaan", debit: hpp, kredit: 0 });
      baris.push({ akun: "HPP", debit: 0, kredit: hpp });
    }
    this.jurnal.unshift(buatJurnal(`Retur penjualan dari ${input.referensi}`, retur.nomor, baris));

    this.audit(user, "retur", `${retur.nomor} dari ${input.referensi} (Rp${total.toLocaleString("id-ID")}) — ${input.alasan}`);
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
    if (metode === "tunai" && nominal > this.kas.tunai + 1e9) throw new Error("Saldo kas tunai tidak cukup.");

    t.piutang -= nominal;
    t.status = t.piutang === 0 ? "lunas" : "dibayar_sebagian";
    this.kas[metode === "tunai" ? "tunai" : "bank"] += nominal;
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

  akunSaldos(): Array<{ akun: string; debit: number; kredit: number; saldo: number }> {
    const map = new Map<string, { debit: number; kredit: number }>();
    for (const akun of DAFTAR_AKUN) map.set(akun, { debit: 0, kredit: 0 });
    for (const j of this.jurnal) {
      for (const b of j.baris) {
        const cur = map.get(b.akun) ?? { debit: 0, kredit: 0 };
        cur.debit += b.debit;
        cur.kredit += b.kredit;
        map.set(b.akun, cur);
      }
    }
    return DAFTAR_AKUN.map((akun) => {
      const { debit, kredit } = map.get(akun)!;
      return { akun, debit, kredit, saldo: debit - kredit };
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
};

export function produkBaruId(): string {
  return `p${Date.now().toString(36)}`;
}
