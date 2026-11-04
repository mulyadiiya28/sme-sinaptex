"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ApprovalRule, CreateApprovalRuleRequest } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { KpiSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api/client";
import { useApprovalRuleCreate, useApprovalRuleDeactivate, useApprovalRuleList } from "@/hooks/queries";
import { cn } from "@/lib/utils";

export default function ApprovalRulesPage() {
  const rules = useApprovalRuleList();
  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateApprovalRuleRequest>({
    name: "",
    transactionType: "",
    minimumAmount: 0,
    requiredLevel: 1,
    resolutionMode: "HIGHEST_LEVEL",
  });
  const [createPending, setCreatePending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { mutate: createRule, isPending: creating } = useApprovalRuleCreate();
  const { mutate: deactivateRule, isPending: deleting } = useApprovalRuleDeactivate();

  const columns: Column<ApprovalRule>[] = [
    { key: "name", header: "Nama", render: (r) => <span className="font-medium">{r.name ?? "-"}</span> },
    { key: "transactionType", header: "Jenis Transaksi", render: (r) => <span className="font-medium">{r.transactionType}</span> },
    { key: "minimumAmount", header: "Ambang Batas", align: "right", render: (r) => <MoneyDisplay value={r.minimumAmount} /> },
    { key: "requiredLevel", header: "Level Approval", align: "right", render: (r) => r.requiredLevel.toString() },
    { key: "resolutionMode", header: "Mode", render: (r) => <span className="text-xs text-muted">{r.resolutionMode}</span> },
    { key: "status", header: "Status", align: "center", render: (r) => (
      <StatusBadge label={r.isActive ? "Aktif" : "Nonaktif"} tone={r.isActive ? "success" : "danger"} />
    )},
    { key: "aksi", header: "", align: "center", render: (r) => (
      <button
        type="button"
        onClick={() => {
          if (window.confirm("Nonaktifkan aturan approval ini?")) {
            deactivateRule(r.id);
          }
        }}
        className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs text-rose-600"
      >
        Nonaktifkan
      </button>
    )},
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createRule(createForm);
    setCreateForm({ name: "", transactionType: "", minimumAmount: 0, requiredLevel: 1, resolutionMode: "HIGHEST_LEVEL" });
    setOpenCreate(false);
  };

  return (
    <div>
      <PageHeader
        title="Master Data: Aturan Approval"
        description="Kelola aturan approval transaksi yang akan memicu proses persetujuan sebelum posting."
      />

      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="btn-primary px-4 py-2 text-sm"
        >
          <Plus className="size-3.5" aria-hidden /> Tambah Aturan
        </button>
      </div>

      <div className="panel p-4">
        <h2 className="mb-3 px-1 text-sm font-bold text-brand">Daftar Aturan Approval</h2>
        <DataTable
          columns={columns}
          rows={rules.data ?? []}
          rowKey={(r) => r.id}
          loading={rules.isPending}
          empty="Belum ada aturan approval."
        />
      </div>

      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={() => setOpenCreate(false)}>
          <div className="panel w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-brand">Tambah Aturan Approval</h2>
            <form className="mt-4 space-y-3" onSubmit={handleCreate}>
              <FormField label="Nama Aturan">
                <input className="input" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
              </FormField>
              <FormField label="Jenis Transaksi">
                <input className="input" value={createForm.transactionType} onChange={(e) => setCreateForm({ ...createForm, transactionType: e.target.value })} />
              </FormField>
              <FormField label="Ambang Batas (Rp)">
                <input type="number" min={0} className="input text-right tabular-nums" value={createForm.minimumAmount || ""} onChange={(e) => setCreateForm({ ...createForm, minimumAmount: Number(e.target.value) })} />
              </FormField>
              <FormField label="Level Approval (1-99)">
                <input type="number" min={1} max={99} className="input text-right tabular-nums" value={createForm.requiredLevel || ""} onChange={(e) => setCreateForm({ ...createForm, requiredLevel: Number(e.target.value) })} />
              </FormField>
              <FormField label="Resolusi">
                <select className="input" value={createForm.resolutionMode} onChange={(e) => setCreateForm({ ...createForm, resolutionMode: e.target.value as string })}>
                  <option value="HIGHEST_LEVEL">HIGHEST_LEVEL</option>
                  <option value="ALL_MUST_APPROVE">ALL_MUST_APPROVE</option>
                </select>
              </FormField>
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
