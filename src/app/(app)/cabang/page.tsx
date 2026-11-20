"use client";

import { useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { KpiSkeleton } from "@/components/skeleton";
import { useCabangList, useCabangMutations } from "@/hooks/queries";
import type { Cabang } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const FORM_KOSONG = { kode: "", nama: "", parentId: "" };

export default function CabangPage() {
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
    return (
      <div>
        <PageHeader title="Cabang" description="Master cabang / gudang per lokasi." />
        <KpiSkeleton />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Cabang"
        description="Master cabang per lokasi. Cabang baru otomatis terikat ke induknya."
        actions={
          <button type="button" className="btn-primary" onClick={() => setBuka(true)} disabled={!hq}>
            <Plus className="size-4" aria-hidden /> Tambah cabang
          </button>
        }
      />

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
