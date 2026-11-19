import type { ProfilToko } from "@/lib/api/types";
import type { DataKuitansi, DataStruk } from "@/lib/struk";
import { formatIDR } from "@/lib/format";

export type LebarKertas = 58 | 80;

export const KOLOM: Record<LebarKertas, number> = { 58: 32, 80: 48 };

const GANTI: Record<string, string> = {
  "\u00a0": " ",
  "×": "x",
  "−": "-",
  "–": "-",
  "—": "-",
  "’": "'",
  "‘": "'",
  "“": '"',
  "”": '"',
  "·": ".",
  "•": "*",
  "é": "e",
  "è": "e",
  "á": "a",
  "à": "a",
  "í": "i",
  "ó": "o",
  "ú": "u",
  "ç": "c",
};

function siap(teks: string): string {
  return Array.from(teks)
    .map((huruf) => GANTI[huruf] ?? huruf)
    .map((huruf) => {
      const kode = huruf.codePointAt(0) ?? 63;
      return kode >= 32 && kode <= 126 ? huruf : "?";
    })
    .join("");
}

function bungkus(teks: string, lebar: number): string[] {
  const kata = siap(teks).split(/\s+/).filter(Boolean);
  const hasil: string[] = [];
  let baris = "";
  for (const potong of kata) {
    if (potong.length > lebar) {
      if (baris) {
        hasil.push(baris);
        baris = "";
      }
      for (let i = 0; i < potong.length; i += lebar) {
        hasil.push(potong.slice(i, i + lebar));
      }
      continue;
    }
    if (!baris) {
      baris = potong;
    } else if (baris.length + 1 + potong.length <= lebar) {
      baris += ` ${potong}`;
    } else {
      hasil.push(baris);
      baris = potong;
    }
  }
  if (baris) hasil.push(baris);
  return hasil.length ? hasil : [""];
}

function rupiah(nilai: number): string {
  return siap(formatIDR(nilai));
}

function qty(nilai: number): string {
  return nilai.toLocaleString("id-ID", { maximumFractionDigits: 4 });
}

function tanggal(waktu: string): string {
  const d = new Date(waktu);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

class EscPos {
  private bytes: number[] = [];

  constructor(readonly lebar: number) {}

  private tulis(teks: string): this {
    for (const huruf of siap(teks)) this.bytes.push(huruf.charCodeAt(0));
    return this;
  }

  init(): this {
    this.bytes.push(0x1b, 0x40);
    return this;
  }

  align(arah: "kiri" | "tengah" | "kanan"): this {
    const kode = arah === "kiri" ? 0 : arah === "tengah" ? 1 : 2;
    this.bytes.push(0x1b, 0x61, kode);
    return this;
  }

  bold(aktif: boolean): this {
    this.bytes.push(0x1b, 0x45, aktif ? 1 : 0);
    return this;
  }

  besar(ganda: boolean): this {
    this.bytes.push(0x1d, 0x21, ganda ? 0x11 : 0x00);
    return this;
  }

  baris(teks = ""): this {
    this.align("kiri");
    this.tulis(teks);
    this.bytes.push(0x0a);
    return this;
  }

  kanan(teks: string): this {
    const isi = siap(teks);
    return this.baris(isi.length >= this.lebar ? isi.slice(0, this.lebar) : " ".repeat(this.lebar - isi.length) + isi);
  }

  tengah(teks: string): this {
    for (const bagian of bungkus(teks, this.lebar)) {
      this.align("tengah");
      this.tulis(bagian);
      this.bytes.push(0x0a);
    }
    this.align("kiri");
    return this;
  }

  dua(kiri: string, kanan: string): this {
    const a = siap(kiri);
    const b = siap(kanan);
    if (a.length + b.length + 1 <= this.lebar) {
      return this.baris(a + " ".repeat(this.lebar - a.length - b.length) + b);
    }
    const potong = this.lebar - b.length - 1;
    if (potong <= 0) {
      return this.baris(a).kanan(b);
    }
    return this.baris(a.slice(0, potong).padEnd(this.lebar - b.length) + b);
  }

  garis(karakter = "-"): this {
    return this.baris(karakter.repeat(this.lebar));
  }

  maju(n: number): this {
    this.bytes.push(0x1b, 0x64, n);
    return this;
  }

  laci(): this {
    this.bytes.push(0x1b, 0x70, 0x00, 0x19, 0xfa);
    return this;
  }

  potong(penuh = false): this {
    this.bytes.push(0x1d, 0x56, penuh ? 0x00 : 0x42, 0x00);
    return this;
  }

  selesai(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

export type OpsiCetak = {
  lebar: LebarKertas;
  salinan?: number;
  potong?: boolean;
  bukaLaci?: boolean;
};

function kepala(p: EscPos, toko: ProfilToko): void {
  p.align("tengah").bold(true).besar(true).baris(siap(toko.nama)).besar(false).bold(false);
  for (const baris of bungkus(toko.alamat, p.lebar)) p.tengah(baris);
  if (toko.telepon) p.tengah(toko.telepon);
  p.garis();
}

function labelBayar(metode: string): string {
  if (metode === "tunai") return "Tunai";
  if (metode === "qris") return "QRIS";
  return "Transfer";
}

function strukSatuSalinan(p: EscPos, toko: ProfilToko, d: DataStruk): void {
  kepala(p, toko);
  p.dua(d.nomor, tanggal(d.waktu));
  p.dua(`kasir ${d.kasir}`, `shift ${d.shiftId}`);
  if (d.pelanggan) p.baris(`pelanggan: ${d.pelanggan}`);
  p.garis();

  let subtotal = 0;
  for (const item of d.items) {
    const nilai = Math.max(0, item.hargaJual * item.qty - item.diskon);
    subtotal += nilai;
    for (const baris of bungkus(item.nama, p.lebar)) p.baris(baris);
    const kiri = `${qty(item.qty)} x ${rupiah(item.hargaJual)}${item.diskon > 0 ? ` - ${rupiah(item.diskon)}` : ""}`;
    p.dua(kiri, rupiah(nilai));
  }

  p.garis();
  p.dua("Subtotal", rupiah(subtotal));
  if (d.diskonTransaksi > 0) p.dua("Diskon transaksi", `- ${rupiah(d.diskonTransaksi)}`);
  if (d.pajak > 0) p.dua("Pajak", rupiah(d.pajak));
  p.bold(true).dua("TOTAL", rupiah(d.total)).bold(false);
  for (const bayar of d.pembayaran ?? []) p.dua(labelBayar(bayar.metode), rupiah(bayar.nominal));
  if (d.kembalian > 0) p.dua("Kembalian", rupiah(d.kembalian));
  if (d.piutang > 0) p.dua("Piutang (kredit)", rupiah(d.piutang));
  p.garis();
  for (const baris of bungkus(toko.footerStruk, p.lebar)) p.tengah(baris);
  p.tengah("asli: toko | salinan: pelanggan");
}

export function buildStrukEscPos(toko: ProfilToko, d: DataStruk, opsi: OpsiCetak): Uint8Array {
  const p = new EscPos(KOLOM[opsi.lebar]);
  const salinan = Math.max(1, Math.min(3, opsi.salinan ?? 1));
  p.init();
  for (let i = 0; i < salinan; i += 1) {
    if (i > 0) {
      p.garis("=");
      p.bold(true).tengah("*** SALINAN ***").bold(false);
      p.garis("=");
    }
    strukSatuSalinan(p, toko, d);
    p.maju(3);
    if (opsi.potong) p.potong();
  }
  if (opsi.bukaLaci) p.laci();
  return p.selesai();
}

export function buildKuitansiEscPos(toko: ProfilToko, d: DataKuitansi, opsi: OpsiCetak): Uint8Array {
  const p = new EscPos(KOLOM[opsi.lebar]);
  p.init();
  kepala(p, toko);
  p.bold(true).tengah("KUITANSI PIUTANG").bold(false);
  p.garis();
  p.dua("No. faktur", d.nomor);
  p.dua("Tanggal", tanggal(d.waktu));
  if (d.pelanggan) p.dua("Pelanggan", d.pelanggan);
  p.dua("Kasir", d.kasir);
  p.dua("Shift", d.shiftId);
  p.garis();
  p.bold(true).dua("Penerimaan", rupiah(d.nominal)).bold(false);
  p.dua("Metode", d.metode === "tunai" ? "Tunai" : "Transfer bank");
  p.dua("Sisa piutang", rupiah(d.sisaPiutang));
  p.garis();
  p.tengah("Terima kasih, pembayaran telah diterima.");
  for (const baris of bungkus(toko.footerStruk, p.lebar)) p.tengah(baris);
  p.maju(3);
  if (opsi.potong) p.potong();
  if (opsi.bukaLaci) p.laci();
  return p.selesai();
}

export function buildTestEscPos(toko: ProfilToko, lebar: LebarKertas): Uint8Array {
  const p = new EscPos(KOLOM[lebar]);
  p.init();
  kepala(p, toko);
  p.bold(true).besar(true).tengah("TES PRINTER").besar(false).bold(false);
  p.garis();
  p.dua("Lebar kertas", `${lebar} mm`);
  p.dua("Jumlah kolom", `${KOLOM[lebar]}`);
  p.dua("Waktu", tanggal(new Date().toISOString()));
  p.garis();
  p.tengah("Cetak berhasil jika teks ini terbaca rapi.");
  p.maju(3);
  p.potong();
  return p.selesai();
}
