"use client";

import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { KpiSkeleton, TableSkeleton } from "@/components/skeleton";
import { usePembelian } from "@/hooks/queries";
import type { PphType } from "@/lib/api/types";
import { unduhCsv } from "@/lib/csv";
import { formatIDR, tanggalLokal } from "@/lib/format";

type BarisPph = {
  nomor: string;
  tanggal: string;
  pemasok: string;
  dpp: number;
  total: number;
  pphType: PphType;
  pphRate: number | null;
  pphAmount: number;
};

const LABEL_PPH: Record<PphType, string> = {
  PPH23: "PPh 23",
  PPH42: "PPh 4(2)",
};

function labelJenis(jenis: PphType) {
  return LABEL_PPH[jenis];
}

function formatRate(rate: number | null) {
  if (rate === null) return "-";
  return `${Number((rate * 100).toFixed(4))}%`;
}

export default function PphPage() {
  const pembelian = usePembelian();
  const [cetak, setCetak] = useState<BarisPph | null>(null);

  // Hanya faktur yang benar-benar memotong PPh: angka dan jenisnya datang dari
  // snapshot engine, bukan estimasi dari tarif global.
  const baris: BarisPph[] = useMemo(() => {
    return (pembelian.data ?? [])
      .filter((p) => p.pphAmount > 0)
      .map((p) => ({
        nomor: p.nomor ?? "-",
        tanggal: p.waktu ?? "",
        pemasok: p.pemasok ?? "-",
        dpp: p.pphBaseAmount,
        total: p.total ?? 0,
        pphType: p.pphType ?? "PPH23",
        pphRate: p.pphRate,
        pphAmount: p.pphAmount,
      }));
  }, [pembelian.data]);

  const totalDpp = baris.reduce((s, b) => s + b.dpp, 0);
  const totalPph = baris.reduce((s, b) => s + b.pphAmount, 0);
  const totalPph23 = baris.filter((b) => b.pphType === "PPH23").reduce((s, b) => s + b.pphAmount, 0);
  const totalPph42 = baris.filter((b) => b.pphType === "PPH42").reduce((s, b) => s + b.pphAmount, 0);

  const kolom: Column<BarisPph>[] = [
    { key: "nomor", header: "No. Faktur", render: (r) => <span className="font-mono text-xs">{r.nomor}</span> },
    { key: "tanggal", header: "Tanggal", render: (r) => <span className="text-xs text-muted">{tanggalLokal(r.tanggal)}</span> },
    { key: "pemasok", header: "Pemasok", render: (r) => <span className="text-sm">{r.pemasok}</span> },
    { key: "dpp", header: "DPP", align: "right", render: (r) => <MoneyDisplay value={r.dpp} /> },
    { key: "jenis", header: "Jenis", render: (r) => <span className="text-xs font-semibold">{labelJenis(r.pphType)}</span> },
    { key: "rate", header: "Rate", align: "right", render: (r) => <span className="tabular-nums text-xs">{formatRate(r.pphRate)}</span> },
    { key: "pph", header: "PPh", align: "right", render: (r) => <MoneyDisplay value={r.pphAmount} /> },
    {
      key: "aksi",
      header: "",
      align: "right",
      render: (r) => (
        <button type="button" className="btn-secondary rounded-lg px-2 py-1 text-xs" onClick={() => setCetak(r)}>
          <Printer className="size-3" aria-hidden /> Bukti potong
        </button>
      ),
    },
  ];

  function ekspor() {
    const header = ["No. Faktur", "Tanggal", "Pemasok", "DPP", "Jenis", "Rate", "PPh", "Total Faktur"];
    const rows = baris.map((b) => [
      b.nomor,
      b.tanggal,
      b.pemasok,
      b.dpp,
      labelJenis(b.pphType),
      b.pphRate === null ? "" : b.pphRate * 100,
      b.pphAmount,
      b.total,
    ]);
    rows.push(["TOTAL", "", "", totalDpp, "", "", totalPph, ""]);
    unduhCsv(`laporan-pph-${new Date().toISOString().slice(0, 10)}.csv`, header, rows);
  }

  function cetakBukti() {
    if (!cetak) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Bukti Potong PPh</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;max-width:640px;margin:0 auto}
h1{font-size:18px;margin:0 0 4px} .muted{color:#64748b;font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:12px} td{padding:6px 0;border-bottom:1px solid #e2e8f0;font-size:13px}
td:last-child{text-align:right;font-weight:600} .total td{font-weight:700;border-top:2px solid #0b2f6e}
</style></head><body>
<h1>Bukti Potong ${labelJenis(cetak.pphType)}</h1>
<p class="muted">Dokumen dicetak dari data faktur pembelian.</p>
<table>
<tr><td>No. Faktur</td><td>${cetak.nomor}</td></tr>
<tr><td>Tanggal</td><td>${tanggalLokal(cetak.tanggal)}</td></tr>
<tr><td>Pemasok</td><td>${cetak.pemasok}</td></tr>
<tr><td>DPP</td><td>${formatIDR(cetak.dpp)}</td></tr>
<tr><td>Jenis</td><td>${labelJenis(cetak.pphType)}</td></tr>
<tr><td>Rate</td><td>${formatRate(cetak.pphRate)}</td></tr>
<tr><td>Total Faktur</td><td>${formatIDR(cetak.total)}</td></tr>
<tr class="total"><td>PPh dipotong</td><td>${formatIDR(cetak.pphAmount)}</td></tr>
</table>
<p class="muted" style="margin-top:16px">Dicetak ${new Date().toLocaleString("id-ID")}</p>
</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  if (pembelian.isLoading) {
    return (
      <div>
        <PageHeader title="PPh (Pajak Penghasilan)" description="PPh yang dipotong dari faktur pembelian." />
        <KpiSkeleton />
        <TableSkeleton baris={6} kolom={8} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="PPh (Pajak Penghasilan)"
        description="PPh 23 dan PPh 4 ayat 2 yang dipotong dari faktur pembelian, sesuai snapshot engine."
        actions={
          <button type="button" className="btn-secondary" onClick={ekspor} disabled={baris.length === 0}>
            <Download className="size-4" aria-hidden /> Ekspor CSV
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <KpiCard label="Jumlah Faktur" value={baris.length} hint="Faktur dengan pemotongan" />
        <KpiCard label="Total DPP" value={<MoneyDisplay value={totalDpp} />} />
        <KpiCard label="PPh 23" value={<MoneyDisplay value={totalPph23} />} />
        <KpiCard label="PPh 4(2)" value={<MoneyDisplay value={totalPph42} />} />
      </div>

      <div className="panel mb-4 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink">Total PPh dipotong</span>
          <MoneyDisplay value={totalPph} className="text-lg font-black text-brand" />
        </div>
        <p className="mt-2 text-xs text-muted">
          Angka di halaman ini adalah snapshot yang disimpan engine saat faktur disubmit — bukan hitungan ulang
          dari tarif hari ini. Untuk memotong PPh, centang opsi PPh di form Buat Pembelian.
        </p>
      </div>

      <DataTable<BarisPph>
        columns={kolom}
        rows={baris}
        rowKey={(r) => r.nomor}
        empty="Belum ada faktur pembelian yang memotong PPh."
        loading={pembelian.isLoading}
      />

      {cetak && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
          <div className="panel w-full max-w-md p-6">
            <h2 className="text-lg font-black text-brand">Cetak bukti potong {cetak.nomor}?</h2>
            <p className="mt-1 text-sm text-muted">Membuka dialog cetak browser.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-primary" onClick={() => { cetakBukti(); setCetak(null); }}>
                <Printer className="size-4" aria-hidden /> Cetak
              </button>
              <button type="button" className="btn-secondary" onClick={() => setCetak(null)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
