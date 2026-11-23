"use client";

import { useMemo, useState } from "react";
import { Download, Eye, RotateCcw, Search, XCircle, CheckCircle2 } from "lucide-react";
import type { ReturInput, ReturPenjualan, TransaksiRiwayat } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useRiwayatRetur, useRiwayatTransaksi, useTransaksiMutations } from "@/hooks/queries";
import { useCariAwal } from "@/hooks/use-cari-awal";
import { api, API_MODE } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import { useToko } from "@/lib/store/toko";
import { useFilterPreset, type FilterPreset } from "@/lib/store/filter-preset";
import { tanggalLokal } from "@/lib/format";
import { cetakStruk, kirimStrukWa } from "@/lib/struk";
import { cn } from "@/lib/utils";

const STATUS_TONE = {
  lunas: "success",
  menunggu_pembayaran: "warning",
  menunggu_persetujuan: "warning",
  dibayar_sebagian: "warning",
  dibatalkan: "danger",
} as const;

const STATUS_LABEL = {
  lunas: "Lunas",
  menunggu_pembayaran: "Menunggu pembayaran",
  menunggu_persetujuan: "Menunggu persetujuan",
  dibayar_sebagian: "Sebagian (piutang)",
  dibatalkan: "Dibatalkan",
} as const;

export default function RiwayatPage() {
  const [tab, setTab] = useState<"transaksi" | "retur">("transaksi");
  const riwayat = useRiwayatTransaksi();
  const { batal } = useTransaksiMutations();
  const user = useAuth((s) => s.user);
  const [keyword, setKeyword] = useCariAwal();
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [statusFilter, setStatusFilter] = useState<"semua" | TransaksiRiwayat["status"]>("semua");
  const [metodeFilter, setMetodeFilter] = useState<"semua" | "tunai" | "transfer" | "qris">("semua");
  const [detail, setDetail] = useState<TransaksiRiwayat | null>(null);
  const [targetVoid, setTargetVoid] = useState<TransaksiRiwayat | null>(null);
  const [targetRetur, setTargetRetur] = useState<TransaksiRiwayat | null>(null);
  const [targetKonfirmasi, setTargetKonfirmasi] = useState<TransaksiRiwayat | null>(null);

  const filterPreset = useFilterPreset();
  const [simpanBuka, setSimpanBuka] = useState(false);
  const [namaPreset, setNamaPreset] = useState("");

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return (riwayat.data ?? []).filter((t) => {
      const hari = tanggalLokal(t.waktu);
      if (dari && hari < dari) return false;
      if (sampai && hari > sampai) return false;
      if (statusFilter !== "semua" && t.status !== statusFilter) return false;
      if (metodeFilter !== "semua") {
        const metode = (t.pembayaran ?? []).map((p) => p.metode);
        if (!metode.includes(metodeFilter)) return false;
      }
      return (
        !q ||
        t.nomor.toLowerCase().includes(q) ||
        t.kasir.toLowerCase().includes(q) ||
        (t.pelanggan ?? "").toLowerCase().includes(q)
      );
    });
  }, [riwayat.data, keyword, dari, sampai, statusFilter, metodeFilter]);

  function terapkanPreset(preset: "hari-ini" | "7-hari" | "bulan-ini" | "belum-lunas") {
    const hari = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (preset === "belum-lunas") {
      setStatusFilter("dibayar_sebagian");
      setMetodeFilter("semua");
      return;
    }
    setStatusFilter("semua");
    setMetodeFilter("semua");
    if (preset === "hari-ini") {
      setDari(format(hari));
      setSampai(format(hari));
      return;
    }
    if (preset === "7-hari") {
      const mulai = new Date(hari);
      mulai.setDate(mulai.getDate() - 6);
      setDari(format(mulai));
      setSampai(format(hari));
      return;
    }
    setDari(format(new Date(hari.getFullYear(), hari.getMonth(), 1)));
    setSampai(format(hari));
  }

  function resetFilter() {
    setDari("");
    setSampai("");
    setStatusFilter("semua");
    setMetodeFilter("semua");
    setKeyword("");
  }

  function simpanPreset() {
    const nama = namaPreset.trim();
    if (!nama) return;
    filterPreset.simpan({
      nama,
      keyword: keyword.trim(),
      dari,
      sampai,
      statusFilter,
      metodeFilter,
    });
    setNamaPreset("");
    setSimpanBuka(false);
  }

  function terapkanPresetTersimpan(p: FilterPreset) {
    setKeyword(p.keyword);
    setDari(p.dari);
    setSampai(p.sampai);
    setStatusFilter(p.statusFilter);
    setMetodeFilter(p.metodeFilter);
  }

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
            {r.status === "menunggu_pembayaran" &&
              (r.pembayaran ?? []).some(
                (p) => p.metode === "qris" && (p.status ?? "").toUpperCase() !== "POSTED",
              ) && (
              <button
                type="button"
                onClick={() => setTargetKonfirmasi(r)}
                title="Konfirmasi pembayaran digital"
                className="flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-50"
              >
                <CheckCircle2 className="size-3.5" aria-hidden /> Konfirmasi
              </button>
            )}
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
          <FormField label="Status">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "semua" | TransaksiRiwayat["status"])}
              className="input w-44"
            >
              <option value="semua">Semua status</option>
              <option value="lunas">Lunas</option>
              <option value="dibayar_sebagian">Sebagian (piutang)</option>
              <option value="menunggu_pembayaran">Menunggu pembayaran</option>
              <option value="menunggu_persetujuan">Menunggu persetujuan</option>
              <option value="dibatalkan">Dibatalkan</option>
            </select>
          </FormField>
          <FormField label="Metode bayar">
            <select
              value={metodeFilter}
              onChange={(e) => setMetodeFilter(e.target.value as "semua" | "tunai" | "transfer" | "qris")}
              className="input w-40"
            >
              <option value="semua">Semua</option>
              <option value="tunai">Tunai</option>
              <option value="transfer">Transfer</option>
              <option value="qris">QRIS</option>
            </select>
          </FormField>
          <button type="button" onClick={eksporCsv} className="btn-secondary">
            <Download className="size-4" aria-hidden /> Ekspor CSV
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted">Preset:</span>
          {(
            [
              { id: "hari-ini", label: "Hari ini" },
              { id: "7-hari", label: "7 hari terakhir" },
              { id: "bulan-ini", label: "Bulan ini" },
              { id: "belum-lunas", label: "Belum lunas" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => terapkanPreset(p.id)}
              className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={resetFilter}
            className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-rose-300 hover:text-rose-600"
          >
            Reset filter
          </button>
          <button
            type="button"
            onClick={() => setSimpanBuka((v) => !v)}
            className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
          >
            {simpanBuka ? "Tutup" : "Simpan preset"}
          </button>
          {simpanBuka && (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={namaPreset}
                onChange={(e) => setNamaPreset(e.target.value)}
                placeholder="Nama preset"
                className="input h-7 w-32 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    simpanPreset();
                  }
                }}
              />
              <button
                type="button"
                onClick={simpanPreset}
                disabled={!namaPreset.trim()}
                className="rounded-full border border-brand bg-brand px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
              >
                Simpan
              </button>
            </div>
          )}
          {filterPreset.presets.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted">Tersimpan:</span>
              {filterPreset.presets.map((p) => (
                <span
                  key={p.nama}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-muted"
                >
                  <button
                    type="button"
                    onClick={() => terapkanPresetTersimpan(p)}
                    className="hover:text-brand"
                  >
                    {p.nama}
                  </button>
                  <button
                    type="button"
                    onClick={() => filterPreset.hapus(p.nama)}
                    aria-label={`Hapus preset ${p.nama}`}
                    className="text-muted/60 hover:text-rose-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <span className="ml-auto text-xs text-muted">
            Menampilkan {filtered.length} dari {(riwayat.data ?? []).length} transaksi
          </span>
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
      {targetKonfirmasi && (
        <KonfirmasiDigitalDialog t={targetKonfirmasi} onClose={() => setTargetKonfirmasi(null)} />
      )}
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
  const [fakturError, setFakturError] = useState<string | null>(null);
  const [fakturPending, setFakturPending] = useState(false);

  const unduhFaktur = async () => {
    setFakturError(null);
    setFakturPending(true);
    try {
      const blob = await api.transaksi.fakturPdf(t.nomor);
      const url = URL.createObjectURL(blob);
      const tautan = document.createElement("a");
      tautan.href = url;
      tautan.download = `Faktur-${t.nomor}.pdf`;
      document.body.appendChild(tautan);
      tautan.click();
      tautan.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setFakturError(String(err).replace("Error: ", ""));
    } finally {
      setFakturPending(false);
    }
  };

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
        {fakturError && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{fakturError}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => cetakStruk(useToko.getState().profil, { ...t, waktu: t.waktu, pembayaran: t.pembayaran })} className="btn-secondary flex-1">
            Cetak Struk
          </button>
          <button
            type="button"
            onClick={() => {
              const nomor = window.prompt("Nomor WhatsApp pelanggan (format 628...):");
              if (nomor && nomor.trim()) {
                kirimStrukWa(useToko.getState().profil, { ...t, waktu: t.waktu, pembayaran: t.pembayaran }, nomor.trim());
              }
            }}
            className="btn-secondary flex-1"
          >
            Kirim via WA
          </button>
          {API_MODE === "live" && t.status !== "dibatalkan" && (
            <button
              type="button"
              onClick={unduhFaktur}
              disabled={fakturPending}
              className="btn-secondary flex-1 disabled:opacity-40"
            >
              {fakturPending ? "Menyiapkan..." : "Faktur PDF"}
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-primary flex-1">Tutup</button>
        </div>
      </div>
    </div>
  );
}

function KonfirmasiDigitalDialog({ t, onClose }: { t: TransaksiRiwayat; onClose: () => void }) {
  const { konfirmasiDigital } = useTransaksiMutations();
  const user = useAuth((s) => s.user);
  const [error, setError] = useState<string | null>(null);

  const totalDigital =
    (t.pembayaran ?? [])
      .filter((p) => p.metode === "qris")
      .reduce((s, p) => s + p.nominal, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="panel w-full max-w-sm p-7" onClick={(e) => e.stopPropagation()}>
        <h2 className="flex items-center gap-2 font-black text-brand">
          <CheckCircle2 className="size-5 text-amber-500" aria-hidden /> Konfirmasi Pembayaran Digital
        </h2>
        <p className="mt-1 text-xs text-muted">
          Konfirmasi bahwa dana digital untuk transaksi <span className="font-bold text-ink">{t.nomor}</span> sudah
          diterima.
        </p>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5 text-sm">
          <span className="font-semibold text-amber-700">Total QRIS</span>
          <MoneyDisplay value={totalDigital} className="font-black text-amber-700" />
        </div>
        <p className="mt-2 text-xs text-muted">
          Setelah dikonfirmasi, dana berpindah dari penampung gateway ke rekening bank dan transaksi menjadi
          &ldquo;Lunas&rdquo;.
        </p>

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!user) return setError("Sesi tidak ditemukan.");
            konfirmasiDigital.mutate(
              { nomor: t.nomor, user },
              { onSuccess: () => onClose(), onError: (err) => setError(String(err)) },
            );
          }}
        >
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={konfirmasiDigital.isPending} className="btn-primary flex-1 disabled:opacity-40">
              {konfirmasiDigital.isPending ? "Memproses..." : "Ya, Konfirmasi"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Batal
            </button>
          </div>
        </form>
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

  const baris = useMemo(() => {
    const unik = new Map<string, { nama: string; hargaJual: number; qty: number }>();
    for (const i of t.items) {
      const ada = unik.get(i.nama);
      if (ada) ada.qty += i.qty;
      else unik.set(i.nama, { nama: i.nama, hargaJual: i.hargaJual, qty: i.qty });
    }
    return [...unik.values()];
  }, [t.items]);

  const items = baris
    .map((i) => ({ nama: i.nama, qty: Math.min(Math.max(0, Math.floor(qty[i.nama] ?? 0)), i.qty) }))
    .filter((i) => i.qty > 0);

  // Samakan dengan mesin retur: refund = proporsi nilai bruto item yang
  // diretur terhadap bruto transaksi, kali (total - pajak) sebagai penjualan
  // neto, ditambah proporsi pajak yang ikut dibatalkan.
  const grossAsli = t.items.reduce((s, i) => s + i.hargaJual * i.qty, 0);
  const grossReturn = items.reduce((s, it) => {
    const asli = baris.find((b) => b.nama === it.nama);
    return s + (asli?.hargaJual ?? 0) * it.qty;
  }, 0);
  const share = grossAsli > 0 ? grossReturn / grossAsli : 0;
  const netAsli = Math.max(0, t.total - t.pajak);
  const total = Math.round(share * netAsli) + Math.round(share * t.pajak);

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
            {baris.map((i, idx) => (
              <div key={`${i.nama}-${idx}`} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white p-2.5">
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
