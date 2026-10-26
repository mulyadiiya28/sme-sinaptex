"use client";

import { useState } from "react";
import { Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import type { AuditEntry, User } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { useAuthUsers, useAuditLog } from "@/hooks/queries";
import { useAuth } from "@/lib/store/auth";
import { useToko } from "@/lib/store/toko";
import { cn } from "@/lib/utils";

type Tab = "profil" | "operasional" | "akuntansi" | "keamanan";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "profil", label: "Profil Toko" },
  { id: "operasional", label: "Operasional" },
  { id: "akuntansi", label: "Akuntansi" },
  { id: "keamanan", label: "Keamanan" },
];

export default function PengaturanPage() {
  const [tab, setTab] = useState<Tab>("profil");

  return (
    <div>
      <PageHeader
        title="Pengaturan"
        description="Profil toko, operasional, akuntansi, dan keamanan."
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

      {tab === "profil" && <PanelProfil />}
      {tab === "operasional" && <PanelInfo grup="Operasional" />}
      {tab === "akuntansi" && <PanelInfo grup="Akuntansi" />}
      {tab === "keamanan" && <PanelKeamanan />}
    </div>
  );
}

function PanelProfil() {
  const profil = useToko((s) => s.profil);
  const simpan = useToko((s) => s.simpan);
  const [draft, setDraft] = useState(profil);
  const [sukses, setSukses] = useState(false);

  const ubah = (k: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSukses(false);
    setDraft({ ...draft, [k]: e.target.value });
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <form
        className="panel space-y-3.5 p-5 xl:col-span-2"
        onSubmit={(e) => {
          e.preventDefault();
          simpan(draft);
          setSukses(true);
        }}
      >
        <h2 className="flex items-center gap-2 text-sm font-bold text-brand">
          <Building2 className="size-4" aria-hidden />
          Identitas toko
        </h2>
        <FormField label="Nama toko">
          <input className="input" value={draft.nama} onChange={ubah("nama")} required />
        </FormField>
        <FormField label="Alamat">
          <input className="input" value={draft.alamat} onChange={ubah("alamat")} />
        </FormField>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <FormField label="Telepon">
            <input className="input" value={draft.telepon} onChange={ubah("telepon")} placeholder="cth. 0812xxxxxxx" />
          </FormField>
          <FormField label="Mata uang">
            <input className="input" value={draft.mataUang} onChange={ubah("mataUang")} placeholder="IDR" />
          </FormField>
        </div>
        <FormField label="Zona waktu">
          <input className="input" value={draft.zonaWaktu} onChange={ubah("zonaWaktu")} placeholder="Asia/Jakarta" />
        </FormField>
        <FormField label="Catatan footer struk">
          <input className="input" value={draft.footerStruk} onChange={ubah("footerStruk")} />
        </FormField>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary">Simpan Profil</button>
          {sukses && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" aria-hidden /> Profil tersimpan
            </span>
          )}
        </div>
      </form>

      <div className="panel p-5 text-sm">
        <p className="font-bold text-brand">Pratinjau identitas</p>
        <div className="mt-3 rounded-xl border border-line p-4">
          <p className="text-lg font-black text-brand">{draft.nama || "—"}</p>
          <p className="mt-1 text-xs text-muted">{draft.alamat || "Alamat belum diisi"}</p>
          {draft.telepon && <p className="text-xs text-muted">{draft.telepon}</p>}
          <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
            {draft.footerStruk || "—"}
          </p>
        </div>
        <p className="mt-3 text-xs text-muted">
          Logo toko, printer struk, dan konfigurasi lanjutan menyusul saat disambung ke engine C#.
        </p>
      </div>
    </div>
  );
}

function PanelInfo({ grup }: { grup: string }) {
  const daftar =
    grup === "Operasional"
      ? ["Satuan & kategori produk", "Printer & scanner barcode", "Kebijakan stok & pajak", "Metode pembayaran aktif"]
      : ["Daftar akun & pemetaan", "Kebijakan HPP", "Periode akuntansi", "Konfigurasi pajak"];
  return (
    <div className="panel p-6">
      <h2 className="text-sm font-bold text-brand">{grup}</h2>
      <ul className="mt-3 space-y-2 text-sm text-muted">
        {daftar.map((t) => (
          <li key={t} className="flex items-center justify-between border-b border-line/60 pb-2">
            <span>{t}</span>
            <StatusBadge label="Menyusul (P1/P2)" tone="neutral" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PanelKeamanan() {
  const users = useAuthUsers();
  const audit = useAuditLog();
  const user = useAuth((s) => s.user);

  const kolomUser: Column<User>[] = [
    { key: "nama", header: "Nama", render: (r) => <span className="font-medium">{r.nama}</span> },
    { key: "username", header: "Username", render: (r) => <span className="font-mono text-xs text-muted">{r.username}</span> },
    {
      key: "role",
      header: "Peran",
      align: "center",
      render: (r) => (
        <StatusBadge
          label={r.role === "pemilik" ? "Pemilik" : "Kasir"}
          tone={r.role === "pemilik" ? "success" : "info"}
        />
      ),
    },
    { key: "sesi", header: "Sesi", render: () => (user ? "—" : "—") },
  ];

  const kolomAudit: Column<AuditEntry>[] = [
    {
      key: "waktu",
      header: "Waktu",
      render: (r) => (
        <span className="text-muted">
          {new Date(r.waktu).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    { key: "user", header: "Pengguna", render: (r) => <span className="font-medium">{r.user}</span> },
    { key: "aksi", header: "Aksi", align: "center", render: (r) => <StatusBadge label={r.aksi} tone="info" /> },
    { key: "detail", header: "Detail", render: (r) => <span className="text-muted">{r.detail}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="panel p-4">
        <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-bold text-brand">
          <ShieldCheck className="size-4" aria-hidden />
          Pengguna &amp; hak akses
        </h2>
        <DataTable columns={kolomUser} rows={users.data ?? []} rowKey={(r) => r.id} empty="Belum ada pengguna." />
        <p className="mt-3 px-1 text-xs text-muted">
          Kelola pengguna (tambah/hapus, ganti password) akan dilakukan oleh engine C# — frontend hanya menampilkan.
        </p>
      </div>
      <div className="panel p-4">
        <h2 className="mb-3 px-1 text-sm font-bold text-brand">Audit log sesi</h2>
        <DataTable columns={kolomAudit} rows={audit.data ?? []} rowKey={(r) => r.id} empty="Belum ada aktivitas tercatat." />
      </div>
    </div>
  );
}
