"use client";

import { useState } from "react";
import { BookOpen, CheckCircle2, XCircle } from "lucide-react";
import type { AkunMaster, AkunSaldo, JurnalEntry, LabaRugi } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { KpiCard } from "@/components/kpi-card";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { KpiSkeleton, ListSkeleton, Skeleton, TableSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useAkun, useJurnal, useLabaRugi } from "@/hooks/queries";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Tab = "akun" | "jurnal" | "buku-besar" | "laba-rugi" | "neraca";
type StatusSaldo = "memuat" | "kosong" | "tanpa-transaksi" | "seimbang" | "tidak-seimbang";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "akun", label: "Neraca Saldo" },
  { id: "jurnal", label: "Jurnal Otomatis" },
  { id: "buku-besar", label: "Buku Besar" },
  { id: "laba-rugi", label: "Laba-Rugi" },
  { id: "neraca", label: "Neraca Berjalan" },
];

export default function AkuntansiPage() {
  const [tab, setTab] = useState<Tab>("akun");

  return (
    <div>
      <PageHeader
        title="Akuntansi"
        description="Pencatatan double-entry otomatis dari engine: setiap transaksi membentuk jurnal, saldo akun, dan laba-rugi."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              tab === t.id ? "border-brand bg-brand text-white" : "border-line bg-white text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "akun" && <PanelAkun />}
      {tab === "jurnal" && <PanelJurnal />}
      {tab === "buku-besar" && <PanelBukuBesar />}
      {tab === "laba-rugi" && <PanelLabaRugi />}
      {tab === "neraca" && <PanelNeraca />}
    </div>
  );
}

function PanelAkun() {
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const akun = useAkun({ from: dari || undefined, to: sampai || undefined });
  const rows = akun.data ?? [];
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalKredit = rows.reduce((s, r) => s + r.kredit, 0);
  const totalSaldoAwal = rows.reduce((s, r) => s + r.saldoAwal, 0);
  const totalSaldoAkhir = rows.reduce((s, r) => s + r.saldoAkhir, 0);
  const statusSaldo: StatusSaldo = akun.isLoading
    ? "memuat"
    : rows.length === 0
      ? "kosong"
      : totalDebit === 0 && totalKredit === 0
        ? "tanpa-transaksi"
        : Math.abs(totalDebit - totalKredit) < 1
          ? "seimbang"
          : "tidak-seimbang";

  const columns: Column<AkunSaldo>[] = [
    { key: "akun", header: "Akun", render: (r) => <span className="font-medium">{r.akun}</span> },
    {
      key: "saldoAwal",
      header: "Saldo awal",
      align: "right",
      render: (r) => (r.saldoAwal ? <MoneyDisplay value={r.saldoAwal} /> : "—"),
    },
    { key: "debit", header: "Debit", align: "right", render: (r) => (r.debit ? <MoneyDisplay value={r.debit} /> : "—") },
    { key: "kredit", header: "Kredit", align: "right", render: (r) => (r.kredit ? <MoneyDisplay value={r.kredit} /> : "—") },
    {
      key: "saldoAkhir",
      header: "Saldo berjalan",
      align: "right",
      render: (r) => <MoneyDisplay value={r.saldoAkhir} className="font-bold" />,
    },
  ];

  return (
    <div className="panel p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-bold text-brand">Neraca saldo</h2>
          <p className="text-xs text-muted">
            Kosongkan rentang untuk seluruh periode. Saldo awal = saldo sebelum tanggal awal.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <FormField label="Dari tanggal" className="w-40">
            <input type="date" className="input" value={dari} onChange={(e) => setDari(e.target.value)} />
          </FormField>
          <FormField label="Sampai tanggal" className="w-40">
            <input type="date" className="input" value={sampai} onChange={(e) => setSampai(e.target.value)} />
          </FormField>
        </div>
        <BalanceBadge status={statusSaldo} />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.akun}
        loading={akun.isLoading}
        empty="Belum ada saldo akun."
      />
      <div className="mt-3 flex flex-wrap justify-end gap-6 border-t border-line px-3 pt-3 text-sm font-bold">
        <span>
          Saldo awal: <MoneyDisplay value={totalSaldoAwal} />
        </span>
        <span>
          Total debit: <MoneyDisplay value={totalDebit} />
        </span>
        <span>
          Total kredit: <MoneyDisplay value={totalKredit} />
        </span>
        <span>
          Saldo berjalan: <MoneyDisplay value={totalSaldoAkhir} />
        </span>
      </div>
    </div>
  );
}

function PanelJurnal() {
  const jurnal = useJurnal();
  const entries = jurnal.data ?? [];

  if (jurnal.isLoading) return <ListSkeleton baris={4} />;

  return (
    <div className="space-y-3">
      {entries.length === 0 && <div className="panel p-6 text-sm text-muted">Belum ada jurnal tercatat.</div>}
      {entries
        .slice()
        .sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime())
        .map((e) => (
          <JurnalCard key={e.id} entry={e} />
        ))}
    </div>
  );
}

function JurnalCard({ entry }: { entry: JurnalEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div>
          <p className="text-sm font-bold text-brand">{entry.keterangan}</p>
          <p className="mt-0.5 text-xs text-muted">
            {new Date(entry.waktu).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · Ref: {entry.ref} · {entry.baris.length} baris
          </p>
        </div>
        <BookOpen className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="border-t border-line px-4 pb-4 pt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="pb-2">Akun</th>
                <th className="pb-2 text-right">Debit</th>
                <th className="pb-2 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody>
              {entry.baris.map((b, i) => (
                <tr key={i} className="border-t border-line/60">
                  <td className="py-1.5 font-medium">{b.akun}</td>
                  <td className="py-1.5 text-right tabular-nums">{b.debit ? <MoneyDisplay value={b.debit} /> : "—"}</td>
                  <td className="py-1.5 text-right tabular-nums">{b.kredit ? <MoneyDisplay value={b.kredit} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PanelBukuBesar() {
  const akun = useAkun();
  const jurnal = useJurnal();
  const [terpilih, setTerpilih] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");

  const daftarAkun = (akun.data ?? []).map((a) => a.akun);
  const awalMs = dari ? new Date(dari).getTime() : null;
  const akhirMs = sampai ? new Date(sampai + "T23:59:59").getTime() : null;

  const semua = (jurnal.data ?? [])
    .slice()
    .sort((a, b) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime())
    .flatMap((j) =>
      j.baris
        .filter((b) => b.akun === terpilih)
        .map((b) => ({ waktu: j.waktu, keterangan: j.keterangan, ref: j.ref, debit: b.debit, kredit: b.kredit })),
    );
  let saldoPembuka = 0;
  for (const b of semua) {
    const t = new Date(b.waktu).getTime();
    if (awalMs !== null && t < awalMs) saldoPembuka += b.debit - b.kredit;
  }
  const baris = semua.filter((b) => {
    const t = new Date(b.waktu).getTime();
    if (awalMs !== null && t < awalMs) return false;
    if (akhirMs !== null && t > akhirMs) return false;
    return true;
  });
  let saldoBerjalan = saldoPembuka;
  const berjalan = baris.map((b) => {
    saldoBerjalan += b.debit - b.kredit;
    return { ...b, saldo: saldoBerjalan };
  });

  if (akun.isLoading || jurnal.isLoading) {
    return (
      <div className="panel p-4">
        <Skeleton className="h-4 w-32" />
        <TableSkeleton kolom={6} baris={5} className="mt-3 px-0" />
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <div className="mb-3 flex flex-wrap items-end gap-3 px-1">
        <h2 className="text-sm font-bold text-brand">Buku besar</h2>
        <select className="input max-w-xs" value={terpilih} onChange={(e) => setTerpilih(e.target.value)} disabled={daftarAkun.length === 0}>
          <option value="">— pilih akun —</option>
          {daftarAkun.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <FormField label="Dari" className="w-36"><input type="date" className="input" value={dari} onChange={(e) => setDari(e.target.value)} /></FormField>
        <FormField label="Sampai" className="w-36"><input type="date" className="input" value={sampai} onChange={(e) => setSampai(e.target.value)} /></FormField>
      </div>
      {terpilih && awalMs !== null && (
        <p className="px-1 text-xs text-muted">Saldo pembuka sebelum rentang: <span className="font-bold tabular-nums">{saldoPembuka.toLocaleString("id-ID")}</span></p>
      )}
      {terpilih === "" ? (
        <p className="px-1 text-sm text-muted">Pilih akun untuk melihat mutasinya.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Waktu</th>
              <th className="px-3 py-2">Keterangan</th>
              <th className="px-3 py-2">Ref</th>
              <th className="px-3 py-2 text-right">Debit</th>
              <th className="px-3 py-2 text-right">Kredit</th>
              <th className="px-3 py-2 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {berjalan.map((b, i) => (
              <tr key={i} className="border-b border-line/60">
                <td className="px-3 py-2 text-muted">{new Date(b.waktu).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-3 py-2 font-medium">{b.keterangan}</td>
                <td className="px-3 py-2 text-muted">{b.ref}</td>
                <td className="px-3 py-2 text-right tabular-nums">{b.debit ? <MoneyDisplay value={b.debit} /> : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{b.kredit ? <MoneyDisplay value={b.kredit} /> : "—"}</td>
                <td className="px-3 py-2 text-right font-bold tabular-nums"><MoneyDisplay value={b.saldo} /></td>
              </tr>
            ))}
            {berjalan.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">Tidak ada mutasi pada akun ini.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PanelLabaRugi() {
  const lr = useLabaRugi();
  const data: LabaRugi | undefined = lr.data;

  if (lr.isLoading) {
    return (
      <div className="space-y-4">
        <KpiSkeleton />
        <div className="panel space-y-2.5 p-5">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pendapatan (penjualan)" value={<MoneyDisplay value={data?.pendapatan ?? 0} />} tone="navy" />
        <KpiCard label="HPP" value={<MoneyDisplay value={data?.hpp ?? 0} />} tone="violet" />
        <KpiCard label="Biaya operasional" value={<MoneyDisplay value={data?.biaya ?? 0} />} tone="rose" />
        <KpiCard label="Laba bersih" value={<MoneyDisplay value={data?.laba ?? 0} />} tone="emerald" />
      </div>
      <div className="panel p-5 text-sm">
        <p className="font-bold text-brand">Perhitungan</p>
        <div className="mt-2 space-y-1.5 tabular-nums">
          <Row label="Pendapatan" value={data?.pendapatan ?? 0} />
          <Row label="Dikurangi: Retur penjualan" value={-(data?.retur ?? 0)} />
          <Row label="Dikurangi: HPP" value={-(data?.hpp ?? 0)} />
          <Row label="Dikurangi: Biaya operasional" value={-(data?.biaya ?? 0)} />
          <Row label="Dikurangi: Pajak keluaran" value={-(data?.pajak ?? 0)} />
          <div className="border-t border-line pt-1.5">
            <Row label="Laba bersih" value={data?.laba ?? 0} bold />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between", bold && "font-black text-brand")}>
      <span className="text-muted">{label}</span>
      <MoneyDisplay value={value} />
    </div>
  );
}

function PanelNeraca() {
  const master = useQuery({ queryKey: ["akun-master"], queryFn: () => api.akuntansi.akunMaster(), staleTime: 300_000 });
  const tipeDariKode = (kode: string) => master.data?.find((a) => a.kode === kode)?.tipe ?? (kode.charAt(0) === "1" ? "ASSET" : kode.charAt(0) === "2" ? "LIABILITY" : kode.charAt(0) === "3" ? "EQUITY" : "EXPENSE");

  const kolom = [
    { label: "31 Des 2025", to: "2025-12-31" },
    { label: "31 Okt 2026", to: "2026-10-31" },
    { label: "Hari ini", to: new Date().toISOString().slice(0, 10) },
  ];

  const a1 = useAkun({ from: "1900-01-01", to: kolom[0].to });
  const a2 = useAkun({ from: "1900-01-01", to: kolom[1].to });
  const a3 = useAkun({ from: "1900-01-01", to: kolom[2].to });
  const akuns = [a1.data ?? [], a2.data ?? [], a3.data ?? []];

  const klasifikasi = (rows: AkunSaldo[], tipe: string) =>
    rows.filter((r) => tipeDariKode(r.kode) === tipe);

  const total = (rows: AkunSaldo[], tipe: string) =>
    klasifikasi(rows, tipe).reduce((s, r) => s + r.saldoAkhir, 0);

  const labaYTD = (rows: AkunSaldo[]) => {
    const pendapatan = klasifikasi(rows, "REVENUE").reduce((s, r) => s + r.saldoAkhir, 0);
    const beban = klasifikasi(rows, "EXPENSE").reduce((s, r) => s + r.saldoAkhir, 0);
    return pendapatan - beban;
  };

  if (a1.isLoading || a2.isLoading || a3.isLoading || master.isLoading) {
    return <TableSkeleton kolom={4} baris={8} />;
  }

  const kelompok = [
    { tipe: "ASSET", label: "ASET" },
    { tipe: "LIABILITY", label: "KEWAJIBAN" },
    { tipe: "EQUITY", label: "EKUITAS" },
  ];

  return (
    <div className="panel p-4">
      <h2 className="mb-3 px-1 text-sm font-bold text-brand">Neraca berjalan (posisi keuangan)</h2>
      <p className="mb-3 px-1 text-xs text-muted">Saldo akhir per tanggal. Laba tahun berjalan = pendapatan minus beban YTD, ditampilkan sebagai bagian ekuitas.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Kelompok / Akun</th>
              {kolom.map((k) => <th key={k.label} className="px-3 py-2 text-right">{k.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {kelompok.map((g) => (
              <>
                <tr key={g.label} className="bg-slate-50 font-bold">
                  <td className="px-3 py-2">{g.label}</td>
                  {akuns.map((rows, i) => <td key={i} className="px-3 py-2 text-right tabular-nums"><MoneyDisplay value={total(rows, g.tipe)} /></td>)}
                </tr>
                {klasifikasi(akuns[2], g.tipe).map((r) => (
                  <tr key={r.kode} className="border-b border-line/60">
                    <td className="px-3 py-1.5 pl-6 text-muted">{r.akun}</td>
                    {akuns.map((rows, i) => {
                      const found = rows.find((x) => x.kode === r.kode);
                      return <td key={i} className="px-3 py-1.5 text-right tabular-nums">{found ? <MoneyDisplay value={found.saldoAkhir} /> : "—"}</td>;
                    })}
                  </tr>
                ))}
              </>
            ))}
            <tr className="border-t-2 border-line font-bold">
              <td className="px-3 py-2">Laba Tahun Berjalan (YTD)</td>
              {akuns.map((rows, i) => <td key={i} className="px-3 py-2 text-right tabular-nums"><MoneyDisplay value={labaYTD(rows)} /></td>)}
            </tr>
            <tr className="border-t-2 border-line font-black">
              <td className="px-3 py-2">Total Aset</td>
              {akuns.map((rows, i) => <td key={i} className="px-3 py-2 text-right tabular-nums"><MoneyDisplay value={total(rows, "ASSET")} /></td>)}
            </tr>
            <tr className="font-black">
              <td className="px-3 py-2">Total Kewajiban + Ekuitas + Laba</td>
              {akuns.map((rows, i) => <td key={i} className="px-3 py-2 text-right tabular-nums"><MoneyDisplay value={total(rows, "LIABILITY") + total(rows, "EQUITY") + labaYTD(rows)} /></td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BalanceBadge({ status }: { status: StatusSaldo }) {
  switch (status) {
    case "memuat":
      return <StatusBadge label="Memuat saldo..." tone="neutral" />;
    case "kosong":
      return <StatusBadge label="Belum ada data" tone="neutral" />;
    case "tanpa-transaksi":
      return <StatusBadge label="Belum ada transaksi di rentang ini" tone="info" />;
    case "seimbang":
      return (
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
          <StatusBadge label="Debit = Kredit (seimbang)" tone="success" />
        </span>
      );
    case "tidak-seimbang":
      return (
        <span className="inline-flex items-center gap-1">
          <XCircle className="size-4 text-rose-600" aria-hidden />
          <StatusBadge label="Tidak seimbang" tone="danger" />
        </span>
      );
  }
}
