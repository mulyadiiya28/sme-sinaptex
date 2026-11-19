"use client";

import { useEffect, useState } from "react";
import { Plus, TicketPercent } from "lucide-react";
import type { Voucher, VoucherInput } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { KpiSkeleton } from "@/components/skeleton";
import {
  useVoucherCreate,
  useVoucherDeactivate,
  useVoucherList,
  useVoucherUpdate,
} from "@/hooks/queries";
import { cn } from "@/lib/utils";

const FORM_KOSONG: VoucherInput = {
  kode: "",
  tipe: "persen",
  persen: 0.1,
  minimumBelanja: 0,
  validDari: new Date().toISOString().slice(0, 10),
  validSampai: "2099-12-31",
};

export default function VoucherPage() {
  const vouchers = useVoucherList(true);
  const createMut = useVoucherCreate();
  const updateMut = useVoucherUpdate();
  const deactivateMut = useVoucherDeactivate();

  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState<VoucherInput>({ ...FORM_KOSONG });
  const [createError, setCreateError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [editForm, setEditForm] = useState<VoucherInput>({ ...FORM_KOSONG });
  const [editError, setEditError] = useState<string | null>(null);

  function resetCreate() {
    setCreateForm({ ...FORM_KOSONG });
    setCreateError(null);
  }

  async function buat(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    try {
      await createMut.mutateAsync(createForm);
      setOpenCreate(false);
      resetCreate();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    }
  }

  function bukaEdit(v: Voucher) {
    setEditing(v);
    setEditForm({
      kode: v.kode,
      deskripsi: v.deskripsi,
      tipe: v.tipe,
      persen: v.persen,
      nominal: v.nominal,
      minimumBelanja: v.minimumBelanja,
      validDari: v.validDari,
      validSampai: v.validSampai,
      batasPemakaian: v.batasPemakaian,
    });
    setEditError(null);
  }

  async function simpanEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditError(null);
    try {
      await updateMut.mutateAsync({ id: editing.id, input: editForm });
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err));
    }
  }

  const columns: Column<Voucher>[] = [
    { key: "kode", header: "Kode", render: (r) => <span className="font-mono text-xs font-bold">{r.kode}</span> },
    { key: "tipe", header: "Tipe", render: (r) => (r.tipe === "persen" ? "Persen" : "Nominal") },
    {
      key: "nilai",
      header: "Nilai",
      align: "right",
      render: (r) =>
        r.tipe === "persen" ? (
          <span className="tabular-nums">{((r.persen ?? 0) * 100).toFixed(0)}%</span>
        ) : (
          <MoneyDisplay value={r.nominal ?? 0} />
        ),
    },
    { key: "minimumBelanja", header: "Min. Belanja", align: "right", render: (r) => <MoneyDisplay value={r.minimumBelanja} /> },
    { key: "validDari", header: "Berlaku", render: (r) => <span className="text-xs text-muted">{r.validDari} – {r.validSampai}</span> },
    { key: "dipakai", header: "Dipakai", align: "center", render: (r) => <span className="tabular-nums text-xs">{r.dipakai}{r.batasPemakaian ? `/${r.batasPemakaian}` : ""}</span> },
    { key: "aktif", header: "Status", align: "center", render: (r) => <StatusBadge label={r.aktif ? "Aktif" : "Nonaktif"} tone={r.aktif ? "success" : "danger"} /> },
    {
      key: "aksi",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary rounded-lg px-2 py-1 text-xs" onClick={() => bukaEdit(r)}>
            Ubah
          </button>
          {r.aktif && (
            <button
              type="button"
              className="btn-secondary rounded-lg px-2 py-1 text-xs text-rose-600"
              onClick={() => deactivateMut.mutate(r.id)}
            >
              Nonaktifkan
            </button>
          )}
        </div>
      ),
    },
  ];

  if (vouchers.isLoading) {
    return (
      <div>
        <PageHeader title="Voucher" description="Master voucher diskon untuk kasir." />
        <KpiSkeleton />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Voucher"
        description="Buat dan kelola voucher diskon. Kasir hanya mengetik kode; diskon dihitung engine."
        actions={
          <button type="button" className="btn-primary" onClick={() => setOpenCreate(true)}>
            <Plus className="size-4" aria-hidden /> Tambah Voucher
          </button>
        }
      />

      <DataTable<Voucher>
        columns={columns}
        rows={vouchers.data ?? []}
        rowKey={(r) => r.id}
        empty="Belum ada voucher."
      />

      {openCreate && (
        <Dialog title="Tambah Voucher" onClose={() => { setOpenCreate(false); resetCreate(); }}>
          <form onSubmit={buat} className="space-y-3">
            <FormField label="Kode">
              <input className="input font-mono uppercase" value={createForm.kode} onChange={(e) => setCreateForm({ ...createForm, kode: e.target.value.toUpperCase() })} required />
            </FormField>
            <FormField label="Deskripsi">
              <input className="input" value={createForm.deskripsi ?? ""} onChange={(e) => setCreateForm({ ...createForm, deskripsi: e.target.value })} />
            </FormField>
            <FormField label="Tipe">
              <select className="input" value={createForm.tipe} onChange={(e) => setCreateForm({ ...createForm, tipe: e.target.value as "persen" | "nominal" })}>
                <option value="persen">Persen</option>
                <option value="nominal">Nominal</option>
              </select>
            </FormField>
            {createForm.tipe === "persen" ? (
              <FormField label="Persen (0.1 = 10%)">
                <input type="number" step="0.01" className="input" value={createForm.persen ?? 0} onChange={(e) => setCreateForm({ ...createForm, persen: Number(e.target.value) })} />
              </FormField>
            ) : (
              <FormField label="Nominal">
                <input type="number" className="input" value={createForm.nominal ?? 0} onChange={(e) => setCreateForm({ ...createForm, nominal: Number(e.target.value) })} />
              </FormField>
            )}
            <FormField label="Minimum belanja">
              <input type="number" className="input" value={createForm.minimumBelanja ?? 0} onChange={(e) => setCreateForm({ ...createForm, minimumBelanja: Number(e.target.value) })} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Valid dari">
                <input type="date" className="input" value={createForm.validDari ?? ""} onChange={(e) => setCreateForm({ ...createForm, validDari: e.target.value })} />
              </FormField>
              <FormField label="Valid sampai">
                <input type="date" className="input" value={createForm.validSampai ?? ""} onChange={(e) => setCreateForm({ ...createForm, validSampai: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Batas pemakaian (kosong = tanpa batas)">
              <input type="number" className="input" value={createForm.batasPemakaian ?? ""} onChange={(e) => setCreateForm({ ...createForm, batasPemakaian: e.target.value ? Number(e.target.value) : undefined })} />
            </FormField>
            {createError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{createError}</p>}
            <button type="submit" className="btn-primary w-full" disabled={createMut.isPending}>
              {createMut.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </form>
        </Dialog>
      )}

      {editing && (
        <Dialog title={`Ubah ${editing.kode}`} onClose={() => setEditing(null)}>
          <form onSubmit={simpanEdit} className="space-y-3">
            <FormField label="Deskripsi">
              <input className="input" value={editForm.deskripsi ?? ""} onChange={(e) => setEditForm({ ...editForm, deskripsi: e.target.value })} />
            </FormField>
            <FormField label="Tipe">
              <select className="input" value={editForm.tipe} onChange={(e) => setEditForm({ ...editForm, tipe: e.target.value as "persen" | "nominal" })}>
                <option value="persen">Persen</option>
                <option value="nominal">Nominal</option>
              </select>
            </FormField>
            {editForm.tipe === "persen" ? (
              <FormField label="Persen (0.1 = 10%)">
                <input type="number" step="0.01" className="input" value={editForm.persen ?? 0} onChange={(e) => setEditForm({ ...editForm, persen: Number(e.target.value) })} />
              </FormField>
            ) : (
              <FormField label="Nominal">
                <input type="number" className="input" value={editForm.nominal ?? 0} onChange={(e) => setEditForm({ ...editForm, nominal: Number(e.target.value) })} />
              </FormField>
            )}
            <FormField label="Minimum belanja">
              <input type="number" className="input" value={editForm.minimumBelanja ?? 0} onChange={(e) => setEditForm({ ...editForm, minimumBelanja: Number(e.target.value) })} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Valid dari">
                <input type="date" className="input" value={editForm.validDari ?? ""} onChange={(e) => setEditForm({ ...editForm, validDari: e.target.value })} />
              </FormField>
              <FormField label="Valid sampai">
                <input type="date" className="input" value={editForm.validSampai ?? ""} onChange={(e) => setEditForm({ ...editForm, validSampai: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Batas pemakaian">
              <input type="number" className="input" value={editForm.batasPemakaian ?? ""} onChange={(e) => setEditForm({ ...editForm, batasPemakaian: e.target.value ? Number(e.target.value) : undefined })} />
            </FormField>
            {editError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{editError}</p>}
            <button type="submit" className="btn-primary w-full" disabled={updateMut.isPending}>
              {updateMut.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <div className="panel w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-brand">{title}</h2>
          <button type="button" className="btn-secondary rounded-lg px-2 py-1 text-xs" onClick={onClose}>
            Tutup
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}