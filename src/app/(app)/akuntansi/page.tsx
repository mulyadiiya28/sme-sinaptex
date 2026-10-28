"use client";

import { useState } from "react";
import { BookOpen, CheckCircle2, XCircle } from "lucide-react";
import type { JurnalEntry, LabaRugi } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard } from "@/components/kpi-card";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { useAkun, useJurnal, useLabaRugi } from "@/hooks/queries";
import { cn } from "@/lib/utils";

type Tab = "akun" | "jurnal" | "buku-besar" | "laba-rugi";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "akun", label: "Neraca Saldo" },
  { id: "jurnal", label: "Jurnal Otomatis" },
  { id: "buku-besar", label: "Buku Besar" },
  { id: "laba-rugi", label: "Laba-Rugi" },
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
    </div>
  );
}

function PanelAkun() {
  const akun = useAkun();
  const rows = akun.data ?? [];
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalKredit = rows.reduce((s, r) => s + r.kredit, 0);
  const seimbang = Math.abs(totalDebit - totalKredit) < 1 && Math.round(totalDebit) > 0;

  const columns: Column<{ akun: string; debit: number; kredit: number; saldo: number }>[] = [
    { key: "akun", header: "Akun", render: (r) => <span className="font-medium">{r.akun}</span> },
    { key: "debit", header: "Debit", align: "right", render: (r) => (r.debit ? <MoneyDisplay value={r.debit} /> : "—") },
    { key: "kredit", header: "Kredit", align: "right", render: (r) => (r.kredit ? <MoneyDisplay value={r.kredit} /> : "—") },
    { key: "saldo", header: "Saldo", align: "right", render: (r) => <MoneyDisplay value={r.saldo} className="font-bold" /> },
  ];

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-brand">Neraca saldo</h2>
        <BalanceBadge seimbang={seimbang} />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.akun}
        empty="Belum ada saldo akun."
      />
      <div className="mt-3 flex justify-end gap-6 border-t border-line px-3 pt-3 text-sm font-bold">
        <span>
          Total debit: <MoneyDisplay value={totalDebit} />
        </span>
        <span>
          Total kredit: <MoneyDisplay value={totalKredit} />
        </span>
      </div>
    </div>
  );
}

function PanelJurnal() {
  const jurnal = useJurnal();
  const entries = jurnal.data ?? [];

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

  const daftarAkun = (akun.data ?? []).map((a) => a.akun);
  const baris = (jurnal.data ?? [])
    .slice()
    .sort((a, b) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime())
    .flatMap((j) =>
      j.baris
        .filter((b) => b.akun === terpilih)
        .map((b) => ({ waktu: j.waktu, keterangan: j.keterangan, ref: j.ref, debit: b.debit, kredit: b.kredit })),
    );
  let saldoBerjalan = 0;
  const berjalan = baris.map((b) => {
    saldoBerjalan += b.debit - b.kredit;
    return { ...b, saldo: saldoBerjalan };
  });

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
      </div>
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

function BalanceBadge({ seimbang }: { seimbang: boolean }) {
  if (seimbang) {
    return (
      <span className="inline-flex items-center gap-1">
        <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
        <StatusBadge label="Debit = Kredit (seimbang)" tone="success" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <XCircle className="size-4 text-rose-600" aria-hidden />
      <StatusBadge label="Tidak seimbang" tone="danger" />
    </span>
  );
}
