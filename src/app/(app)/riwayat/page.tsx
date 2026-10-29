"use client";

import { useMemo, useState } from "react";
import { Download, Eye, RotateCcw, Search, XCircle } from "lucide-react";
import type { ReturInput, ReturPenjualan, TransaksiRiwayat } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useRiwayatRetur, useRiwayatTransaksi, useTransaksiMutations } from "@/hooks/queries";
import { useAuth } from "@/lib/store/auth";
import { useToko } from "@/lib/store/toko";
import { cetakStruk } from "@/lib/struk";
import { cn } from "@/lib/utils";

const STATUS_TONE = {
  lunas: "success",
  menunggu_pembayaran: "warning",
  dibayar_sebagian: "warning",
  dibatalkan: "danger",
} as const;

const STATUS_LABEL = {
  lunas: "Lunas",
  menunggu_pembayaran: "Menunggu pembayaran",
  dibayar_sebagian: "Sebagian (piutang)",
  dibatalkan: "Dibatalkan",
} as const;

export default function RiwayatPage() {
  const [tab, setTab] = useState<"transaksi" | "retur">("transaksi");
  const riwayat = useRiwayatTransaksi();
  const { batal } = useTransaksiMutations();
  const user = useAuth((s) => s.user);
  const [keyword, setKeyword] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [detail, setDetail] = useState<TransaksiRiwayat | null>(null);
  const [targetVoid, setTargetVoid] = useState<TransaksiRiwayat | null>(null);
  const [targetRetur, setTargetRetur] = useState<TransaksiRiwayat | null>(null);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return (riwayat.data ?? []).filter((t) => {
      const hari = t.waktu.slice(0, 10);
      if (dari && hari < dari) return false;
      if (sampai && hari > sampai) return false;
      return (
        !q ||
        t.nomor.toLowerCase().includes(q) ||
        t.kasir.toLowerCase().includes(q) ||
        (t.pelanggan ?? "").toLowerCase().includes(q)
      );
    });
  }, [riwayat.data, keyword, dari, sampai]);

  function eksporCsv() {
    const head = "nomor,waktu,kasir,shift,pelanggan,jumlah_item,subtotal,diskon,pajak,total,kembalian,piutang,status";
    const rows = filtered.map((t) =>
      [
        t.nomor,
        t.waktu,
        t.kasir,
        t.shiftId,
        t.pelanggan ?? "",
        t.items.reduce((s, i) => s + i.qty, 0),
        t.items.reduce((s, i) => s + i.hargaJual * i.qty - i.diskon, 0),
        t.diskonTransaksi,
        t.pajak,
        t.total,
        t.kembalian,
        t.piutang,
        t.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(["\uFEFF" + [head, ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `transaksi-${dari || "semua"}-${sampai || "semua"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

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
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={() => setDetail(r)} className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs">
          <Eye className="size-3.5" aria-hidden /> Detail
        </button>
        {user?.role === "pemilik" && r.status !== "dibatalkan" && (
          <>
            <button
              type="button"
              onClick={() => setTargetRetur(r)}
              title="Retur barang"
              className="flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
            >
              <RotateCcw className="size-3.5" aria-hidden /> Retur
            </button>
            <button
              type="button"
              onClick={() => setTargetVoid(r)}
              title="Batalkan transaksi"
              className="flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            >
              <XCircle className="size-3.5" aria-hidden /> Void
            </button>
          </>
        )}
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader
        title="Riwayat Transaksi"
        description="Setiap transaksi tercatat dan dapat ditelusuri — status penjualan dan status pembayaran terpisah."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["transaksi", "retur"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              tab === id ? "border-brand bg-brand text-white" : "border-line bg-white text-muted hover:text-ink",
            )}
          >
            {id === "transaksi" ? "Transaksi" : "Retur"}
          </button>
        ))}
      </div>

      {tab === "retur" ? (
        <PanelRetur />
      ) : (
      <div className="panel p-4">
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted/60" aria-hidden />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nomor transaksi, kasir, atau pelanggan..."
              className="input pl-9"
            />
          </div>
          <FormField label="Dari">
            <input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="input w-36" />
          </FormField>
          <FormField label="Sampai">
            <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="input w-36" />
          </FormField>
          <button type="button" onClick={eksporCsv} className="btn-secondary">
            <Download className="size-4" aria-hidden /> Ekspor CSV
          </button>
        </div>

        {riwayat.isError ? (
          <p className="py-12 text-center text-sm text-rose-600">Gagal memuat riwayat.</p>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r) => r.nomor}
            loading={riwayat.isLoading}
            empty="Belum ada transaksi. Mulai dari layar Kasir."
            className="mt-2"
          />
        )}
      </div>
      )}

      {detail && <DetailDialog t={detail} onClose={() => setDetail(null)} />}
      {targetVoid && (
        <VoidDialog
          t={targetVoid}
          pending={batal.isPending}
          onClose={() => setTargetVoid(null)}
          onConfirm={() =>
            batal.mutate(
              { nomor: targetVoid.nomor, user: user! },
              { onSuccess: () => setTargetVoid(null), onError: (err) => alert(String(err)) },
            )
          }
        />
      )}
      {targetRetur && <ReturDialog t={targetRetur} onClose={() => setTargetRetur(null)} />}
    </div>
  );
}

function PanelRetur() {
  const retur = useRiwayatRetur();

  const columns: Column<ReturPenjualan>[] = [
    { key: "waktu", header: "Waktu", render: (r) => (
      <span className="text-muted">{new Date(r.waktu).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
    ) },
    { key: "nomor", header: "Nomor retur", render: (r) => <span className="font-semibold text-brand">{r.nomor}</span> },
    { key: "referensi", header: "Ref. transaksi", render: (r) => (
      <span>{r.pelanggan ? `${r.referensi} · ${r.pelanggan}` : r.referensi}</span>
    ) },
    { key: "items", header: "Item", render: (r) => (
      r.items.length > 0
        ? <span>{r.items.map((i) => `${i.qty}× ${i.nama}`).join(", ")}</span>
        : <span className="text-muted">—</span>
    ) },
    { key: "alasan", header: "Alasan", render: (r) => <span className="text-muted">{r.alasan || "—"}</span> },
    { key: "metodeRefund", header: "Refund", align: "center", render: (r) => (
      r.metodeRefund
        ? <StatusBadge label={r.metodeRefund === "tunai" ? "Tunai" : "Transfer"} tone="info" />
        : <span className="text-muted">—</span>
    ) },
    { key: "total", header: "Nominal", align: "right", render: (r) => <MoneyDisplay value={r.total} className="font-semibold text-rose-600" /> },
  ];

  return (
    <div className="panel p-4">
      {retur.isLoading ? (
        <TableSkeleton kolom={7} baris={4} />
      ) : (
        <DataTable columns={columns} rows={retur.data ?? []} rowKey={(r) => r.nomor} empty="Belum ada retur." />
      )}
    </div>
  );
}

function VoidDialog({
  t,
  pending,
  onClose,
  onConfirm,
}: {
  t: TransaksiRiwayat;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-sm p-7">
        <h2 className="flex items-center gap-2 font-black text-brand">
          <XCircle className="size-5 text-rose-600" aria-hidden /> Batalkan {t.nomor}
        </h2>
        <p className="mt-3 text-sm text-muted">
          Transaksi <span className="font-bold text-ink">{t.nomor}</span> senilai{" "}
          <span className="font-bold text-ink">
            <MoneyDisplay value={t.total} />
          </span>{" "}
          akan dibatalkan: stok dikembalikan, jurnal reversal dibentuk, dan riwayat tetap tercatat dengan status
          &ldquo;Dibatalkan&rdquo;.
        </p>
        <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          Aksi sensitif — hanya pemilik toko. Tercatat di audit log dengan nama Anda.
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" disabled={pending} onClick={onConfirm} className="btn-primary flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-40">
            {pending ? "Memproses..." : "Ya, Batalkan"}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Batal
          </button>
        </div>
      </div>
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
          {t.pajak > 0 && (
            <div className="flex justify-between"><dt className="text-muted">Pajak</dt><dd><MoneyDisplay value={t.pajak} /></dd></div>
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
          Jurnal terkait transaksi ini bisa ditelusuri di menu Akuntansi → Jurnal Otomatis (ref: {t.nomor}).
        </p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => cetakStruk(useToko.getState().profil, { ...t, waktu: t.waktu, pembayaran: t.pembayaran })} className="btn-secondary flex-1">
            Cetak Struk
          </button>
          <button type="button" onClick={onClose} className="btn-primary flex-1">Tutup</button>
        </div>
      </div>
    </div>
  );
}

function ReturDialog({ t, onClose }: { t: TransaksiRiwayat; onClose: () => void }) {
  const { retur } = useTransaksiMutations();
  const user = useAuth((s) => s.user);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [alasan, setAlasan] = useState("barang rusak");
  const [metodeRefund, setMetodeRefund] = useState<"tunai" | "transfer">("tunai");
  const [error, setError] = useState<string | null>(null);

  const items = t.items
    .map((i) => ({ nama: i.nama, qty: qty[i.nama] ?? 0 }))
    .filter((i) => i.qty > 0);
  const total = items.reduce((s, it) => {
    const asli = t.items.find((a) => a.nama === it.nama)!;
    return s + asli.hargaJual * it.qty - asli.diskon;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="panel max-h-[90vh] w-full max-w-md overflow-y-auto p-7" onClick={(e) => e.stopPropagation()}>
        <h2 className="flex items-center gap-2 font-black text-brand">
          <RotateCcw className="size-5" aria-hidden /> Retur dari {t.nomor}
        </h2>
        <p className="mt-1 text-xs text-muted">Tentukan jumlah item yang diretur — stok kembali otomatis dan jurnal retur terbentuk.</p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!user) return setError("Sesi tidak ditemukan.");
            const input: ReturInput = { referensi: t.nomor, items, alasan, metodeRefund };
            retur.mutate(
              { input, user },
              { onSuccess: () => onClose(), onError: (err) => setError(String(err)) },
            );
          }}
        >
          <div className="space-y-2">
            {t.items.map((i) => (
              <div key={i.nama} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white p-2.5">
                <div>
                  <p className="text-sm font-semibold text-ink">{i.nama}</p>
                  <p className="text-xs text-muted">dibeli {i.qty} × <MoneyDisplay value={i.hargaJual} /></p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={i.qty}
                  value={qty[i.nama] ?? ""}
                  onChange={(e) => setQty({ ...qty, [i.nama]: Number(e.target.value) })}
                  className="w-20 rounded-lg border border-line px-2 py-1.5 text-right text-sm tabular-nums"
                  placeholder={`0–${i.qty}`}
                />
              </div>
            ))}
          </div>
          <FormField label="Alasan retur">
            <input className="input" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
          </FormField>
          <FormField label="Metode refund">
            <select className="input" value={metodeRefund} onChange={(e) => setMetodeRefund(e.target.value as "tunai" | "transfer")}>
              <option value="tunai">Kembalikan tunai</option>
              <option value="transfer">Transfer / ke rekening</option>
            </select>
          </FormField>
          {total > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5 text-sm">
              <span className="font-semibold text-amber-700">Refund</span>
              <MoneyDisplay value={total} className="font-black text-amber-700" />
            </div>
          )}
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={items.length === 0 || retur.isPending} className="btn-primary flex-1 disabled:opacity-40">
              {retur.isPending ? "Memproses..." : "Proses Retur"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
