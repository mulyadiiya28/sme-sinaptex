import type {
  Biaya,
  JurnalBaris,
  JurnalEntry,
  Pembelian,
  PembelianInput,
  Product,
  ShiftBukaInput,
  ShiftInfo,
  ShiftMutasiInput,
  ShiftRiwayat,
  TransaksiRiwayat,
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
  "Piutang usaha",
  "Persediaan",
  "Hutang usaha",
  "Modal",
  "Penjualan",
  "HPP",
  "Biaya operasional",
];

const KAS_TUNAI_AWAL = 1_500_000;
const KAS_BANK_AWAL = 3_000_000;
const NILAI_PERSEDIAAN_AWAL = produkSeed.reduce((s, p) => s + p.stok * p.hargaBeli, 0);

let jurnalCounter = 0;
let pembelianCounter = 0;
let biayaCounter = 0;

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

  riwayatTransaksi(): TransaksiRiwayat[] {
    return structuredClone(this.transaksi);
  },

  jurnalPenjualan(
    payload: { shiftId: string; items: Array<{ nama: string; qty: number; hargaBeli: number }> },
    total: number,
    kembalian: number,
    piutang: number,
    allocations: Array<{ metode: string; nominal: number }>,
  ): void {
    let belum = total - kembalian;
    let masukTunai = 0;
    let masukBank = 0;
    const baris: JurnalBaris[] = [];
    for (const a of allocations) {
      if (belum <= 0) break;
      const masuk = Math.min(a.nominal, belum);
      if (a.metode === "tunai") masukTunai += masuk;
      else masukBank += masuk;
      belum -= masuk;
    }
    if (masukTunai > 0) baris.push({ akun: "Kas", debit: masukTunai, kredit: 0 });
    if (masukBank > 0) baris.push({ akun: "Bank", debit: masukBank, kredit: 0 });
    if (piutang > 0) baris.push({ akun: "Piutang usaha", debit: piutang, kredit: 0 });
    baris.push({ akun: "Penjualan", debit: 0, kredit: total });

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

  labaRugi(): { pendapatan: number; hpp: number; biaya: number; laba: number } {
    const s = new Map(this.akunSaldos().map((a) => [a.akun, a]));
    const pendapatan = -(s.get("Penjualan")?.saldo ?? 0);
    const hpp = s.get("HPP")?.saldo ?? 0;
    const biaya = s.get("Biaya operasional")?.saldo ?? 0;
    return { pendapatan, hpp, biaya, laba: pendapatan - hpp - biaya };
  },
};

export function produkBaruId(): string {
  return `p${Date.now().toString(36)}`;
}
