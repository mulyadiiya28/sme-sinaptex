"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type {
  LoyaltyPolicy,
  Member,
  MemberInput,
  MemberTier,
  MemberTierInput,
  MemberUpdate,
} from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { KpiSkeleton } from "@/components/skeleton";
import {
  useLoyaltyPolicy,
  useLoyaltyPolicyMutation,
  useMemberHarga,
  useMemberList,
  useMemberMutations,
  useRiwayatPoin,
  useTierList,
  useTierMutations,
} from "@/hooks/queries";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "member" | "tier" | "policy" | "poin";

const FORM_MEMBER: MemberInput = { kode: "", nama: "", telepon: "", tierId: "" };
const FORM_TIER: MemberTierInput = {
  kode: "",
  nama: "",
  minPoin: 0,
  diskonPersen: 0.05,
  pengaliPoin: 1,
};

export default function MemberPage() {
  const members = useMemberList(true);
  const tiers = useTierList(true);
  const policy = useLoyaltyPolicy();
  const memberMut = useMemberMutations();
  const tierMut = useTierMutations();
  const policyMut = useLoyaltyPolicyMutation();
  const hargaMut = useMemberHarga();

  const [tab, setTab] = useState<Tab>("member");
  const [openMember, setOpenMember] = useState(false);
  const [memberForm, setMemberForm] = useState<MemberInput>({ ...FORM_MEMBER });
  const [memberEditId, setMemberEditId] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [openTier, setOpenTier] = useState(false);
  const [tierForm, setTierForm] = useState<MemberTierInput>({ ...FORM_TIER });
  const [tierEditId, setTierEditId] = useState<string | null>(null);
  const [tierError, setTierError] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState<LoyaltyPolicy | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | undefined>();
  const [adjustKode, setAdjustKode] = useState("");
  const [adjustPoin, setAdjustPoin] = useState(0);
  const [adjustDeskripsi, setAdjustDeskripsi] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const riwayat = useRiwayatPoin(selectedMember);

  const daftarTier = tiers.data ?? [];
  const namaTier = (id?: string) => daftarTier.find((t) => t.id === id)?.nama ?? "-";

  function bukaMember(m?: Member) {
    setMemberEditId(m?.id ?? null);
    setMemberForm(
      m
        ? { kode: m.kode, nama: m.nama, telepon: m.telepon ?? "", tierId: m.tierId ?? "" }
        : { ...FORM_MEMBER },
    );
    setMemberError(null);
    setOpenMember(true);
  }

  async function simpanMember(e: React.FormEvent) {
    e.preventDefault();
    setMemberError(null);
    try {
      const input: MemberInput = {
        ...memberForm,
        telepon: memberForm.telepon?.trim() || undefined,
        tierId: memberForm.tierId || undefined,
      };
      if (memberEditId) await memberMut.update.mutateAsync({ id: memberEditId, input: input as MemberUpdate });
      else await memberMut.create.mutateAsync(input);
      setOpenMember(false);
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : String(err));
    }
  }

  function bukaTier(t?: MemberTier) {
    setTierEditId(t?.id ?? null);
    setTierForm(
      t
        ? {
            kode: t.kode,
            nama: t.nama,
            minPoin: t.minPoin,
            diskonPersen: t.diskonPersen,
            pengaliPoin: t.pengaliPoin,
          }
        : { ...FORM_TIER },
    );
    setTierError(null);
    setOpenTier(true);
  }

  async function simpanTier(e: React.FormEvent) {
    e.preventDefault();
    setTierError(null);
    try {
      if (tierEditId) await tierMut.update.mutateAsync({ id: tierEditId, input: tierForm });
      else await tierMut.create.mutateAsync(tierForm);
      setOpenTier(false);
    } catch (err) {
      setTierError(err instanceof Error ? err.message : String(err));
    }
  }

  async function simpanPolicy(e: React.FormEvent) {
    e.preventDefault();
    if (!policyForm) return;
    setPolicyError(null);
    try {
      await policyMut.mutateAsync(policyForm);
      setPolicyForm(null);
    } catch (err) {
      setPolicyError(err instanceof Error ? err.message : String(err));
    }
  }

  async function sesuaikanPoin(e: React.FormEvent) {
    e.preventDefault();
    setAdjustError(null);
    try {
      await memberMut.adjust.mutateAsync({
        kode: adjustKode,
        poin: adjustPoin,
        deskripsi: adjustDeskripsi,
      });
      setAdjustPoin(0);
      setAdjustDeskripsi("");
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : String(err));
    }
  }

  async function lihatHarga(m: Member) {
    setSelectedMember(m.id);
    setAdjustKode(m.kode);
    try {
      await hargaMut.mutateAsync({ kode: m.kode, poin: 0, jumlah: 100_000 });
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : String(err));
    }
  }

  const memberColumns: Column<Member>[] = [
    { key: "kode", header: "Kode", render: (r) => <span className="font-mono text-xs font-bold">{r.kode}</span> },
    { key: "nama", header: "Nama", render: (r) => r.nama },
    { key: "telepon", header: "Telepon", render: (r) => <span className="text-xs text-muted">{r.telepon ?? "-"}</span> },
    { key: "tier", header: "Tier", render: (r) => <span className="text-xs">{namaTier(r.tierId)}</span> },
    { key: "poin", header: "Saldo poin", align: "right", render: (r) => <span className="tabular-nums font-bold">{r.poin.toLocaleString("id-ID")}</span> },
    { key: "lifetime", header: "Total poin", align: "right", render: (r) => <span className="tabular-nums text-xs">{r.poinSeumurHidup.toLocaleString("id-ID")}</span> },
    { key: "aktif", header: "Status", align: "center", render: (r) => <StatusBadge label={r.aktif ? "Aktif" : "Nonaktif"} tone={r.aktif ? "success" : "danger"} /> },
    {
      key: "aksi",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary rounded-lg px-2 py-1 text-xs" onClick={() => void lihatHarga(r)}>
            Poin
          </button>
          <button type="button" className="btn-secondary rounded-lg px-2 py-1 text-xs" onClick={() => bukaMember(r)}>
            Ubah
          </button>
          {r.aktif && (
            <button
              type="button"
              className="btn-secondary rounded-lg px-2 py-1 text-xs text-rose-600"
              onClick={() => memberMut.deactivate.mutate(r.id)}
            >
              Nonaktifkan
            </button>
          )}
        </div>
      ),
    },
  ];

  const tierColumns: Column<MemberTier>[] = [
    { key: "kode", header: "Kode", render: (r) => <span className="font-mono text-xs font-bold">{r.kode}</span> },
    { key: "nama", header: "Nama", render: (r) => r.nama },
    { key: "minPoin", header: "Min. poin", align: "right", render: (r) => <span className="tabular-nums">{r.minPoin.toLocaleString("id-ID")}</span> },
    { key: "diskon", header: "Diskon", align: "right", render: (r) => <span className="tabular-nums">{(r.diskonPersen * 100).toFixed(1)}%</span> },
    { key: "pengali", header: "Pengali poin", align: "right", render: (r) => <span className="tabular-nums">x{r.pengaliPoin}</span> },
    { key: "aktif", header: "Status", align: "center", render: (r) => <StatusBadge label={r.aktif ? "Aktif" : "Nonaktif"} tone={r.aktif ? "success" : "danger"} /> },
    {
      key: "aksi",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary rounded-lg px-2 py-1 text-xs" onClick={() => bukaTier(r)}>
            Ubah
          </button>
          {r.aktif && (
            <button
              type="button"
              className="btn-secondary rounded-lg px-2 py-1 text-xs text-rose-600"
              onClick={() => tierMut.deactivate.mutate(r.id)}
            >
              Nonaktifkan
            </button>
          )}
        </div>
      ),
    },
  ];

  if (members.isLoading || tiers.isLoading || policy.isLoading) {
    return (
      <div>
        <PageHeader title="Member & Poin" description="Master member, tier, kebijakan, dan buku poin." />
        <KpiSkeleton />
      </div>
    );
  }

  const p = policyForm ?? policy.data;
  const TAB: Array<{ id: Tab; label: string }> = [
    { id: "member", label: "Member" },
    { id: "tier", label: "Tier" },
    { id: "policy", label: "Kebijakan Poin" },
    { id: "poin", label: "Riwayat Poin" },
  ];

  return (
    <div>
      <PageHeader
        title="Member & Poin"
        description="Engine yang menghitung diskon tier, nilai penukaran, dan poin yang diperoleh — POS hanya menampilkan hasilnya."
        actions={
          tab === "member" ? (
            <button type="button" className="btn-primary" onClick={() => bukaMember()}>
              <Plus className="size-4" aria-hidden /> Tambah Member
            </button>
          ) : tab === "tier" ? (
            <button type="button" className="btn-primary" onClick={() => bukaTier()}>
              <Plus className="size-4" aria-hidden /> Tambah Tier
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {TAB.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-semibold",
              tab === t.id ? "bg-brand text-white" : "bg-brand/5 text-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {memberError && (
        <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{memberError}</p>
      )}

      {tab === "member" && (
        <DataTable<Member>
          columns={memberColumns}
          rows={members.data ?? []}
          rowKey={(r) => r.id}
          empty="Belum ada member."
        />
      )}

      {tab === "tier" && (
        <DataTable<MemberTier>
          columns={tierColumns}
          rows={daftarTier}
          rowKey={(r) => r.id}
          empty="Belum ada tier."
        />
      )}

      {tab === "policy" && p && (
        <form onSubmit={simpanPolicy} className="panel max-w-xl space-y-3 p-5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={p.aktif}
              onChange={(e) => setPolicyForm({ ...p, aktif: e.target.checked })}
            />
            Program poin aktif
          </label>
          <FormField label="Poin per Rp1.000 penjualan">
            <input
              type="number"
              min={1}
              className="input"
              value={p.poinPerRibu}
              onChange={(e) => setPolicyForm({ ...p, poinPerRibu: Number(e.target.value) })}
            />
          </FormField>
          <FormField label="Nilai satu poin (rupiah)">
            <input
              type="number"
              min={1}
              className="input"
              value={p.nilaiPoin}
              onChange={(e) => setPolicyForm({ ...p, nilaiPoin: Number(e.target.value) })}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={p.autoTier}
              onChange={(e) => setPolicyForm({ ...p, autoTier: e.target.checked })}
            />
            Naikkan tier otomatis dari total poin seumur hidup
          </label>
          <p className="text-xs text-muted">
            Satu poin saat ini bernilai {formatIDR(p.nilaiPoin)}. Nilai ini dipakai engine saat menukar poin.
          </p>
          {policyError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{policyError}</p>}
          <button type="submit" className="btn-primary w-full" disabled={policyMut.isPending}>
            {policyMut.isPending ? "Menyimpan..." : "Simpan Kebijakan"}
          </button>
        </form>
      )}

      {tab === "poin" && (
        <div className="space-y-4">
          <form onSubmit={sesuaikanPoin} className="panel grid gap-3 p-5 md:grid-cols-4">
            <FormField label="Kode member">
              <input
                className="input font-mono uppercase"
                value={adjustKode}
                onChange={(e) => setAdjustKode(e.target.value.toUpperCase())}
                required
              />
            </FormField>
            <FormField label="Poin (+/-)">
              <input
                type="number"
                className="input"
                value={adjustPoin}
                onChange={(e) => setAdjustPoin(Number(e.target.value))}
                required
              />
            </FormField>
            <FormField label="Keterangan">
              <input
                className="input"
                value={adjustDeskripsi}
                onChange={(e) => setAdjustDeskripsi(e.target.value)}
              />
            </FormField>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full" disabled={memberMut.adjust.isPending}>
                Sesuaikan
              </button>
            </div>
            {adjustError && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 md:col-span-4">{adjustError}</p>
            )}
          </form>

          <FormField label="Riwayat member">
            <select
              className="input max-w-sm"
              value={selectedMember ?? ""}
              onChange={(e) => setSelectedMember(e.target.value || undefined)}
            >
              <option value="">Pilih member</option>
              {(members.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.kode} — {m.nama}</option>
              ))}
            </select>
          </FormField>

          {selectedMember && hargaMut.data && (
            <div className="panel grid gap-2 p-4 text-xs md:grid-cols-4">
              <span>Diskon tier: <strong className="tabular-nums">{formatIDR(hargaMut.data.diskonTier)}</strong></span>
              <span>Poin dipakai: <strong className="tabular-nums">{hargaMut.data.poinDipakai}</strong></span>
              <span>Diskon poin: <strong className="tabular-nums">{formatIDR(hargaMut.data.diskonPenukaran)}</strong></span>
              <span>Contoh poin didapat: <strong className="tabular-nums">{hargaMut.data.poinDapat}</strong></span>
            </div>
          )}

          <DataTable
            columns={[
              { key: "waktu", header: "Waktu", render: (r) => <span className="text-xs text-muted">{new Date(r.waktu).toLocaleString("id-ID")}</span> },
              { key: "tipe", header: "Tipe", render: (r) => <StatusBadge label={r.tipe} tone={r.tipe === "REDEEM" ? "warning" : "success"} /> },
              { key: "poin", header: "Poin", align: "right", render: (r) => <span className="tabular-nums font-bold">{r.poin > 0 ? "+" : ""}{r.poin}</span> },
              { key: "deskripsi", header: "Keterangan", render: (r) => r.deskripsi ?? r.penjualanId ?? "-" },
            ]}
            rows={riwayat.data ?? []}
            rowKey={(r) => r.id}
            empty={selectedMember ? "Belum ada pergerakan poin." : "Pilih member untuk melihat riwayat poin."}
            loading={riwayat.isLoading}
          />
        </div>
      )}

      {openMember && (
        <Dialog title={memberEditId ? `Ubah ${memberForm.kode}` : "Tambah Member"} onClose={() => setOpenMember(false)}>
          <form onSubmit={simpanMember} className="space-y-3">
            <FormField label="Kode member">
              <input
                className="input font-mono uppercase"
                value={memberForm.kode}
                onChange={(e) => setMemberForm({ ...memberForm, kode: e.target.value.toUpperCase() })}
                disabled={Boolean(memberEditId)}
                required
              />
            </FormField>
            <FormField label="Nama">
              <input
                className="input"
                value={memberForm.nama}
                onChange={(e) => setMemberForm({ ...memberForm, nama: e.target.value })}
                disabled={Boolean(memberEditId)}
                required
              />
            </FormField>
            <FormField label="Telepon">
              <input
                className="input"
                value={memberForm.telepon ?? ""}
                onChange={(e) => setMemberForm({ ...memberForm, telepon: e.target.value })}
              />
            </FormField>
            <FormField label="Tier">
              <select
                className="input"
                value={memberForm.tierId ?? ""}
                onChange={(e) => setMemberForm({ ...memberForm, tierId: e.target.value })}
              >
                <option value="">Tanpa tier</option>
                {daftarTier.map((t) => (
                  <option key={t.id} value={t.id}>{t.nama}</option>
                ))}
              </select>
            </FormField>
            {memberError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{memberError}</p>}
            <button type="submit" className="btn-primary w-full" disabled={memberMut.create.isPending || memberMut.update.isPending}>
              Simpan
            </button>
          </form>
        </Dialog>
      )}

      {openTier && (
        <Dialog title={tierEditId ? `Ubah ${tierForm.kode}` : "Tambah Tier"} onClose={() => setOpenTier(false)}>
          <form onSubmit={simpanTier} className="space-y-3">
            <FormField label="Kode tier">
              <input
                className="input font-mono uppercase"
                value={tierForm.kode}
                onChange={(e) => setTierForm({ ...tierForm, kode: e.target.value.toUpperCase() })}
                disabled={Boolean(tierEditId)}
                required
              />
            </FormField>
            <FormField label="Nama">
              <input
                className="input"
                value={tierForm.nama}
                onChange={(e) => setTierForm({ ...tierForm, nama: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Minimum poin">
              <input
                type="number"
                min={0}
                className="input"
                value={tierForm.minPoin}
                onChange={(e) => setTierForm({ ...tierForm, minPoin: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Diskon (0.05 = 5%)">
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                className="input"
                value={tierForm.diskonPersen}
                onChange={(e) => setTierForm({ ...tierForm, diskonPersen: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Pengali poin">
              <input
                type="number"
                step="0.1"
                min={0}
                className="input"
                value={tierForm.pengaliPoin}
                onChange={(e) => setTierForm({ ...tierForm, pengaliPoin: Number(e.target.value) })}
              />
            </FormField>
            {tierError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{tierError}</p>}
            <button type="submit" className="btn-primary w-full" disabled={tierMut.create.isPending || tierMut.update.isPending}>
              Simpan
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <div className="panel max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
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
