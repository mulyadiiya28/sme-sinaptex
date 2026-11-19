/**
 * Format key: SNTX-XXXXX-XXXXX-CCCCC (huruf besar + angka, tanpa 0/O/1/I).
 * Grup terakhir adalah checksum FNV-1a dari dua grup pertama — key acak ditolak.
 */
const POLA_KEY = /^SNTX-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/;
const AKSARA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type JenisLisensi = "starter" | "professional" | "enterprise";

export type HasilValidasiKey =
  | { ok: true; jenis: JenisLisensi; berakhirPada: string | null }
  | { ok: false; alasan: string };

const LABEL: Record<JenisLisensi, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

export function labelLisensi(jenis: JenisLisensi): string {
  return LABEL[jenis];
}

export function normalisasiKey(mentah: string): string {
  const huruf = mentah.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const isi = huruf.startsWith("SNTX") ? huruf.slice(4) : huruf;
  const grup = [isi.slice(0, 5), isi.slice(5, 10), isi.slice(10, 15)].filter(Boolean);
  return ["SNTX", ...grup].join("-");
}

/** Masa berlaku opsional: 2 karakter terakhir grup ke-2 = bulan sejak Jan 2026 (base32). */
function bacaMasaBerlaku(key: string): string | null {
  const kode = key.split("-")[2]?.slice(-2) ?? "";
  const n = parseInt(kode, 32);
  if (!Number.isFinite(n) || n <= 0 || n >= 32 * 32 - 1) return null;
  const mulai = new Date(Date.UTC(2026, 0, 1));
  mulai.setUTCMonth(mulai.getUTCMonth() + n);
  return mulai.toISOString().slice(0, 10);
}

export function validasiFormatKey(key: string): HasilValidasiKey {
  const normal = normalisasiKey(key);
  if (!POLA_KEY.test(normal)) {
    return { ok: false, alasan: "Format key tidak dikenali. Contoh: SNTX-ABCDE-FGHIJ-KLMNO." };
  }
  const [grup1, grup2, cek] = normal.split("-").slice(1);
  if (checksum(`${grup1}${grup2}`) !== cek) {
    return { ok: false, alasan: "Key tidak valid. Periksa kembali kode dari penerbit." };
  }
  const berakhirPada = bacaMasaBerlaku(normal);
  if (berakhirPada && berakhirPada < new Date().toISOString().slice(0, 10)) {
    return { ok: false, alasan: `Key ini sudah kedaluwarsa pada ${berakhirPada}.` };
  }
  return { ok: true, jenis: jenisDariKey(grup1), berakhirPada };
}

function jenisDariKey(grup1: string): JenisLisensi {
  const penanda = AKSARA.indexOf(grup1[0] ?? "A");
  if (penanda % 3 === 0) return "starter";
  if (penanda % 3 === 1) return "professional";
  return "enterprise";
}

/** FNV-1a 32-bit, lalu 5 aksara. Tanpa BigInt agar tetap lolos target ES2017. */
function checksum(isi: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < isi.length; i++) {
    hash ^= isi.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash >>>= 0;
  let hasil = "";
  for (let i = 0; i < 5; i++) {
    hasil = AKSARA[hash % 32] + hasil;
    hash = Math.floor(hash / 32);
  }
  return hasil;
}

/** Sidik perangkat lokal. Di desktop, Rust menimpa nilai ini dengan sidik mesin. */
export function sidikPerangkatLokal(): string {
  const kunci = "pos-sinaptex-perangkat";
  const ada = localStorage.getItem(kunci);
  if (ada) return ada;
  const baru = crypto.randomUUID();
  localStorage.setItem(kunci, baru);
  return baru;
}
