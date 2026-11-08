"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { CreateSupplierRequest, Supplier } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { KpiCard } from "@/components/kpi-card";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { KpiSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api/client";
import { useSupplierCreate, useSupplierDeactivate, useSupplierList } from "@/hooks/queries";
import { cn, kodeDariNama } from "@/lib/utils";

export default function SupplierPage() {
  const suppliers = useSupplierList();
  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateSupplierRequest>({
    code: "",
    name: "",
    address: "",
    phone: "",
    email: "",
    taxNumber: "",
  });
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { mutateAsync: createSupplier, isPending: creating } = useSupplierCreate();
  const { mutate: deactivateSupplier, isPending: deleting } = useSupplierDeactivate();

  const columns: Column<Supplier>[] = [
    { key: "code", header: "Kode", render: (r) => <span className="font-mono text-xs text-muted">{r.code}</span> },
    { key: "name", header: "Nama", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "address", header: "Alamat", render: (r) => <span className="text-muted text-xs">{r.address ?? "-"}</span> },
    { key: "phone", header: "Telepon", render: (r) => <span className="text-xs text-muted">{r.phone ?? "-"}</span> },
    { key: "status", header: "Status", align: "center", render: (r) => (
      <StatusBadge label={r.isActive ? "Aktif" : "Nonaktif"} tone={r.isActive ? "success" : "danger"} />
    )},
    { key: "aksi", header: "", align: "center", render: (r) => (
      <div className="flex justify-end gap-1.5">
        {r.isActive && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Nonaktifkan supplier ini?")) {
                deactivateSupplier(r.id);
              }
            }}
            className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs text-rose-600"
          >
            Nonaktifkan
          </button>
        )}
      </div>
    )},
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const nama = createForm.name.trim();
    if (!nama) return setCreateError("Nama pemasok wajib diisi.");
    const duplikat = (suppliers.data ?? []).find(
      (s) => s.isActive && s.name.trim().toLowerCase() === nama.toLowerCase(),
    );
    if (duplikat) {
      return setCreateError(`Pemasok "${duplikat.name}" sudah ada (kode ${duplikat.code}). Pilih dari daftar, bukan membuat baru.`);
    }
    try {
      await createSupplier({
        ...createForm,
        code: createForm.code.trim() || kodeDariNama(nama, (suppliers.data ?? []).map((s) => s.code)),
        name: nama,
      });
      setCreateForm({ code: "", name: "", address: "", phone: "", email: "", taxNumber: "" });
      setOpenCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Master Data: Pemasok"
        description="Kelola data pemasok yang digunakan dalam transaksi pembelian."
      />

      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setOpenCreate(true);
          }}
          className="btn-primary px-4 py-2 text-sm"
        >
          <Plus className="size-4" aria-hidden /> Tambah Pemasok
        </button>
      </div>

      <div className="panel p-4">
        <h2 className="mb-3 px-1 text-sm font-bold text-brand">Daftar Pemasok</h2>
        <DataTable
          columns={columns}
          rows={suppliers.data ?? []}
          rowKey={(r) => r.id}
          loading={suppliers.isPending}
          empty="Belum ada data pemasok."
        />
      </div>

      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={() => setOpenCreate(false)}>
          <div className="panel w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-brand">Tambah Pemasok</h2>
            <form className="mt-4 space-y-3" onSubmit={handleCreate}>
              <FormField label="Kode Pemasok" hint="Kosongkan untuk dibuat otomatis dari nama.">
                <input className="input" value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} placeholder="cth. PASAR-BARU" />
              </FormField>
              <FormField label="Nama Pemasok">
                <input className="input" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} autoFocus required />
              </FormField>
              <FormField label="Alamat">
                <input className="input" value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} />
              </FormField>
              <FormField label="Telepon">
                <input className="input" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
              </FormField>
              <FormField label="Email">
                <input className="input" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
              </FormField>
              <FormField label="NPWP">
                <input className="input" value={createForm.taxNumber} onChange={(e) => setCreateForm({ ...createForm, taxNumber: e.target.value })} />
              </FormField>
              {createError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{createError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={creating} className="btn-primary flex-1 disabled:opacity-40">
                  {creating ? "Menyimpan..." : "Simpan"}
                </button>
                <button type="button" onClick={() => setOpenCreate(false)} className="btn-secondary">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
