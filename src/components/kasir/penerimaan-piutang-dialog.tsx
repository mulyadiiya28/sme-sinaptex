"use client";

import { useState } from "react";
import { CheckCircle2, HandCoins, ReceiptText, Search } from "lucide-react";
import { MoneyDisplay } from "@/components/money-display";
import { usePembayaranMutations, useRiwayatTransaksi } from "@/hooks/queries";
import type { TransaksiRiwayat } from "@/lib/api/types";
import { cetakKuitansi } from "@/lib/struk";
import { useToko } from "@/lib/store/toko";

/**
 * Penerimaan piutang dari layar kasir.
 *
 * Kasir yang menerima pembayaran piutang tidak perlu masuk ke menu
 * Keuangan — dan di mock, Keuangan pun hanya untuk pemilik, jadi tanpa
 * dialog ini kasir tidak bisa menagih piutang sama sekali.
 */
export function PenerimaanPiutangDialog({
  kasir,
  shiftId,
  onClose,
}: {
  kasir: string;
  shiftId: string;
  onClose: () => void;
}) {
  const riwayat = useRiwayatTransaksi();
  const { bayarPiutang } = usePembayaranMutations();
  const toko = useToko((s) => s.profil);
  const [cari, setCari] = useState("");
  const [terpilih, setTerpilih] = useState<TransaksiRiwayat | null>(null);
  const [nominal, setNominal] = useState("");
  const [metode, setMetode] = useState<"tunai" | "transfer">("tunai");
  const [sukses, setSukses] = useState<{ nomor: string; nominal: number; sisa: number } | null>(null);

  const daftar = (riwayat.data ?? []).filter(
    (t) => t.status !== "dibatalkan" && t.piutang > 0,
  );
  const carian = cari.trim().toLowerCase();
  const tampil = carian
    ? daftar.filter(
        (t) =>
          t.nomor.toLowerCase().includes(carian) ||
          (t.pelanggan ?? "").toLowerCase().includes(carian),
      )
    : daftar;

  const totalPiutang = daftar.reduce((s, t) => s + t.piutang, 0);

  function pilih(t: TransaksiRiwayat) {
    setTerpilih(t);
    setNominal(String(t.piutang));
    setSukses(null);
  }

  async function konfirmasi() {
    if (!terpilih) return;
    const nilai = Number(nominal);
    if (!Number.isFinite(nilai) || nilai <= 0) return;
    if (nilai > terpilih.piutang) return;

    try {
      const hasil = await bayarPiutang.mutateAsync({
        nomor: terpilih.nomor,
        nominal: nilai,
        metode,
      });

      setSukses({
        nomor: terpilih.nomor,
        nominal: nilai,
        sisa: Math.max(0, hasil?.piutang ?? terpilih.piutang - nilai),
      });
    } catch {
      // Pesan galat sudah tampil lewat state mutation; jangan biarkan promise
      // rejection menggantung tanpa penanganan.
    }
  }

  if (sukses) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
        <div className="panel w-full max-w-sm p-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-7" aria-hidden />
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted">
            Piutang diterima
          </p>
          <p className="text-2xl font-black text-brand">{sukses.nomor}</p>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Diterima</dt>
              <dd className="font-bold text-emerald-600">
                <MoneyDisplay value={sukses.nominal} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Sisa piutang</dt>
              <dd className="font-semibold">
                <MoneyDisplay value={sukses.sisa} />
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() =>
              cetakKuitansi(toko, {
                nomor: sukses.nomor,
                waktu: new Date().toISOString(),
                kasir,
                shiftId,
                pelanggan: terpilih?.pelanggan,
                nominal: sukses.nominal,
                metode,
                sisaPiutang: sukses.sisa,
              })
            }
            className="btn-secondary mt-4 w-full"
          >
            <ReceiptText className="size-4" aria-hidden /> Cetak Kuitansi
          </button>
          <button type="button" onClick={onClose} className="btn-primary mt-2 w-full">
            Selesai
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="panel max-h-[90vh] w-full max-w-2xl overflow-y-auto p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-black text-brand">
              <HandCoins className="size-5" aria-hidden />
              Terima Piutang
            </h2>
            <p className="mt-1 text-xs text-muted">
              Tagih sisa piutang dari faktur sebelumnya. Kasir {kasir} · Shift {shiftId}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Total piutang</p>
            <MoneyDisplay value={totalPiutang} className="text-lg font-black text-brand" />
          </div>
        </div>

        {riwayat.isLoading && (
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-muted">
            Memuat daftar piutang...
          </p>
        )}

        {!riwayat.isLoading && daftar.length === 0 && (
          <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            Tidak ada piutang yang perlu ditagih — semua faktur sudah lunas.
          </p>
        )}

        {daftar.length > 0 && (
          <>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-white px-3">
              <Search className="size-4 text-muted" aria-hidden />
              <input
                className="w-full bg-transparent py-2 text-sm outline-none"
                placeholder="Cari nomor faktur atau nama pelanggan"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
              />
            </div>

            <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {tampil.map((t) => (
                <li key={t.nomor}>
                  <button
                    type="button"
                    onClick={() => pilih(t)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                      terpilih?.nomor === t.nomor
                        ? "border-brand bg-brand/5"
                        : "border-line bg-white hover:border-brand/30"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand">{t.nomor}</p>
                      <p className="truncate text-xs text-muted">
                        {t.pelanggan ?? "Tanpa nama"} ·{" "}
                        {new Date(t.waktu).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <MoneyDisplay value={t.piutang} className="shrink-0 font-bold text-amber-600" />
                  </button>
                </li>
              ))}
              {tampil.length === 0 && (
                <li className="py-6 text-center text-sm text-muted">
                  Tidak ada faktur yang cocok dengan pencarian.
                </li>
              )}
            </ul>
          </>
        )}

        {terpilih && (
          <div className="mt-5 space-y-3 rounded-2xl border border-line bg-slate-50/70 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Faktur</span>
              <span className="font-semibold text-brand">{terpilih.nomor}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Sisa piutang</span>
              <MoneyDisplay value={terpilih.piutang} className="font-bold text-amber-600" />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink" htmlFor="nominal-piutang">
                Nominal diterima
              </label>
              <input
                id="nominal-piutang"
                type="number"
                min={0}
                max={terpilih.piutang}
                className="input mt-1 text-right text-lg font-bold tabular-nums"
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
              />
              {Number(nominal) > terpilih.piutang && (
                <p className="mt-1 text-xs font-semibold text-rose-600">
                  Nominal melebihi sisa piutang.
                </p>
              )}
            </div>

            <div>
              <span className="text-xs font-semibold text-ink">Metode</span>
              <div className="mt-1.5 flex gap-2">
                {(
                  [
                    { id: "tunai", label: "Tunai" },
                    { id: "transfer", label: "Transfer bank" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetode(m.id)}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                      metode === m.id
                        ? "border-brand bg-brand text-white"
                        : "border-line bg-white text-ink hover:border-brand/40"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {bayarPiutang.isError && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {String(bayarPiutang.error)}
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={konfirmasi}
            disabled={
              !terpilih ||
              bayarPiutang.isPending ||
              !(Number(nominal) > 0) ||
              Number(nominal) > (terpilih?.piutang ?? 0)
            }
            className="btn-primary flex-1 py-3 text-base disabled:cursor-not-allowed disabled:opacity-40"
          >
            <HandCoins className="size-4" aria-hidden />
            {bayarPiutang.isPending ? "Memproses..." : "Terima Pembayaran"}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary py-3">
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
