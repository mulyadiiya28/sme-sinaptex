"use client";

import Link from "next/link";
import { AlertTriangle, Calculator, Store, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import { useActiveShift, useProducts, useRiwayatTransaksi } from "@/hooks/queries";
import type { TransaksiRiwayat } from "@/lib/api/types";

export default function DashboardPage() {
  const products = useProducts();
  const shift = useActiveShift();
  const riwayat = useRiwayatTransaksi();

  if (products.isLoading || riwayat.isLoading) {
    return <p className="py-16 text-center text-sm text-muted">Memuat dashboard...</p>;
  }

  const hari = new Date().toISOString().slice(0, 10);
  const semua = riwayat.data ?? [];
  const transaksi = semua.filter((t) => t.status !== "dibatalkan");
  const hariIni = transaksi.filter((t) => t.waktu.slice(0, 10) === hari);
  const omzetHariIni = hariIni.reduce((s, t) => s + t.total, 0);
  const menipis = (products.data ?? []).filter((p) => p.stok <= p.stokMinimum);
  const piutangHariIni = hariIni.reduce((s, t) => s + t.piutang, 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Gambaran kesehatan usaha dalam satu layar — dihitung dari transaksi nyata (mock engine)."
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
          hint={`${hariIni.length} transaksi`}
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
            {transaksi.some((t) => t.piutang > 0 && t.status !== "dibatalkan") ? (
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
