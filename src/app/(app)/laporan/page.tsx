"use client";

import { useMemo, useRef, useState } from "react";
import {
  Download,
  FileText,
  Store,
  TrendingUp,
  Warehouse,
  BookOpen,
  Activity,
  CreditCard,
  BarChart3,
} from "lucide-react";
import type {
  AkunSaldo,
  ArApTurnover,
  Biaya,
  CashConversionCycle,
  Dupont,
  HealthIndicator,
  HealthSummary,
  InventoryTurnover,
  JurnalEntry,
  LabaRugi,
  LiquidityRatio,
  Product,
  ProductPerformance,
  ProductPerformanceRankings,
  ProfitabilityRatio,
  Solvency,
  TransaksiRiwayat,
  WorkingCapital,
  WorkingCapitalTurnover,
} from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { KpiCard } from "@/components/kpi-card";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { KpiSkeleton, TableSkeleton } from "@/components/skeleton";
import { api } from "@/lib/api/client";
import { API_BASE_URL, BUSINESS_ID } from "@/lib/api/live";
import {
  useAkun,
  useArTurnover,
  useApTurnover,
  useBiaya,
  useCashConversionCycle,
  useCashRatio,
  useCurrentRatio,
  useHealthSummary,
  useInventoryTurnover,
  useJurnal,
  useLabaRugi,
  useProfitability,
  useProductPerformance,
  useProductPerformanceRankings,
  useSolvency,
  useWorkingCapital,
  useWorkingCapitalTurnover,
  useProducts,
  useRiwayatTransaksi,
} from "@/hooks/queries";

type Tab = "penjualan" | "laba-rugi" | "neraca-saldo" | "jurnal" | "beban" | "analisis";

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "penjualan", label: "Penjualan", icon: <TrendingUp className="size-4" aria-hidden /> },
  { id: "laba-rugi", label: "Laba Rugi", icon: <FileText className="size-4" aria-hidden /> },
  { id: "neraca-saldo", label: "Neraca Saldo", icon: <BookOpen className="size-4" aria-hidden /> },
  { id: "jurnal", label: "Jurnal", icon: <Activity className="size-4" aria-hidden /> },
  { id: "beban", label: "Beban", icon: <CreditCard className="size-4" aria-hidden /> },
  { id: "analisis", label: "Analisis", icon: <BarChart3 className="size-4" aria-hidden /> },
];

type PenjualanHarian = { tanggal: string; jumlah: number; omzet: number };

export default function LaporanPage() {
  const [tab, setTab] = useState<Tab>("penjualan");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [tgl, setTgl] = useState("");

  const riwayat = useRiwayatTransaksi();
  const products = useProducts();
  const labaRugi = useLabaRugi();
  const akun = useAkun();
  const jurnal = useJurnal();
  const biaya = useBiaya();

  // Analytics hooks
  const profitability = useProfitability(dari, sampai);
  const inventoryTurnover = useInventoryTurnover(dari, sampai);
  const arTurnover = useArTurnover(dari, sampai);
  const apTurnover = useApTurnover(dari, sampai);
  const workingCapital = useWorkingCapital(tgl);
  const workingCapitalTurnover = useWorkingCapitalTurnover(dari, sampai);
  const currentRatio = useCurrentRatio(tgl);
  const cashRatio = useCashRatio(tgl);
  const solvency = useSolvency(tgl);
  const cashConversionCycle = useCashConversionCycle(dari, sampai);
  const healthSummary = useHealthSummary(tgl, dari, sampai);
  const productPerformance = useProductPerformance(dari, sampai);
  const productRankings = useProductPerformanceRankings(dari, sampai);

  const transaksi = useMemo(() => {
    const semua = riwayat.data ?? [];
    return semua.filter((t) => {
      if (t.status === "dibatalkan") return false;
      const hari = t.waktu.slice(0, 10);
      if (dari && hari < dari) return false;
      if (sampai && hari > sampai) return false;
      return true;
    });
  }, [riwayat.data, dari, sampai]);
  const daftarProduk = (products.data ?? []).filter((p) => p.status === "aktif");

  const omzetTotal = transaksi.reduce((s, t) => s + t.total, 0);
  const nilaiPersediaan = daftarProduk.reduce((s, p) => s + p.stok * p.hargaBeli, 0);
  const perHarian = agregasiHarian(transaksi);

  const memuatPenjualan = riwayat.isLoading || products.isLoading;
  const memuatLabaRugi = labaRugi.isLoading;
  const memuatNeraca = akun.isLoading;
  const memuatJurnal = jurnal.isLoading;
  const memuatBeban = biaya.isLoading;
  const memuatAnalisis =
    profitability.isPending ||
    inventoryTurnover.isPending ||
    arTurnover.isPending ||
    apTurnover.isPending ||
    workingCapital.isPending ||
    workingCapitalTurnover.isPending ||
    currentRatio.isPending ||
    cashRatio.isPending ||
    solvency.isPending ||
    cashConversionCycle.isPending ||
    healthSummary.isPending ||
    productPerformance.isPending ||
    productRankings.isPending;

  const kolomHarian: Column<PenjualanHarian>[] = [
    { key: "tanggal", header: "Tanggal", render: (r) => <span className="font-medium">{r.tanggal}</span> },
    { key: "jumlah", header: "Jumlah transaksi", align: "center", render: (r) => r.jumlah },
    { key: "omzet", header: "Omzet", align: "right", render: (r) => <MoneyDisplay value={r.omzet} className="font-semibold" /> },
  ];

  const kolomPersediaan: Column<Product>[] = [
    { key: "sku", header: "SKU", render: (r) => <span className="font-mono text-xs text-muted">{r.sku}</span> },
    { key: "nama", header: "Produk", render: (r) => <span className="font-medium">{r.nama}</span> },
    { key: "stok", header: "Stok", align: "center", render: (r) => `${r.stok} ${r.satuan}` },
    { key: "hargaBeli", header: "Harga beli", align: "right", render: (r) => <MoneyDisplay value={r.hargaBeli} /> },
    {
      key: "nilai",
      header: "Nilai persediaan",
      align: "right",
      render: (r) => <MoneyDisplay value={r.stok * r.hargaBeli} className="font-semibold" />,
    },
  ];

  const kolomAkun: Column<AkunSaldo>[] = [
    { key: "akun", header: "Akun", render: (r) => <span className="font-medium">{r.akun}</span> },
    { key: "debit", header: "Debit", align: "right", render: (r) => <MoneyDisplay value={r.debit} /> },
    { key: "kredit", header: "Kredit", align: "right", render: (r) => <MoneyDisplay value={r.kredit} /> },
    { key: "saldo", header: "Saldo", align: "right", render: (r) => <MoneyDisplay value={r.saldo} className="font-bold text-brand" /> },
  ];

  const kolomJurnal: Column<JurnalEntry>[] = [
    { key: "waktu", header: "Tanggal", render: (r) => <span className="font-medium">{new Date(r.waktu).toLocaleDateString("id-ID")}</span> },
    { key: "keterangan", header: "Keterangan", render: (r) => <span className="font-medium">{r.keterangan}</span> },
    { key: "ref", header: "Ref", render: (r) => <span className="text-xs text-muted">{r.ref}</span> },
    { key: "debit", header: "Debit", align: "right", render: (r) => <MoneyDisplay value={r.baris.reduce((s, b) => s + b.debit, 0)} /> },
    { key: "kredit", header: "Kredit", align: "right", render: (r) => <MoneyDisplay value={r.baris.reduce((s, b) => s + b.kredit, 0)} /> },
  ];

  const kolomBeban: Column<Biaya>[] = [
    { key: "waktu", header: "Tanggal", render: (r) => <span className="font-medium">{new Date(r.waktu).toLocaleDateString("id-ID")}</span> },
    { key: "kategori", header: "Kategori", render: (r) => <span className="font-medium">{r.kategori}</span> },
    { key: "nominal", header: "Nominal", align: "right", render: (r) => <MoneyDisplay value={r.nominal} /> },
    { key: "metode", header: "Metode", align: "center", render: (r) => (r.metode === "tunai" ? "Tunai" : "Transfer") },
    { key: "catatan", header: "Catatan", render: (r) => <span className="text-xs text-muted">{r.catatan ?? "—"}</span> },
  ];

  function eksporCsv() {
    const head = "nomor,waktu,kasir,pelanggan,total,pajak,piutang,status";
    const rows = transaksi.map((t) =>
      [t.nomor, t.waktu, t.kasir, t.pelanggan ?? "", t.total, t.pajak, t.piutang, t.status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(["\uFEFF" + [head, ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `laporan-penjualan-${dari || "semua"}-${sampai || "semua"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function eksporNeracaSaldo() {
    if (!dari || !sampai) {
      alert("Pilih rentang tanggal Dari dan Sampai sebelum mengekspor.");
      return;
    }
    const url = `${API_BASE_URL}/api/reports/trial-balance/export?fromDate=${dari}&toDate=${sampai}&format=csv`;
    try {
      const res = await fetch(url, { headers: { "X-Business-Id": BUSINESS_ID } });
      if (!res.ok) throw new Error("Gagal mengekspor neraca saldo.");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `neraca-saldo-${dari}-${sampai}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      alert(String(err));
    }
  }

  const totalDebit = akun.data?.reduce((s, a) => s + a.debit, 0) ?? 0;
  const totalKredit = akun.data?.reduce((s, a) => s + a.kredit, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Laporan"
        description="Ringkasan kinerja usaha: penjualan, laba rugi, neraca saldo, jurnal, dan beban."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors border" +
              (tab === t.id ? " border-brand bg-brand text-white" : " border-line bg-white text-muted hover:text-ink")
            }
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="panel mb-4 flex flex-wrap items-end gap-2.5 p-4">
        <FormField label="Dari">
          <input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="input w-36" />
        </FormField>
        <FormField label="Sampai">
          <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="input w-36" />
        </FormField>
        {tab === "penjualan" && (
          <button type="button" onClick={eksporCsv} className="btn-secondary">
            <Download className="size-4" aria-hidden /> Ekspor CSV
          </button>
        )}
        {tab === "neraca-saldo" && (
          <button type="button" onClick={eksporNeracaSaldo} className="btn-secondary">
            <Download className="size-4" aria-hidden /> Ekspor Neraca Saldo
          </button>
        )}
      </div>

      {tab === "penjualan" && (
        <>
          {memuatPenjualan ? (
            <KpiSkeleton kolom={3} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard
                label="Omzet total"
                value={<MoneyDisplay value={omzetTotal} />}
                hint={`${transaksi.length} transaksi`}
                tone="navy"
                icon={<TrendingUp className="size-4" aria-hidden />}
              />
              <KpiCard
                label="Nilai persediaan"
                value={<MoneyDisplay value={nilaiPersediaan} />}
                hint={`${daftarProduk.length} produk aktif`}
                tone="violet"
                icon={<Warehouse className="size-4" aria-hidden />}
              />
              <KpiCard
                label="Rata-rata per transaksi"
                value={<MoneyDisplay value={transaksi.length ? Math.round(omzetTotal / transaksi.length) : 0} />}
                tone="emerald"
                icon={<Store className="size-4" aria-hidden />}
              />
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="panel p-4">
              <h2 className="mb-3 px-1 text-sm font-bold text-brand">Penjualan per hari</h2>
              <DataTable
                columns={kolomHarian}
                rows={perHarian}
                rowKey={(r) => r.tanggal}
                loading={memuatPenjualan}
                skeletonRows={4}
                empty="Belum ada penjualan."
              />
            </div>
            <div className="panel p-4">
              <h2 className="mb-3 px-1 text-sm font-bold text-brand">Nilai persediaan (stok × harga beli)</h2>
              <DataTable
                columns={kolomPersediaan}
                rows={daftarProduk}
                rowKey={(r) => r.id}
                loading={memuatPenjualan}
                skeletonRows={4}
                empty="Belum ada produk."
              />
            </div>
          </div>
        </>
      )}

      {tab === "laba-rugi" && (
        <>
          {memuatLabaRugi ? (
            <KpiSkeleton kolom={5} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                <KpiCard
                  label="Pendapatan"
                  value={<MoneyDisplay value={labaRugi.data?.pendapatan ?? 0} />}
                  tone="emerald"
                  icon={<TrendingUp className="size-4" aria-hidden />}
                />
                <KpiCard
                  label="HPP"
                  value={<MoneyDisplay value={labaRugi.data?.hpp ?? 0} />}
                  tone="rose"
                  icon={<Warehouse className="size-4" aria-hidden />}
                />
                <KpiCard
                  label="Beban Operasional"
                  value={<MoneyDisplay value={labaRugi.data?.biaya ?? 0} />}
                  tone="rose"
                  icon={<CreditCard className="size-4" aria-hidden />}
                />
                <KpiCard
                  label="Pajak"
                  value={<MoneyDisplay value={labaRugi.data?.pajak ?? 0} />}
                  tone="violet"
                  icon={<FileText className="size-4" aria-hidden />}
                />
                <KpiCard
                  label="Laba Bersih"
                  value={<MoneyDisplay value={labaRugi.data?.laba ?? 0} className="font-black" />}
                  tone={((labaRugi.data?.laba ?? 0) >= 0 ? "emerald" : "rose")}
                  icon={<Store className="size-4" aria-hidden />}
                />
              </div>
              <div className="mt-4 panel p-4">
                <h2 className="mb-3 px-1 text-sm font-bold text-brand">Rincian Laba Rugi</h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left py-2 text-muted text-xs">Komponen</th>
                      <th className="text-right py-2 text-muted text-xs">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-line/60 last:border-0">
                      <td className="py-2">Pendapatan</td>
                      <td className="py-2 text-right font-medium"><MoneyDisplay value={labaRugi.data?.pendapatan ?? 0} /></td>
                    </tr>
                    <tr className="border-b border-line/60 last:border-0">
                      <td className="py-2">Harga Pokok Penjualan</td>
                      <td className="py-2 text-right font-medium text-rose-600"><MoneyDisplay value={labaRugi.data?.hpp ?? 0} /></td>
                    </tr>
                    <tr className="border-b border-line/60 last:border-0">
                      <td className="py-2">Beban Operasional</td>
                      <td className="py-2 text-right font-medium text-amber-600"><MoneyDisplay value={labaRugi.data?.biaya ?? 0} /></td>
                    </tr>
                    <tr className="border-b border-line/60 last:border-0">
                      <td className="py-2">Pajak</td>
                      <td className="py-2 text-right font-medium text-violet-600"><MoneyDisplay value={labaRugi.data?.pajak ?? 0} /></td>
                    </tr>
                    <tr className="border-b border-line/60 last:border-0 font-bold">
                      <td className="py-2">Laba Bersih</td>
                      <td className="py-2 text-right"><MoneyDisplay value={labaRugi.data?.laba ?? 0} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {tab === "neraca-saldo" && (
        <>
          {memuatNeraca ? (
            <TableSkeleton kolom={4} baris={6} />
          ) : (
            <div className="panel p-4">
              <h2 className="mb-3 px-1 text-sm font-bold text-brand">Neraca Saldo per Akun</h2>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-ink">Total Debit</span>
                <span className="text-sm font-mono text-right tabular-nums font-bold text-brand"><MoneyDisplay value={totalDebit} /></span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-ink">Total Kredit</span>
                <span className="text-sm font-mono text-right tabular-nums font-bold text-brand"><MoneyDisplay value={totalKredit} /></span>
              </div>
              <DataTable
                columns={kolomAkun}
                rows={akun.data ?? []}
                rowKey={(r) => r.akun}
                loading={memuatNeraca}
                skeletonRows={6}
                empty="Belum ada data akun."
              />
            </div>
          )}
        </>
      )}

      {tab === "jurnal" && (
        <>
          {memuatJurnal ? (
            <TableSkeleton kolom={5} baris={6} />
          ) : (
            <div className="panel p-4">
              <h2 className="mb-3 px-1 text-sm font-bold text-brand">Jurnal Umum</h2>
              <DataTable
                columns={kolomJurnal}
                rows={jurnal.data ?? []}
                rowKey={(r) => r.id}
                loading={memuatJurnal}
                skeletonRows={6}
                empty="Belum ada jurnal."
              />
            </div>
          )}
        </>
      )}

      {tab === "beban" && (
        <>
          {memuatBeban ? (
            <TableSkeleton kolom={5} baris={6} />
          ) : (
            <>
              <div className="panel p-4">
                <h2 className="mb-3 px-1 text-sm font-bold text-brand">Beban Operasional</h2>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-ink">Total Beban</span>
                  <span className="text-sm font-mono text-right tabular-nums font-bold text-rose-600">
                    <MoneyDisplay value={biaya.data?.reduce((s, b) => s + b.nominal, 0) ?? 0} />
                  </span>
                </div>
                <DataTable
                  columns={kolomBeban}
                  rows={biaya.data ?? []}
                  rowKey={(r) => r.id}
                  loading={memuatBeban}
                  skeletonRows={6}
                  empty="Belum ada beban."
                />
              </div>
            </>
          )}
        </>
      )}

      {tab === "analisis" && (
        <>
          {memuatAnalisis ? (
            <KpiSkeleton kolom={5} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Return on Equity"
                  value={`${((profitability.data?.roe ?? 0) * 100).toFixed(1)}%`}
                  hint={profitability.data?.roeAssessment.explanation ?? "-"}
                  tone={profitability.data?.roeAssessment.rating === "BAIK" ? "emerald" : "rose"}
                  icon={<TrendingUp className="size-4" aria-hidden />}
                />
                <KpiCard
                  label="Margin Laba Bersih"
                  value={`${((profitability.data?.netProfitMargin ?? 0) * 100).toFixed(1)}%`}
                  hint={profitability.data?.netProfitMarginAssessment.explanation ?? "-"}
                  tone={profitability.data?.netProfitMarginAssessment.rating === "BAIK" ? "emerald" : "rose"}
                  icon={<FileText className="size-4" aria-hidden />}
                />
                <KpiCard
                  label="Current Ratio"
                  value={(currentRatio.data?.ratio ?? 0).toFixed(2)}
                  hint={currentRatio.data?.assessment.explanation ?? "-"}
                  tone={currentRatio.data?.assessment.rating === "BAIK" ? "emerald" : "rose"}
                  icon={<Store className="size-4" aria-hidden />}
                />
                <KpiCard
                  label="Cash Conversion Cycle"
                  value={`${(cashConversionCycle.data?.cashConversionCycleDays ?? 0).toFixed(0)} hari`}
                  hint={cashConversionCycle.data?.assessment.explanation ?? "-"}
                  tone={cashConversionCycle.data?.assessment.rating === "BAIK" ? "emerald" : "rose"}
                  icon={<Activity className="size-4" aria-hidden />}
                />
                <KpiCard
                  label="Verdict Umum"
                  value={healthSummary.data?.overallVerdict ?? "-"}
                  hint={healthSummary.data?.overallExplanation ?? "-"}
                  tone={healthSummary.data?.overallVerdict === "SEHAT" ? "emerald" : "rose"}
                  icon={<BookOpen className="size-4" aria-hidden />}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="panel p-4">
                  <h2 className="mb-3 px-1 text-sm font-bold text-brand">Rasio Profitabilitas</h2>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="text-left py-2 text-muted text-xs">Rasio</th>
                        <th className="text-right py-2 text-muted text-xs">Nilai</th>
                        <th className="text-right py-2 text-muted text-xs">Asesmen</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-line/60 last:border-0">
                        <td className="py-2">Return on Equity</td>
                        <td className="py-2 text-right font-medium">
                          {(profitability.data?.roe ?? 0).toFixed(3)}
                        </td>
                        <td className="py-2 text-right text-xs">
                          <span className={profitability.data?.roeAssessment.rating === "BAIK" ? "text-emerald-600" : "text-rose-600"}>
                            {profitability.data?.roeAssessment.rating}
                          </span>
                        </td>
                      </tr>
                      <tr className="border-b border-line/60 last:border-0">
                        <td className="py-2">Return on Assets</td>
                        <td className="py-2 text-right font-medium">
                          {(profitability.data?.roa ?? 0).toFixed(3)}
                        </td>
                        <td className="py-2 text-right text-xs">
                          <span className={profitability.data?.roaAssessment.rating === "BAIK" ? "text-emerald-600" : "text-rose-600"}>
                            {profitability.data?.roaAssessment.rating}
                          </span>
                        </td>
                      </tr>
                      <tr className="border-b border-line/60 last:border-0">
                        <td className="py-2">Net Profit Margin</td>
                        <td className="py-2 text-right font-medium">
                          {(profitability.data?.netProfitMargin ?? 0).toFixed(3)}
                        </td>
                        <td className="py-2 text-right text-xs">
                          <span className={profitability.data?.netProfitMarginAssessment.rating === "BAIK" ? "text-emerald-600" : "text-rose-600"}>
                            {profitability.data?.netProfitMarginAssessment.rating}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="panel p-4">
                  <h2 className="mb-3 px-1 text-sm font-bold text-brand">Rasio Likuiditas</h2>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="text-left py-2 text-muted text-xs">Rasio</th>
                        <th className="text-right py-2 text-muted text-xs">Nilai</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-line/60 last:border-0">
                        <td className="py-2">Current Ratio</td>
                        <td className="py-2 text-right font-medium">
                          {(currentRatio.data?.ratio ?? 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-b border-line/60 last:border-0">
                        <td className="py-2">Cash Ratio</td>
                        <td className="py-2 text-right font-medium">
                          {(cashRatio.data?.ratio ?? 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-b border-line/60 last:border-0">
                        <td className="py-2">Cash Conversion Cycle</td>
                        <td className="py-2 text-right font-medium">
                          {(cashConversionCycle.data?.cashConversionCycleDays ?? 0).toFixed(1)} hari
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="panel p-4">
                  <h2 className="mb-3 px-1 text-sm font-bold text-brand">Rasio Solvabilitas &amp; Turnover</h2>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="text-left py-2 text-muted text-xs">Rasio</th>
                        <th className="text-right py-2 text-muted text-xs">Nilai</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-line/60 last:border-0">
                        <td className="py-2">Debt to Assets</td>
                        <td className="py-2 text-right font-medium">
                          {(solvency.data?.debtToAssets ?? 0).toFixed(3)}
                        </td>
                      </tr>
                      <tr className="border-b border-line/60 last:border-0">
                        <td className="py-2">Inventory Turnover</td>
                        <td className="py-2 text-right font-medium">
                          {(inventoryTurnover.data?.turnoverRatio ?? 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-b border-line/60 last:border-0">
                        <td className="py-2">AR Turnover</td>
                        <td className="py-2 text-right font-medium">
                          {(arTurnover.data?.turnoverRatio ?? 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-b border-line/60 last:border-0">
                        <td className="py-2">AP Turnover</td>
                        <td className="py-2 text-right font-medium">
                          {(apTurnover.data?.turnoverRatio ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 panel p-4">
                <h2 className="mb-3 px-1 text-sm font-bold text-brand">Top 5 Produk (Revenue)</h2>
                <DataTable
                  columns={[
                    { key: "nama", header: "Produk", render: (r) => <span className="font-medium">{r.productName}</span> },
                    { key: "qty", header: "Terjual", align: "right", render: (r) => r.totalQuantitySold.toFixed(0) },
                    { key: "revenue", header: "Revenue", align: "right", render: (r) => <MoneyDisplay value={r.totalRevenue} /> },
                    { key: "margin", header: "Margin", align: "right", render: (r) => `${r.marginPercentage.toFixed(1)}%` },
                  ]}
                  rows={productRankings.data?.topRevenue ?? []}
                  rowKey={(r) => r.productId}
                  loading={productRankings.isPending}
                  skeletonRows={5}
                  empty="Belum ada data produk."
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function agregasiHarian(transaksi: TransaksiRiwayat[]): PenjualanHarian[] {
  const map = new Map<string, PenjualanHarian>();
  for (const t of transaksi) {
    const tanggal = new Date(t.waktu).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    const existing = map.get(tanggal) ?? { tanggal, jumlah: 0, omzet: 0 };
    existing.jumlah += 1;
    existing.omzet += t.total;
    map.set(tanggal, existing);
  }
  return [...map.values()].reverse();
}
