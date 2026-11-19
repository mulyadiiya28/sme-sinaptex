import type { AgedInvoice } from "@/lib/api/types";
import type { ReminderLog, TahapReminder } from "@/lib/store/reminder";

export const LABEL_TAHAP: Record<TahapReminder, string> = {
  jatuhTempo: "Jatuh tempo",
  h1: "H-1",
  h3: "H+3",
  h7: "H+7",
};

export const TONE_TAHAP: Record<TahapReminder, "warning" | "danger" | "info"> = {
  jatuhTempo: "warning",
  h1: "info",
  h3: "danger",
  h7: "danger",
};

export function jatuhTempoEfektif(inv: AgedInvoice): string {
  return (inv.dueDate ?? inv.invoiceDate).slice(0, 10);
}

function hariKe(tanggal: string): number {
  const [y, m, d] = tanggal.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return 0;
  return Date.UTC(y, m - 1, d);
}

export function selisihHariJatuhTempo(inv: AgedInvoice, hari: string): number {
  return Math.round((hariKe(jatuhTempoEfektif(inv)) - hariKe(hari)) / 86_400_000);
}

export function tahapReminder(inv: AgedInvoice, hari: string): TahapReminder | null {
  const selisih = selisihHariJatuhTempo(inv, hari);
  if (selisih === 0) return "jatuhTempo";
  if (selisih === 1) return "h1";
  if (selisih <= -7) return "h7";
  if (selisih <= -3) return "h3";
  return null;
}

export function labelSelisih(selisih: number): string {
  if (selisih === 0) return "Hari ini";
  if (selisih === 1) return "Besok";
  if (selisih > 1) return `${selisih} hari lagi`;
  return `${Math.abs(selisih)} hari lewat`;
}

export function sudahDiingatkan(
  log: ReminderLog[],
  invoiceId: string,
  tahap: TahapReminder,
): ReminderLog | undefined {
  return log.find((l) => l.invoiceId === invoiceId && l.tahap === tahap);
}

export function perluReminder(
  invoices: AgedInvoice[],
  log: ReminderLog[],
  hari: string,
): Array<{ inv: AgedInvoice; tahap: TahapReminder }> {
  const hasil: Array<{ inv: AgedInvoice; tahap: TahapReminder }> = [];
  for (const inv of invoices) {
    const tahap = tahapReminder(inv, hari);
    if (tahap && !sudahDiingatkan(log, inv.invoiceId, tahap)) hasil.push({ inv, tahap });
  }
  return hasil;
}

export type DataPesan = {
  nama: string;
  nomor: string;
  nominal: string;
  jatuhTempo: string;
  toko: string;
};

export function susunPesan(template: string, data: DataPesan): string {
  return template
    .replaceAll("{nama}", data.nama)
    .replaceAll("{nomor}", data.nomor)
    .replaceAll("{nominal}", data.nominal)
    .replaceAll("{jatuhTempo}", data.jatuhTempo)
    .replaceAll("{toko}", data.toko)
    .trim();
}

export function normalisasiTelepon(telepon: string): string {
  const digit = telepon.replace(/\D/g, "");
  if (!digit) return "";
  if (digit.startsWith("0")) return `62${digit.slice(1)}`;
  if (digit.startsWith("8")) return `62${digit}`;
  return digit;
}

export function tautanWhatsApp(telepon: string, pesan: string): string | null {
  const nomor = normalisasiTelepon(telepon);
  if (!nomor) return null;
  return `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`;
}
