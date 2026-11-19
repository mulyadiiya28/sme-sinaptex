"use client";

import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { KpiCard } from "@/components/kpi-card";
import { KpiSkeleton, TableSkeleton } from "@/components/skeleton";
import { usePembelian } from "@/hooks/queries";
import { unduhCsv } from "@/lib/csv";
import { formatIDR, tanggalLokal } from "@/lib/format";

type BarisPph = {
  nomor: string;
  tanggal: string;
  pemasok: string;
  total: number;
  pph23: number;
  pph42: number;
};

export default function PphPage() {
  const pembelian = usePembelian();
  const [rate23, setRate23] = useState(2);
  const [rate42, setRate42] = useState(0.5);

  const baris: BarisPph[] = useMemo(() => {
    return (pembelian.data ?? []).map((p) => {
      const total = p.total ?? 0;
      // PPh 23 = 2% (default) atas jasa/sewa; PPh 4(2) = 0.5% (default) atas penghasilan tertentu.
      // Karena engine tidak menyimpan jenis penghasilan, POS memakai rate yang diisi owner
      // sebagai estimasi atas total faktur. Nilai final tetap ditentukan akuntan.
      const pph23 = Math.round((total * rate23) / 100);
      const pph42 = Math.round((total * rate42) / 100);
      return {
        nomor: p.nomor ?? "-",
        tanggal: p.waktu ?? "",
        pemasok: p.pemasok ?? "-",
        total,
        pph23,
        pph42,
      };
    });
  }, [pembelian.data, rate23, rate42]);

  const totalPph23 = baris.reduce((s, b) => s + b.pph23, 0);
  const totalPph42 = baris.reduce((s, b) => s + b.pph42, 0);
  const totalFaktur = baris.reduce((s, b) => s + b.total, 0);

  const kolom: Column<BarisPph>[] = [
    { key: "nomor", header: "No. Faktur", render: (r) => <span className="font-mono text-xs">{r.nomor}</span> },
    { key: "tanggal", header: "Tanggal", render: (r) => <span className="text-xs text-muted">{tanggalLokal(r.tanggal)}</span> },
    { key: "pemasok", header: "Pemasok", render: (r) => <span className="text-sm">{r.pemasok}</span> },
    { key: "total", header: "Total Faktur", align: "right", render: (r) => <MoneyDisplay value={r.total} /> },
    { key: "pph23", header: "PPh 23", align: "right", render: (r) => <MoneyDisplay value={r.pph23} /> },
    { key: "pph42", header: "PPh 4(2)", align: "right", render: (r) => <MoneyDisplay value={r.pph42} /> },
  ];

  function ekspor() {
    const header = ["No. Faktur", "Tanggal", "Pemasok", "Total Faktur", "PPh 23", "PPh 4(2)"];
    const rows = baris.map((b) => [b.nomor, b.tanggal, b.pemasok, b.total, b.pph23, b.pph42]);
    rows.push(["TOTAL", "", "", totalFaktur, totalPph23, totalPph42]);
    unduhCsv(`laporan-pph-${new Date().toISOString().slice(0, 10)}.csv`, header, rows);
  }

  if (pembelian.isLoading) {
    return (
      <div>
        <PageHeader title="PPh (Pajak Penghasilan)" description="Ringkasan PPh 23 dan PPh 4 ayat 2." />
        <KpiSkeleton />
        <TableSkeleton baris={6} kolom={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="PPh (Pajak Penghasilan)"
        description="Estimasi PPh 23 (jasa/sewa) dan PPh 4 ayat 2 (penghasilan tertentu) dari faktur pembelian."
        actions={
          <button type="button" className="btn-secondary" onClick={ekspor}>
            <Download className="size-4" aria-hidden /> Ekspor CSV
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Total Faktur" value={<MoneyDisplay value={totalFaktur} />} />
        <KpiCard label="Estimasi PPh 23" value={<MoneyDisplay value={totalPph23} />} hint={`Rate ${rate23}%`} />
        <KpiCard label="Estimasi PPh 4(2)" value={<MoneyDisplay value={totalPph42} />} hint={`Rate ${rate42}%`} />
      </div>

      <div className="panel mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <FormField label="Rate PPh 23 (%)">
          <input type="number" step="0.1" className="input" value={rate23} onChange={(e) => setRate23(Number(e.target.value))} />
        </FormField>
        <FormField label="Rate PPh 4(2) (%)">
          <input type="number" step="0.1" className="input" value={rate42} onChange={(e) => setRate42(Number(e.target.value))} />
        </FormField>
        <p className="sm:col-span-2 text-xs text-muted">
          Nilai di atas adalah estimasi. Penentuan PPh final (jenis penghasilan, DPP, kredit pajak) dilakukan akuntan
          berdasarkan bukti potong. POS belum menyimpan bukti potong per faktur.
        </p>
      </div>

      <DataTable<BarisPph>
        columns={kolom}
        rows={baris}
        rowKey={(r) => r.nomor}
        empty="Belum ada faktur pembelian."
        loading={pembelian.isLoading}
      />
    </div>
  );
}