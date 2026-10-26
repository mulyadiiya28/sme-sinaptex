"use client";

import { useMemo, useRef, useState } from "react";
import { BadgePercent, CheckCircle2, Plus, ReceiptText, XCircle } from "lucide-react";
import type { CheckoutResult, PaymentMethod } from "@/lib/api/types";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import { pajakNominal, totalTransaksi, useCart } from "@/lib/store/cart";
import { useToko } from "@/lib/store/toko";
import { cetakStruk } from "@/lib/struk";
import { useCheckout } from "@/hooks/queries";

const METODE: Array<{ id: PaymentMethod; label: string; digital: boolean }> = [
  { id: "tunai", label: "Tunai", digital: false },
  { id: "transfer", label: "Transfer bank", digital: true },
  { id: "qris", label: "QRIS", digital: true },
];

const STATUS_TONE = {
  lunas: "success",
  menunggu_pembayaran: "warning",
  dibayar_sebagian: "warning",
} as const;

const STATUS_LABEL = {
  lunas: "Lunas",
  menunggu_pembayaran: "Menunggu pembayaran",
  dibayar_sebagian: "Dibayar sebagian (piutang)",
} as const;

export function PaymentDialog({
  kasir,
  shiftId,
  onClose,
}: {
  kasir: string;
  shiftId: string;
  onClose: (resetCart: boolean) => void;
}) {
  const cart = useCart();
  const pajakPersen = useToko((s) => s.profil.pajakPersen ?? 0);
  const izinkanKredit = useToko((s) => s.kebijakan.izinkanKredit);
  const [sukses, setSukses] = useState<CheckoutResult | null>(null);
  const kunciIdempotensi = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `chk-${Date.now()}-${Math.random()}`,
  );

  const total = totalTransaksi(cart.lines, cart.diskonTransaksi, pajakNominal(cart.lines, cart.diskonTransaksi, pajakPersen));

  const hitungan = useMemo(() => {
    let belum = total;
    let kembalian = 0;
    const baris = cart.allocations.map((a) => {
      const lebih = a.metode !== "tunai" && a.nominal > belum;
      const pakai = Math.min(a.nominal, belum);
      if (a.metode === "tunai" && a.nominal > belum) {
        kembalian += a.nominal - belum;
      }
      belum -= pakai;
      return { ...a, over: lebih };
    });
    return { baris, kembalian, sisa: Math.max(0, belum) };
  }, [total, cart.allocations]);

  const mutation = useCheckout((result) => setSukses(result));

  const canConfirm =
    cart.lines.length > 0 &&
    cart.allocations.length > 0 &&
    !hitungan.baris.some((b) => b.over || b.nominal <= 0) &&
    (hitungan.sisa === 0 || cart.gunakanPiutang);

  function confirm() {
    mutation.mutate({
      lines: cart.lines,
      diskonTransaksi: cart.diskonTransaksi,
      pajak: pajakNominal(cart.lines, cart.diskonTransaksi, pajakPersen),
      allocations: cart.allocations,
      gunakanPiutang: cart.gunakanPiutang,
      pelanggan: cart.pelanggan,
      kasir,
      shiftId,
      idempotensiKunci: kunciIdempotensi.current,
    });
  }

  if (sukses) {
    const toko = useToko.getState().profil;
    const dataStruk = {
      nomor: sukses.nomor,
      waktu: new Date().toISOString(),
      kasir,
      shiftId,
      pelanggan: cart.pelanggan,
      items: cart.lines.map((l) => ({
        nama: l.product.nama,
        qty: l.qty,
        hargaJual: l.product.hargaJual,
        diskon: l.diskon,
      })),
      diskonTransaksi: cart.diskonTransaksi,
      pajak: pajakNominal(cart.lines, cart.diskonTransaksi, pajakPersen),
      total: sukses.total,
      kembalian: sukses.kembalian,
      piutang: sukses.piutang,
      pembayaran: cart.allocations,
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
        <div className="panel w-full max-w-sm p-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-7" aria-hidden />
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted">
            Transaksi tercatat
          </p>
          <p className="text-2xl font-black text-brand">{sukses.nomor}</p>
          <div className="mt-2 flex justify-center">
            <StatusBadge label={STATUS_LABEL[sukses.status]} tone={STATUS_TONE[sukses.status]} />
          </div>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Total</dt>
              <dd className="font-semibold"><MoneyDisplay value={sukses.total} /></dd>
            </div>
            {sukses.kembalian > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Kembalian</dt>
                <dd className="font-bold text-emerald-600"><MoneyDisplay value={sukses.kembalian} /></dd>
              </div>
            )}
            {sukses.piutang > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Piutang pelanggan</dt>
                <dd className="font-bold text-amber-600"><MoneyDisplay value={sukses.piutang} /></dd>
              </div>
            )}
          </dl>
          {sukses.status === "menunggu_pembayaran" && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Pembayaran digital menunggu konfirmasi status. Transaksi belum lunas sampai engine memvalidasi.
            </p>
          )}
          <button type="button" onClick={() => cetakStruk(toko, dataStruk)} className="btn-secondary mt-2 w-full">
            <ReceiptText className="size-4" aria-hidden /> Cetak Struk
          </button>
          <button type="button" onClick={() => onClose(true)} className="btn-primary mt-2 w-full">
            Transaksi Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="panel max-h-[90vh] w-full max-w-lg overflow-y-auto p-7">
        <h2 className="font-black text-brand">Penyelesaian pembayaran</h2>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-brand/5 px-3.5 py-2.5 text-sm">
          <span className="text-muted">Total belanja</span>
          <MoneyDisplay value={total} className="text-xl font-black text-brand" />
        </div>

        <div className="mt-4 space-y-2.5">
          {hitungan.baris.map((a, i) => {
            const info = METODE.find((m) => m.id === a.metode)!;
            return (
              <div key={`${a.metode}-${i}`} className="rounded-xl border border-line bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{info.label}</span>
                  <button
                    type="button"
                    aria-label="Hapus alokasi"
                    onClick={() => cart.removeAllocation(i)}
                    className="text-muted transition-colors hover:text-rose-600"
                  >
                    <XCircle className="size-4" aria-hidden />
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  value={a.nominal === 0 ? "" : a.nominal}
                  onChange={(e) => cart.updateAllocation(i, Number(e.target.value))}
                  className="input mt-2 text-right text-lg font-bold tabular-nums"
                />
                {a.over && (
                  <p className="mt-1 text-xs font-semibold text-rose-600">
                    Pembayaran digital tidak boleh melebihi sisa pembayaran.
                  </p>
                )}
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2">
            {METODE.filter((m) => !cart.allocations.some((a) => a.metode === m.id)).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  cart.addAllocation(m.id, m.digital ? hitungan.sisa : 0)
                }
                className="btn-secondary rounded-lg px-3 py-2 text-xs"
              >
                <Plus className="size-3.5" aria-hidden /> {m.label}
              </button>
            ))}
          </div>
        </div>

        {hitungan.kembalian > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm">
            <span className="font-semibold text-emerald-700">Kembalian tunai</span>
            <MoneyDisplay value={hitungan.kembalian} className="font-black text-emerald-700" />
          </div>
        )}

        {hitungan.sisa > 0 && (
          <div className="mt-3 space-y-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-rose-700">Sisa pembayaran</span>
              <MoneyDisplay value={hitungan.sisa} className="font-black text-rose-700" />
            </div>
            {izinkanKredit ? (
              <label className="flex items-center gap-2 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={cart.gunakanPiutang}
                  onChange={(e) => cart.setPiutang(e.target.checked)}
                />
                Sisa menjadi piutang penjualan (penjualan kredit)
              </label>
            ) : (
              <p className="text-xs font-semibold text-rose-700">
                Kebijakan toko menonaktifkan penjualan kredit — lunasi seluruh sisa.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button type="button" disabled={!canConfirm || mutation.isPending} onClick={confirm}
            className="btn-primary flex-1 py-3 text-base disabled:cursor-not-allowed disabled:opacity-40">
            <ReceiptText className="size-4" aria-hidden />
            {mutation.isPending ? "Memproses..." : "Konfirmasi Pembayaran"}
          </button>
          <button type="button" onClick={() => onClose(false)} className="btn-secondary py-3">
            Batal
          </button>
        </div>
        {mutation.isError && (
          <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {String(mutation.error)}
          </p>
        )}
      </div>
    </div>
  );
}

export function PaymentIcon() {
  return <BadgePercent className="size-4" aria-hidden />;
}
