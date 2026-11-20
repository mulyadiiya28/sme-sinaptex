"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Calculator, Store, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { MoneyDisplay } from "@/components/money-display";
import { PanelKesehatan } from "@/components/panel-kesehatan";
import { KpiSkeleton, Skeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { PaymentBreakdown } from "@/components/dashboard/payment-breakdown";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import {
  useActiveShift,
  useArAging,
  useProductPerformanceRankings,
  useProducts,
  useRiwayatTransaksi,
} from "@/hooks/queries";
import type { TransaksiRiwayat } from "@/lib/api/types";
import {
  piutangPeriode,
  rentangHariTerakhir,
  ringkasMetodePembayaran,
  ringkasTrenPenjualan,
} from "@/lib/dashboard";
import { tanggalLokal } from "@/lib/format";
import { perluReminder } from "@/lib/reminder";
import { useReminder } from "@/lib/store/reminder";
import { cn } from "@/lib/utils";

const PERIODE = [7, 30, 90] as const;
type Periode = (typeof PERIODE)[number];

/** Dashboard memantau penjualan hari berjalan; 60 detik cukup untuk POS satu toko. */
const INTERVAL_LIVE_MS = 60_000;

export default function DashboardPage() {
  const [periode, setPeriode] = useState<Periode>(30);
  const products = useProducts();
  const shift = useActiveShift();
  const riwayat = useRiwayatTransaksi(INTERVAL_LIVE_MS);
  const aging = useArAging();
  const reminderLog = useReminder((s) => s.log);

  const { dari, sampai } = rentangHariTerakhir(periode);
  const rankings = useProductPerformanceRankings(dari, sampai, 6);

  if (products.isLoading || riwayat.isLoading) {
    return <DashboardSkeleton />;
  }

  const hari = tanggalLokal();
  const semua = riwayat.data ?? [];
  const transaksi = semua.filter((t) => t.status !== "dibatalkan");
  const hariIni = transaksi.filter((t) => tanggalLokal(t.waktu) === hari);
  const omzetHariIni = hariIni.reduce((s, t) => s + t.total, 0);
  const menipis = (products.data ?? []).filter((p) => p.stok <= p.stokMinimum);
  const piutangHariIni = hariIni.reduce((s, t) => s + t.piutang, 0);
  const perluDiingatkan = perluReminder(aging.data?.invoices ?? [], reminderLog, hari);

  const tren = ringkasTrenPenjualan(semua, periode);
  const metode = ringkasMetodePembayaran(semua, periode);
  const piutang = piutangPeriode(semua, periode);
  const produkTeratas = rankings.data?.topRevenue ?? [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Gambaran kesehatan usaha dan tren penjualan dalam satu layar — dihitung dari transaksi nyata."
        actions={
          <Link href="/kasir" className="btn-accent">
            <Calculator className="size-4" aria-hidden />
            Buka Kasir
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Penjualan hari ini"
          value={<MoneyDisplay value={omzetHariIni} />}
          hint={`${hariIni.length} transaksi · diperbarui otomatis`}
          tone="navy"
          icon={<Store className="size-4" aria-hidden />}
        />
        <KpiCard
          label="Kas tunai sistem"
          value={shift.data ? <MoneyDisplay value={shift.data.kasTunaiSistem} /> : "—"}
          hint={shift.data ? `Shift ${shift.data.id}` : "Tidak ada shift aktif"}
          tone="emerald"
          icon={<Wallet className="size-4" aria-hidden />}
        />
        <KpiCard
          label="Stok menipis"
          value={menipis.length}
          hint={menipis.length > 0 ? menipis.slice(0, 2).map((p) => p.nama).join(", ") : "Semua di atas batas"}
          tone="rose"
          icon={<AlertTriangle className="size-4" aria-hidden />}
        />
        <KpiCard
          label="Piutang hari ini"
          value={<MoneyDisplay value={piutangHariIni} />}
          hint="Penjualan kredit yang belum lunas"
          tone="violet"
          icon={<TrendingUp className="size-4" aria-hidden />}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-brand">
            <TrendingUp className="size-4" aria-hidden />
            Analitik penjualan
          </h2>
          <p className="mt-1 text-xs text-muted">
            {periode} hari terakhir · {dari} s/d {sampai}
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-line bg-white p-1">
          {PERIODE.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriode(p)}
              aria-pressed={periode === p}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                periode === p ? "bg-brand text-white" : "text-muted hover:text-ink",
              )}
            >
              {p} hari
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SalesTrendChart data={tren} className="xl:col-span-2" />
        <PaymentBreakdown data={metode} piutang={piutang} />
      </div>

      <TopProductsChart
        products={produkTeratas}
        loading={rankings.isLoading}
        error={rankings.isError}
        className="mt-4"
      />

      <PanelKesehatan className="mt-6" />

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel col-span-2 p-5">
          <h2 className="text-sm font-bold text-brand">Penjualan terakhir</h2>
          <ul className="mt-3 divide-y divide-line/60">
            {transaksi.slice(0, 6).map((t) => <BarisTransaksi key={t.nomor} t={t} />)}
            {transaksi.length === 0 && (
              <li className="py-10 text-center text-sm text-muted">
                Belum ada transaksi — <Link href="/kasir" className="font-semibold text-brand underline">buka kasir</Link> untuk memulai.
              </li>
            )}
          </ul>
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-bold text-brand">Peringatan</h2>
          <ul className="mt-3 space-y-2.5">
            {menipis.length > 0 ? (
              <li className="rounded-2xl border border-line/70 bg-slate-50/60 p-3">
                <StatusBadge label="Stok menipis" tone="warning" />
                <p className="mt-1.5 text-sm text-ink">
                  {menipis.length} produk di bawah batas minimum — cek halaman Produk.
                </p>
              </li>
            ) : null}
            {transaksi.some((t) => t.status === "menunggu_pembayaran") ? (
              <li className="rounded-2xl border border-line/70 bg-slate-50/60 p-3">
                <StatusBadge label="Menunggu konfirmasi" tone="warning" />
                <p className="mt-1.5 text-sm text-ink">
                  Ada pembayaran QRIS/gateway yang belum dikonfirmasi — cek Keuangan → Kas & Bank.
                </p>
              </li>
            ) : null}
            {perluDiingatkan.length > 0 ? (
              <li className="rounded-2xl border border-line/70 bg-slate-50/60 p-3">
                <StatusBadge label="Reminder piutang" tone="danger" />
                <p className="mt-1.5 text-sm text-ink">
                  {perluDiingatkan.length} faktur jatuh tempo/terlambat belum diingatkan —{" "}
                  <Link href="/piutang" className="font-semibold text-brand underline">
                    kirim reminder
                  </Link>
                  .
                </p>
              </li>
            ) : transaksi.some((t) => t.piutang > 0 && t.status !== "dibatalkan") ? (
              <li className="rounded-2xl border border-line/70 bg-slate-50/60 p-3">
                <StatusBadge label="Piutang" tone="danger" />
                <p className="mt-1.5 text-sm text-ink">Ada penjualan kredit yang belum lunas.</p>
              </li>
            ) : null}
            <li className="rounded-2xl border border-line/70 bg-slate-50/60 p-3">
              <StatusBadge label="Engine akuntansi" tone="success" />
              <p className="mt-1.5 text-sm text-ink">
                Jurnal, neraca saldo, buku besar & laba-rugi aktif di menu Akuntansi.
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Gambaran kesehatan usaha dan tren penjualan dalam satu layar — dihitung dari transaksi nyata."
        actions={<Skeleton className="h-10 w-32 rounded-xl" />}
      />
      <KpiSkeleton />
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel col-span-2 p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-52 rounded-2xl" />
        </div>
        <div className="panel p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-40 rounded-2xl" />
        </div>
      </div>
      <div className="panel mt-4 p-5">
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel col-span-2 p-5">
          <Skeleton className="h-4 w-40" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <Skeleton className="h-4 w-24" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BarisTransaksi({ t }: { t: TransaksiRiwayat }) {
  const status = t.status === "lunas" ? "Lunas" : t.status === "menunggu_pembayaran" ? "Menunggu" : "Piutang";
  const tone = t.status === "lunas" ? "success" : "warning";
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">
          {t.items.map((i) => `${i.qty}× ${i.nama}`).join(", ")}
        </p>
        <p className="text-xs text-muted">{t.nomor} · kasir {t.kasir}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge label={status} tone={tone} />
        <MoneyDisplay value={t.total} className="font-bold text-brand" />
      </div>
    </li>
  );
}
