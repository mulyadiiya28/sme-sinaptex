"use client";

import { useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import type { TransaksiRiwayat } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { useRiwayatTransaksi } from "@/hooks/queries";

const STATUS_TONE = {
  lunas: "success",
  menunggu_pembayaran: "warning",
  dibayar_sebagian: "warning",
} as const;

const STATUS_LABEL = {
  lunas: "Lunas",
  menunggu_pembayaran: "Menunggu pembayaran",
  dibayar_sebagian: "Sebagian (piutang)",
} as const;

export default function RiwayatPage() {
  const riwayat = useRiwayatTransaksi();
  const [keyword, setKeyword] = useState("");
  const [detail, setDetail] = useState<TransaksiRiwayat | null>(null);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return (riwayat.data ?? []).filter((t) => {
      return (
        !q ||
        t.nomor.toLowerCase().includes(q) ||
        t.kasir.toLowerCase().includes(q) ||
        (t.pelanggan ?? "").toLowerCase().includes(q)
      );
    });
  }, [riwayat.data, keyword]);

  const columns: Column<TransaksiRiwayat>[] = [
    { key: "nomor", header: "Nomor", render: (r) => <span className="font-semibold text-brand">{r.nomor}</span> },
    { key: "waktu", header: "Waktu", render: (r) => (
      <span className="text-muted">{new Date(r.waktu).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</span>
    ) },
    { key: "kasir", header: "Kasir", render: (r) => (
      <span>{r.kasir}{r.pelanggan ? <span className="block text-xs text-muted">pelanggan: {r.pelanggan}</span> : null}</span>
    ) },
    { key: "item", header: "Item", align: "center", render: (r) => r.items.reduce((s, i) => s + i.qty, 0) },
    { key: "total", header: "Total", align: "right", render: (r) => <MoneyDisplay value={r.total} /> },
    { key: "piutang", header: "Piutang", align: "right", render: (r) =>
      r.piutang > 0 ? <MoneyDisplay value={r.piutang} className="font-semibold text-amber-600" /> : "—" },
    { key: "status", header: "Status", align: "center", render: (r) => (
      <StatusBadge label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} />
    ) },
    { key: "aksi", header: "", align: "right", render: (r) => (
      <button type="button" onClick={() => setDetail(r)} className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs">
        <Eye className="size-3.5" aria-hidden /> Detail
      </button>
    ) },
  ];

  return (
    <div>
      <PageHeader
        title="Riwayat Transaksi"
        description="Setiap transaksi tercatat dan dapat ditelusuri — status penjualan dan status pembayaran terpisah."
      />

      <div className="panel p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted/60" aria-hidden />
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari nomor transaksi, kasir, atau pelanggan..."
            className="input pl-9"
          />
        </div>

        {riwayat.isLoading ? (
          <p className="py-12 text-center text-sm text-muted">Memuat riwayat...</p>
        ) : riwayat.isError ? (
          <p className="py-12 text-center text-sm text-rose-600">Gagal memuat riwayat.</p>
        ) : (
          <DataTable columns={columns} rows={filtered} rowKey={(r) => r.nomor} empty="Belum ada transaksi. Mulai dari layar Kasir." className="mt-2" />
        )}
      </div>

      {detail && <DetailDialog t={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function DetailDialog({ t, onClose }: { t: TransaksiRiwayat; onClose: () => void }) {
  const subtotal = t.items.reduce((s, i) => s + i.hargaJual * i.qty - i.diskon, 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="panel max-h-[85vh] w-full max-w-md overflow-y-auto p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-black text-brand">{t.nomor}</h2>
          <StatusBadge label={STATUS_LABEL[t.status]} tone={STATUS_TONE[t.status]} />
        </div>
        <p className="text-xs text-muted">
          {new Date(t.waktu).toLocaleString("id-ID")} · kasir {t.kasir} · shift {t.shiftId}
          {t.pelanggan ? ` · pelanggan ${t.pelanggan}` : ""}
        </p>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {t.items.map((i, idx) => (
              <tr key={idx} className="border-b border-line/60 last:border-0">
                <td className="py-2">
                  {i.nama}
                  <span className="block text-xs text-muted">{i.qty} × <MoneyDisplay value={i.hargaJual} /></span>
                </td>
                <td className="py-2 text-right"><MoneyDisplay value={i.hargaJual * i.qty - i.diskon} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd><MoneyDisplay value={subtotal} /></dd></div>
          {t.diskonTransaksi > 0 && (
            <div className="flex justify-between"><dt className="text-muted">Diskon transaksi</dt><dd className="text-rose-600">-<MoneyDisplay value={t.diskonTransaksi} /></dd></div>
          )}
          <div className="flex items-baseline justify-between border-t border-dashed border-line pt-2">
            <dt className="font-bold text-ink">Total</dt>
            <MoneyDisplay value={t.total} className="text-lg font-black text-brand" />
          </div>
          {t.kembalian > 0 && (
            <div className="flex justify-between"><dt className="text-muted">Kembalian</dt><dd className="text-emerald-600"><MoneyDisplay value={t.kembalian} /></dd></div>
          )}
          {t.piutang > 0 && (
            <div className="flex justify-between"><dt className="text-muted">Piutang</dt><dd className="font-bold text-amber-600"><MoneyDisplay value={t.piutang} /></dd></div>
          )}
        </dl>
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-muted">
          Nantinya panel ini memuat penelusuran ke jurnal engine (audit trail) dan tombol cetak/retur.
        </p>
        <button type="button" onClick={onClose} className="btn-primary mt-4 w-full">Tutup</button>
      </div>
    </div>
  );
}
