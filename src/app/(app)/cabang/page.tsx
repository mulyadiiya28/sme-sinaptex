"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { KpiSkeleton, TableSkeleton } from "@/components/skeleton";
import {
  useCabangList,
  useCabangMutations,
  useTransferCabang,
  useTransferCabangMutations,
} from "@/hooks/queries";
import type { Cabang, TransferAntarCabang } from "@/lib/api/types";
import { useAuth } from "@/lib/store/auth";
import { useCabang } from "@/lib/store/cabang";
import { tanggalLokal } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "master" | "transfer";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "master", label: "Master Cabang" },
  { id: "transfer", label: "Transfer Antar Cabang" },
];

export default function CabangPage() {
  const [tab, setTab] = useState<Tab>("master");

  return (
    <div>
      <PageHeader
        title="Cabang"
        description="Master cabang per lokasi dan perpindahan dana antar cabang. Pencatatan tetap mengikuti cabang aktif di bar atas."
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

      {tab === "master" ? <PanelMasterCabang /> : <PanelTransferCabang />}
    </div>
  );
}

const FORM_KOSONG = { kode: "", nama: "", parentId: "" };

function PanelMasterCabang() {
  const cabang = useCabangList();
  const mut = useCabangMutations();
  const [form, setForm] = useState(FORM_KOSONG);
  const [buka, setBuka] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  const daftar = cabang.data ?? [];
  const hq = daftar.find((c) => c.isHeadquarters) ?? null;

  useEffect(() => {
    if (hq && !form.parentId) setForm((f) => ({ ...f, parentId: hq.id }));
  }, [hq, form.parentId]);

  async function simpan() {
    setPesan(null);
    if (!form.kode.trim() || !form.nama.trim() || !form.parentId) {
      setPesan("Kode, nama, dan induk wajib diisi.");
      return;
    }
    try {
      await mut.buat.mutateAsync({
        parentId: form.parentId,
        kode: form.kode.trim().toUpperCase(),
        nama: form.nama.trim(),
      });
      setForm({ ...FORM_KOSONG, parentId: hq?.id ?? "" });
      setBuka(false);
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menyimpan cabang.");
    }
  }

  const kolom: Column<Cabang>[] = [
    { key: "kode", header: "Kode", render: (c) => <span className="font-mono text-xs font-semibold">{c.kode}</span> },
    { key: "nama", header: "Nama", render: (c) => <span className="text-sm font-semibold text-ink">{c.nama}</span> },
    {
      key: "induk",
      header: "Induk",
      render: (c) => {
        const induk = daftar.find((x) => x.id === c.parentId);
        return <span className="text-xs text-muted">{induk ? induk.nama : "—"}</span>;
      },
    },
    {
      key: "status",
      header: "Jenis",
      render: (c) =>
        c.isHeadquarters ? (
          <StatusBadge label="Pusat" tone="info" />
        ) : (
          <StatusBadge label="Cabang" tone="neutral" />
        ),
    },
  ];

  if (cabang.isLoading) {
    return <KpiSkeleton />;
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button type="button" className="btn-primary" onClick={() => setBuka(true)} disabled={!hq}>
          <Plus className="size-4" aria-hidden /> Tambah cabang
        </button>
      </div>

      {pesan ? <p className="mb-3 text-sm text-rose-600">{pesan}</p> : null}

      <DataTable<Cabang>
        columns={kolom}
        rows={daftar}
        rowKey={(c) => c.id}
        empty="Belum ada cabang. Cabang pusat dibuat otomatis oleh engine."
      />

      {buka ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
          <div className="panel w-full max-w-md p-6">
            <h2 className="text-lg font-black text-brand">Tambah cabang</h2>
            <div className="mt-4 space-y-3">
              <FormField label="Induk">
                <select
                  className="input"
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                >
                  {daftar.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama} ({c.kode})
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Kode">
                <input
                  className="input"
                  value={form.kode}
                  onChange={(e) => setForm({ ...form, kode: e.target.value })}
                  placeholder="CB-02"
                />
              </FormField>
              <FormField label="Nama">
                <input
                  className="input"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Cabang Selatan"
                />
              </FormField>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={simpan}
                disabled={mut.buat.isPending}
              >
                Simpan
              </button>
              <button type="button" className="btn-secondary" onClick={() => setBuka(false)}>
                Batal
              </button>
            </div>
            {mut.buat.isError ? (
              <p className="mt-3 text-sm text-rose-600">
                {mut.buat.error instanceof Error ? mut.buat.error.message : "Gagal menyimpan."}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function formatTanggal(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  const bulan = BULAN_SINGKAT[Number(m) - 1] ?? m;
  return `${Number(d)} ${bulan} ${y}`;
}

function statusTransfer(status: string): { label: string; tone: "success" | "warning" | "danger" | "neutral" } {
  switch (status) {
    case "COMPLETED":
      return { label: "Tercatat", tone: "success" };
    case "PENDING":
      return { label: "Menunggu", tone: "warning" };
    case "FAILED":
      return { label: "Gagal", tone: "danger" };
    default:
      return { label: status, tone: "neutral" };
  }
}

function PanelTransferCabang() {
  const cabang = useCabangList();
  const riwayat = useTransferCabang();
  const { buat } = useTransferCabangMutations();
  const user = useAuth((s) => s.user);
  const cabangAktif = useCabang((s) => s.cabangAktif);

  const daftar = cabang.data ?? [];
  const [dari, setDari] = useState("");
  const [ke, setKe] = useState("");
  const [nominal, setNominal] = useState(0);
  const [tanggal, setTanggal] = useState(tanggalLokal());
  const [keterangan, setKeterangan] = useState("");
  const [sukses, setSukses] = useState<string | null>(null);

  // Cabang asal default mengikuti cabang aktif di bar atas supaya transfer
  // yang diketik dari layar sebuah cabang memang berangkat dari cabang itu.
  const defaultDari = cabangAktif ?? daftar[0]?.id ?? "";
  const dariId = dari || defaultDari;
  const keId = ke || daftar.find((c) => c.id !== dariId)?.id || "";

  const valid =
    Boolean(user) &&
    daftar.length >= 2 &&
    Boolean(dariId) &&
    Boolean(keId) &&
    dariId !== keId &&
    nominal > 0;

  const kolom: Column<TransferAntarCabang>[] = [
    {
      key: "tanggal",
      header: "Tanggal",
      render: (t) => <span className="text-muted">{formatTanggal(t.tanggal)}</span>,
    },
    {
      key: "rute",
      header: "Rute",
      render: (t) => (
        <span className="font-medium">
          {t.dariCabangNama} → {t.keCabangNama}
        </span>
      ),
    },
    { key: "keterangan", header: "Keterangan", render: (t) => <span className="text-muted">{t.keterangan || "—"}</span> },
    { key: "nominal", header: "Nominal", align: "right", render: (t) => <MoneyDisplay value={t.nominal} className="font-semibold" /> },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (t) => {
        const s = statusTransfer(t.status);
        return <StatusBadge label={s.label} tone={s.tone} />;
      },
    },
  ];

  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="size-4 text-brand" aria-hidden />
        <p className="font-bold text-brand">Transfer dana antar cabang</p>
      </div>
      <p className="mt-1 text-xs text-muted">
        Memindahkan uang dari satu cabang ke cabang lain. Engine menulis dua jurnal: Piutang Antar Cabang di
        cabang pengirim dan Utang Antar Cabang di cabang penerima. Bukan pendapatan atau biaya.
      </p>

      {daftar.length < 2 ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Transfer antar cabang butuh minimal dua cabang. Tambahkan cabang lebih dulu di tab Master Cabang
          (tersedia di mode live).
        </p>
      ) : (
        <form
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setSukses(null);
            if (!user || !valid) return;
            buat.mutate(
              {
                input: {
                  dariCabangId: dariId,
                  keCabangId: keId,
                  nominal,
                  keterangan: keterangan.trim() || undefined,
                  tanggal,
                },
                user,
              },
              {
                onSuccess: (t) => {
                  setSukses(`Transfer ${t.id} tercatat: ${t.dariCabangNama} → ${t.keCabangNama}.`);
                  setNominal(0);
                  setKeterangan("");
                },
              },
            );
          }}
        >
          <FormField label="Dari cabang">
            <select className="input" value={dariId} onChange={(e) => setDari(e.target.value)}>
              {daftar.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama} ({c.kode})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Ke cabang">
            <select className="input" value={keId} onChange={(e) => setKe(e.target.value)}>
              {daftar.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama} ({c.kode})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Nominal (Rp)">
            <input
              type="number"
              min={0}
              className="input text-right tabular-nums"
              value={nominal || ""}
              onChange={(e) => setNominal(Number(e.target.value))}
            />
          </FormField>
          <FormField label="Tanggal">
            <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </FormField>
          <FormField label="Keterangan">
            <input
              className="input"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="cth. setoran kas ke pusat"
            />
          </FormField>
          <button type="submit" disabled={!valid || buat.isPending} className="btn-primary disabled:opacity-40">
            {buat.isPending ? "Memproses..." : "Transfer"}
          </button>
        </form>
      )}

      {dariId && keId && dariId === keId && (
        <p className="mt-2 text-xs font-semibold text-rose-600">Cabang asal dan tujuan harus berbeda.</p>
      )}
      {sukses && <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{sukses}</p>}
      {buat.isError && (
        <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{String(buat.error)}</p>
      )}

      <div className="mt-4">
        {riwayat.isLoading ? (
          <TableSkeleton kolom={5} baris={4} />
        ) : (
          <DataTable
            columns={kolom}
            rows={riwayat.data ?? []}
            rowKey={(t) => t.id}
            empty="Belum ada transfer antar cabang."
          />
        )}
      </div>
    </div>
  );
}
