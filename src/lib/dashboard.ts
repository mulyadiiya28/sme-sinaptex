import type { PaymentMethod, TransaksiRiwayat } from "@/lib/api/types";
import { tanggalLokal } from "@/lib/format";

export type TitikPenjualan = {
  tanggal: string;
  label: string;
  total: number;
  transaksi: number;
};

export type RingkasanMetode = {
  metode: PaymentMethod;
  label: string;
  total: number;
  jumlah: number;
  /** Porsi terhadap total uang yang benar-benar diterima (0–100). */
  persen: number;
};

const LABEL_METODE: Record<PaymentMethod, string> = {
  tunai: "Tunai",
  transfer: "Transfer",
  qris: "QRIS",
};

const URUTAN_METODE: PaymentMethod[] = ["tunai", "transfer", "qris"];

/**
 * Rentang `jumlahHari` hari terakhir, inklusif hari ini.
 *
 * Dihitung lewat komponen tanggal lokal, bukan pengurangan milidetik, supaya
 * pergantian bulan dan zona waktu tidak menggeser batas periode.
 */
export function rentangHariTerakhir(jumlahHari: number, akhir: Date = new Date()) {
  const mulai = new Date(akhir.getFullYear(), akhir.getMonth(), akhir.getDate() - (jumlahHari - 1));
  return { dari: tanggalLokal(mulai), sampai: tanggalLokal(akhir) };
}

function daftarHari(jumlahHari: number, akhir: Date = new Date()): string[] {
  const hari: string[] = [];
  for (let i = jumlahHari - 1; i >= 0; i -= 1) {
    const d = new Date(akhir.getFullYear(), akhir.getMonth(), akhir.getDate() - i);
    hari.push(tanggalLokal(d));
  }
  return hari;
}

function labelHari(tanggal: string): string {
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  return new Date(tahun, bulan - 1, hari).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Omzet dan jumlah transaksi per hari. Hari tanpa transaksi tetap muncul
 * sebagai nol supaya garis tren tidak melompati hari kosong.
 */
export function ringkasTrenPenjualan(
  transaksi: TransaksiRiwayat[],
  jumlahHari: number,
): TitikPenjualan[] {
  const hari = daftarHari(jumlahHari);
  const peta = new Map(hari.map((tanggal) => [tanggal, { total: 0, transaksi: 0 }]));

  for (const t of transaksi) {
    if (t.status === "dibatalkan") continue;
    const slot = peta.get(tanggalLokal(t.waktu));
    if (!slot) continue;
    slot.total += t.total;
    slot.transaksi += 1;
  }

  return hari.map((tanggal) => {
    const slot = peta.get(tanggal) ?? { total: 0, transaksi: 0 };
    return { tanggal, label: labelHari(tanggal), total: slot.total, transaksi: slot.transaksi };
  });
}

/**
 * Komposisi uang yang diterima per metode bayar. Piutang tidak dihitung
 * sebagai metode — ia bagian yang belum dibayar dan dilaporkan terpisah.
 */
export function ringkasMetodePembayaran(
  transaksi: TransaksiRiwayat[],
  jumlahHari: number,
): RingkasanMetode[] {
  const hari = new Set(daftarHari(jumlahHari));
  const peta = new Map<PaymentMethod, { total: number; jumlah: number }>();

  for (const t of transaksi) {
    if (t.status === "dibatalkan" || !hari.has(tanggalLokal(t.waktu))) continue;
    for (const kaki of t.pembayaran ?? []) {
      if (kaki.nominal <= 0) continue;
      const slot = peta.get(kaki.metode) ?? { total: 0, jumlah: 0 };
      slot.total += kaki.nominal;
      slot.jumlah += 1;
      peta.set(kaki.metode, slot);
    }
  }

  const totalSemua = Array.from(peta.values()).reduce((s, m) => s + m.total, 0);
  return URUTAN_METODE.map((metode) => {
    const slot = peta.get(metode) ?? { total: 0, jumlah: 0 };
    return {
      metode,
      label: LABEL_METODE[metode],
      total: slot.total,
      jumlah: slot.jumlah,
      persen: totalSemua > 0 ? (slot.total / totalSemua) * 100 : 0,
    };
  }).filter((m) => m.total > 0);
}

/** Piutang yang lahir dari transaksi pada periode tersebut. */
export function piutangPeriode(transaksi: TransaksiRiwayat[], jumlahHari: number): number {
  const hari = new Set(daftarHari(jumlahHari));
  return transaksi
    .filter((t) => t.status !== "dibatalkan" && hari.has(tanggalLokal(t.waktu)))
    .reduce((s, t) => s + t.piutang, 0);
}
