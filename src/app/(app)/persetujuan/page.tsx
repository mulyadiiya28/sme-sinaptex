"use client";

import { CheckCheck, Clock3, ShieldCheck } from "lucide-react";
import type { PersetujuanBatch } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard } from "@/components/kpi-card";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { KpiSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { usePersetujuanList, usePersetujuanMutations } from "@/hooks/queries";

const TIPE_LABEL: Record<string, string> = {
  SALE: "Penjualan",
  CUSTOMER_PAYMENT: "Pembayaran pelanggan",
  PURCHASE: "Pembelian",
  SUPPLIER_PAYMENT: "Pembayaran pemasok",
};

function tanggalTampil(nilai: string): string {
  const d = new Date(nilai);
  if (Number.isNaN(d.getTime())) return nilai;
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PersetujuanPage() {
  const daftar = usePersetujuanList();
  const { setujui } = usePersetujuanMutations();

  const rows = daftar.data ?? [];
  const totalNominal = rows.reduce((s, r) => s + r.nominal, 0);

  const columns: Column<PersetujuanBatch>[] = [
    {
      key: "batchId",
      header: "Batch",
      render: (r) => (
        <span className="font-mono text-xs text-muted">{r.batchId.slice(0, 8)}</span>
      ),
    },
    {
      key: "tanggal",
      header: "Waktu",
      render: (r) => <span className="text-xs text-muted">{tanggalTampil(r.tanggal)}</span>,
    },
    {
      key: "peminta",
      header: "Diminta oleh",
      render: (r) => <span className="font-medium">{r.peminta}</span>,
    },
    {
      key: "keterangan",
      header: "Keterangan",
      render: (r) => (
        <div>
          <p className="text-xs text-ink">{r.keterangan ?? "-"}</p>
          <p className="text-[11px] text-muted">
            {r.transaksi.map((t) => TIPE_LABEL[t.tipe] ?? t.tipe).join(" + ")}
          </p>
        </div>
      ),
    },
    {
      key: "nominal",
      header: "Nominal",
      align: "right",
      render: (r) => <MoneyDisplay value={r.nominal} className="font-semibold" />,
    },
    {
      key: "langkah",
      header: "Langkah",
      align: "center",
      render: (r) => {
        const langkah = r.transaksi.flatMap((t) => t.langkah);
        const tertunda = langkah.filter((l) => l.status === "PENDING");
        if (langkah.length === 0) {
          return <StatusBadge label="Tanpa aturan" tone="neutral" />;
        }
        return (
          <StatusBadge
            label={`${tertunda.length}/${langkah.length} menunggu · level ${Math.max(...langkah.map((l) => l.level))}`}
            tone="warning"
          />
        );
      },
    },
    {
      key: "aksi",
      header: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          disabled={setujui.isPending}
          onClick={() => {
            if (
              window.confirm(
                `Setujui batch ${r.batchId.slice(0, 8)} senilai ${r.nominal.toLocaleString("id-ID")}? ` +
                  "Setelah disetujui, stok dan kas langsung diposting dan tidak bisa dibatalkan.",
              )
            ) {
              setujui.mutate(r);
            }
          }}
          className="btn-primary rounded-lg px-3 py-1.5 text-xs disabled:opacity-40"
        >
          <CheckCheck className="size-4" aria-hidden /> Setujui &amp; Posting
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Persetujuan Transaksi"
        description="Batch kas yang ditahan aturan approval. Setelah disetujui, engine memposting stok, kas, dan jurnalnya."
      />

      {daftar.isPending ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Batch menunggu"
            value={rows.length}
            hint="Belum memengaruhi stok/kas"
            tone="rose"
            icon={<Clock3 className="size-4" aria-hidden />}
          />
          <KpiCard
            label="Nilai tertahan"
            value={<MoneyDisplay value={totalNominal} />}
            hint="Total nominal batch"
            tone="violet"
            icon={<ShieldCheck className="size-4" aria-hidden />}
          />
          <KpiCard
            label="Level penyetuju"
            value="Pemilik"
            hint="Hanya level 99 yang boleh menyetujui"
            tone="navy"
            icon={<CheckCheck className="size-4" aria-hidden />}
          />
        </div>
      )}

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Transaksi yang menunggu persetujuan sudah tercatat sebagai dokumen, tetapi kas, stok, dan
        jurnal belum berubah. Jangan serahkan barang sebelum batch disetujui di halaman ini.
      </div>

      <div className="panel mt-4 p-4">
        <h2 className="mb-3 px-1 text-sm font-bold text-brand">Antrean persetujuan</h2>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.batchId}
          loading={daftar.isPending}
          empty="Tidak ada transaksi yang menunggu persetujuan."
        />
      </div>

      {daftar.isError && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {String(daftar.error)}
        </p>
      )}
      {setujui.isError && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {String(setujui.error)}
        </p>
      )}
    </div>
  );
}
