import type { CheckoutPayload } from "@/lib/api/types";

export function hitungKembalian(total: number, allocations: CheckoutPayload["allocations"]): number {
  const covered = allocations.reduce((sum, a) => sum + a.nominal, 0);
  return Math.max(0, covered - total);
}

export function hitungTotal(payload: Pick<CheckoutPayload, "lines" | "diskonTransaksi" | "pajak">): number {
  const subtotal = payload.lines.reduce(
    (sum, l) => sum + Math.max(0, l.product.hargaJual * l.qty - l.diskon),
    0,
  );
  return Math.max(0, subtotal - payload.diskonTransaksi + payload.pajak);
}
