"use client";

import { Minus, Plus, ShoppingBasket, Trash2, X } from "lucide-react";
import type { Product } from "@/lib/api/types";
import { MoneyDisplay } from "@/components/money-display";
import { subtotalLines, totalTransaksi, useCart } from "@/lib/store/cart";
import { cn } from "@/lib/utils";

export function CartPanel({
  onBayar,
  onBatal,
}: {
  onBayar: () => void;
  onBatal: () => void;
}) {
  const { lines, diskonTransaksi, setQty, removeLine, setDiskonTransaksi, setPelanggan } = useCart();
  const subtotal = subtotalLines(lines);
  const total = totalTransaksi(lines, diskonTransaksi);
  const totalItem = lines.reduce((s, l) => s + l.qty, 0);

  if (lines.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <ShoppingBasket className="size-6" aria-hidden />
        </span>
        <p className="font-bold text-brand">Keranjang kosong</p>
        <p className="max-w-xs text-sm text-muted">
          Tambah produk lewat pencarian, atau scan barcode.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
        {lines.map((l) => (
          <div key={l.product.id} className="panel rounded-2xl p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{l.product.nama}</p>
                <MoneyDisplay value={l.product.hargaJual} className="text-xs text-muted" />
              </div>
              <button
                type="button"
                aria-label={`Hapus ${l.product.nama}`}
                onClick={() => removeLine(l.product.id)}
                className="text-muted transition-colors hover:text-rose-600"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <QtyBtn aria="Kurangi" onClick={() => setQty(l.product.id, l.qty - 1)}>
                  <Minus className="size-3.5" aria-hidden />
                </QtyBtn>
                <input
                  type="number"
                  min={1}
                  value={l.qty}
                  onChange={(e) => setQty(l.product.id, Number(e.target.value))}
                  className="w-12 rounded-lg border border-line py-1 text-center text-sm font-bold tabular-nums"
                />
                <QtyBtn aria="Tambah" onClick={() => setQty(l.product.id, l.qty + 1)}>
                  <Plus className="size-3.5" aria-hidden />
                </QtyBtn>
              </div>
              <MoneyDisplay value={Math.max(0, l.product.hargaJual * l.qty - l.diskon)} className="font-bold text-brand" />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line bg-white p-5">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Pelanggan (opsional)"
            className="input flex-1"
            onChange={(e) => setPelanggan(e.target.value || undefined)}
          />
          <button type="button" onClick={onBatal} className="btn-secondary py-2.5 text-rose-600" aria-label="Batalkan transaksi">
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <dl className="mt-4 space-y-1.5 text-sm">
          <RowFlex label={`Subtotal (${totalItem} item)`} value={subtotal} />
          <div className="flex items-center justify-between">
            <dt className="text-muted">Diskon transaksi (Rp)</dt>
            <input
              type="number"
              min={0}
              value={diskonTransaksi || ""}
              onChange={(e) => setDiskonTransaksi(Number(e.target.value))}
              className="w-28 rounded-lg border border-line px-2 py-1 text-right text-sm tabular-nums"
            />
          </div>
          <div className="mt-1 flex items-baseline justify-between border-t border-dashed border-line pt-2.5">
            <dt className="font-bold text-ink">Total</dt>
            <MoneyDisplay value={total} className="text-2xl font-black text-brand" />
          </div>
        </dl>

        <button type="button" onClick={onBayar} className="btn-primary mt-4 w-full py-3 text-base">
          Pembayaran → (F4)
        </button>
      </div>
    </div>
  );
}

function RowFlex({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">
        <MoneyDisplay value={value} />
      </dd>
    </div>
  );
}

function QtyBtn({ aria, onClick, children }: { aria: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      className={cn("btn-secondary size-8 rounded-lg p-0")}
    >
      {children}
    </button>
  );
}
