import type { CartLine, CheckoutPayload } from "@/lib/api/types";

export function bulat2(nilai: number): number {
  return Math.round(nilai * 100) / 100;
}

export function bulat4(nilai: number): number {
  return Math.round(nilai * 10000) / 10000;
}

export interface BarisHarga {
  productId: string;
  qty: number;
  unitPrice: number;
  bruto: number;
  diskon: number;
  net: number;
}

export function hitungBarisHarga(lines: CartLine[]): BarisHarga[] {
  return lines.map((l) => {
    const qty = bulat4(l.qty);
    const unitPrice = bulat2(Math.max(0, l.product.hargaJual));
    const bruto = bulat2(qty * unitPrice);
    const diskon = Math.max(0, bulat2(l.diskon));
    const net = bulat2(bruto - diskon);
    return { productId: l.product.id, qty, unitPrice, bruto, diskon, net };
  });
}

export function sebarDiskonTransaksi(
  baris: BarisHarga[],
  diskonTransaksi: number
): number[] {
  const target = Math.max(0, bulat2(diskonTransaksi));
  const dasar = baris.reduce((s, b) => s + b.net, 0);
  let sisa = target;

  const result = baris.map((b, i) => {
    const terakhir = i === baris.length - 1;
    const proporsi = dasar > 0 ? b.net / dasar : 0;
    const porsi = terakhir
      ? sisa
      : Math.min(bulat2(target * proporsi), sisa);
    sisa = bulat2(sisa - porsi);
    return Math.min(b.bruto, bulat2(b.diskon + porsi));
  });

  return result;
}

export function totalParity(
  payload: Pick<CheckoutPayload, "lines" | "diskonTransaksi" | "pajak">
): { base: number; pajak: number; total: number; baris: BarisHarga[]; diskonPerBaris: number[] } {
  const baris = hitungBarisHarga(payload.lines);
  const diskonPerBaris = sebarDiskonTransaksi(baris, payload.diskonTransaksi);
  const base = bulat2(baris.reduce((s, b, i) => s + bulat2(b.bruto - diskonPerBaris[i]), 0));
  const pajak = bulat2(payload.pajak);
  return { base, pajak, total: bulat2(base + pajak), baris, diskonPerBaris };
}

export function pajakNominal(
  base: number,
  persen: number
): number {
  if (base <= 0 || persen <= 0) return 0;
  return bulat2((base * persen) / 100);
}