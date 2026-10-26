"use client";

import { useMemo, useState } from "react";
import { Download, Store, TrendingUp, Warehouse } from "lucide-react";
import type { Product, TransaksiRiwayat } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { KpiCard } from "@/components/kpi-card";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { useProducts, useRiwayatTransaksi } from "@/hooks/queries";

type PenjualanHarian = { tanggal: string; jumlah: number; omzet: number };

export default function LaporanPage() {
  const riwayat = useRiwayatTransaksi();
  const products = useProducts();
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");

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

  return (
    <div>
      <PageHeader
        title="Laporan"
        description="Ringkasan kinerja usaha dari data transaksi nyata: penjualan harian, nilai persediaan, dan kas."
      />
      <div className="panel mb-4 flex flex-wrap items-end gap-2.5 p-4">
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

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="panel p-4">
          <h2 className="mb-3 px-1 text-sm font-bold text-brand">Penjualan per hari</h2>
          <DataTable columns={kolomHarian} rows={perHarian} rowKey={(r) => r.tanggal} empty="Belum ada penjualan." />
        </div>
        <div className="panel p-4">
          <h2 className="mb-3 px-1 text-sm font-bold text-brand">Nilai persediaan (stok × harga beli)</h2>
          <DataTable columns={kolomPersediaan} rows={daftarProduk} rowKey={(r) => r.id} empty="Belum ada produk." />
        </div>
      </div>
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
