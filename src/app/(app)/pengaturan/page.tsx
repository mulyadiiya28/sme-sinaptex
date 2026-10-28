"use client";

import { useRef, useState } from "react";
import { Building2, CheckCircle2, FileDown, FileUp, ShieldCheck } from "lucide-react";
import type { AuditEntry, HasilImpor, ImporPelangganBaris, ImporProdukBaris, ImporSaldoAwalBaris, User } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { useAkun, useAuditLog, useAuthUsers, useImporMutations, useUserMutations } from "@/hooks/queries";
import { unduhCsv, parseCsv } from "@/lib/csv";
import { useAuth } from "@/lib/store/auth";
import { useToko } from "@/lib/store/toko";
import { cn } from "@/lib/utils";

type Tab = "profil" | "migrasi" | "operasional" | "akuntansi" | "keamanan";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "profil", label: "Profil Toko" },
  { id: "migrasi", label: "Impor & Migrasi" },
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
        description="Profil toko, impor data, operasional, akuntansi, dan keamanan."
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
      {tab === "migrasi" && <PanelMigrasi />}
      {tab === "operasional" && <PanelInfo grup="Operasional" />}
      {tab === "akuntansi" && <PanelInfo grup="Akuntansi" />}
      {tab === "keamanan" && <PanelKeamanan />}
    </div>
  );
}

type KartuImporProps<T> = {
  judul: string;
  deskripsi: string;
  namaTemplate: string;
  headerTemplate: string[];
  barisContoh: Array<Array<string | number>>;
  kolom: Column<T>[];
  jalankan: (rows: T[], user: User) => void;
  pending: boolean;
};

function KartuImpor<T extends object>({ judul, deskripsi, namaTemplate, headerTemplate, barisContoh, kolom, jalankan, pending }: KartuImporProps<T>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [namaBerkas, setNamaBerkas] = useState("");
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const user = useAuth((s) => s.user);

  async function terimaFile(f: File | undefined) {
    setError(null);
    setRows(null);
    if (!f) return;
    setNamaBerkas(f.name);
    try {
      const teks = await f.text();
      const parsed = parseCsv(teks);
      if (parsed.length < 2) throw new Error("Berkas kosong atau hanya berisi header.");
      const header = parsed[0].map((h) => h.trim().toLowerCase());
      const cocok = headerTemplate.map((h) => h.trim().toLowerCase());
      if (header.length !== cocok.length || header.some((h, i) => h !== cocok[i])) {
        throw new Error(`Header tidak sesuai template: harus "${headerTemplate.join(",")}".`);
      }
      const data = parsed.slice(1).map((r) => {
        const obj: Record<string, string> = {};
        headerTemplate.forEach((h, i) => {
          obj[h] = (r[i] ?? "").trim();
        });
        return obj;
      });
      const map = (obj: Record<string, string>): T => {
        const cast: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
          if (/^(hargaBeli|hargaJual|stok|stokMinimum|batasKredit|debit|kredit)$/.test(k)) {
            cast[k] = Number(v);
          } else {
            cast[k] = v;
          }
        }
        return cast as T;
      };
      setRows(data.map(map));
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
    }
  }

  return (
    <div className="panel p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-brand">
        <FileUp className="size-4" aria-hidden /> {judul}
      </h2>
      <p className="mt-1 text-xs text-muted">{deskripsi}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => unduhCsv(namaTemplate, headerTemplate, barisContoh)}
        >
          <FileDown className="size-4" aria-hidden /> Unduh Template
        </button>
        <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
          Pilih Berkas CSV...
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => terimaFile(e.target.files?.[0])}
        />
        {namaBerkas && <span className="self-center text-xs text-muted">{namaBerkas}</span>}
      </div>
      {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      {rows && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-ink">
            Pratinjau: {rows.length} baris — periksa lalu simpan.
          </p>
          <div className="mt-2 max-h-64 overflow-auto">
            <DataTable<T> columns={kolom} rows={rows} />
          </div>
          <button
            type="button"
            disabled={pending || rows.length === 0 || !user}
            className="btn-primary mt-3"
            onClick={() => {
              jalankan(rows, user!);
              setRows(null);
              setNamaBerkas("");
              if (fileRef.current) fileRef.current.value = "";
            }}
          >
            {pending ? "Menyimpan..." : `Simpan ${rows.length} Baris`}
          </button>
        </div>
      )}
    </div>
  );
}

function PanelMigrasi() {
  const { produk, pelanggan, saldoAwal } = useImporMutations();
  const akun = useAkun();
  const user = useAuth((s) => s.user);
  const [hasil, setHasil] = useState<Record<string, HasilImpor | null>>({});
  const [error, setError] = useState<string | null>(null);
  const daftarAkun = (akun.data ?? []).map((a) => a.akun).join(", ");

  if (user?.role !== "pemilik") {
    return (
      <div className="panel p-6 text-sm text-muted">
        Impor data hanya bisa dilakukan oleh pemilik.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="panel p-5 text-sm">
        <p className="font-bold text-brand">Migrasi data usaha lama</p>
        <p className="mt-1 text-xs text-muted">
          Untuk toko yang sudah berjalan: isi template CSV, unggah, periksa pratinjau, lalu simpan. Saldo awal GL
          menggantikan modal awal default — jurnal neraca pembuka dibuat otomatis dan wajib seimbang.
        </p>
      </div>

      <KartuImpor<ImporProdukBaris>
        judul="Impor Produk"
        deskripsi="SKU & nama wajib; harga jual > 0; satuan harus sudah ada di master unit. Mock menolak baris bermasalah satu per satu; mode live all-or-nothing (satu baris ditolak = tidak ada yang disimpan) dan stok awal tidak diimpor."
        namaTemplate="template-produk.csv"
        headerTemplate={["sku", "nama", "barcode", "satuan", "kategori", "hargaBeli", "hargaJual", "stok", "stokMinimum"]}
        barisContoh={[["BRG-001", "Beras 5 kg", "8991000010015", "sak", "Sembako", 60000, 75000, 12, 5]]}
        kolom={[
          { key: "sku", header: "SKU", render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
          { key: "nama", header: "Nama", render: (r) => <span className="font-medium">{r.nama}</span> },
          { key: "barcode", header: "Barcode", render: (r) => <span className="font-mono text-xs text-muted">{r.barcode || "—"}</span> },
          { key: "satuan", header: "Satuan", align: "center", render: (r) => r.satuan || "pcs" },
          { key: "hargaBeli", header: "H. beli", align: "right", render: (r) => <MoneyDisplay value={r.hargaBeli} /> },
          { key: "hargaJual", header: "H. jual", align: "right", render: (r) => <MoneyDisplay value={r.hargaJual} /> },
          { key: "stok", header: "Stok", align: "center", render: (r) => r.stok },
          { key: "stokMinimum", header: "Min", align: "center", render: (r) => r.stokMinimum },
        ]}
        pending={produk.isPending}
        jalankan={(rows, u) =>
          produk.mutate(
            { rows, user: u },
            {
              onSuccess: (res) => setHasil((h) => ({ ...h, produk: res })),
              onError: (err) => setError(String(err)),
            },
          )
        }
      />

      <KartuImpor<ImporPelangganBaris>
        judul="Impor Pelanggan"
        deskripsi="Nama wajib; nama duplikat ditolak; batasKredit kosong = tanpa limit."
        namaTemplate="template-pelanggan.csv"
        headerTemplate={["nama", "telepon", "alamat", "batasKredit"]}
        barisContoh={[["Bu Sari", "0812xxxxxxx", "Jl. Merdeka No. 3", 500000]]}
        kolom={[
          { key: "nama", header: "Nama", render: (r) => <span className="font-medium">{r.nama}</span> },
          { key: "telepon", header: "Telepon", render: (r) => r.telepon || "—" },
          { key: "alamat", header: "Alamat", render: (r) => <span className="text-muted">{r.alamat || "—"}</span> },
          { key: "batasKredit", header: "Batas kredit", align: "right", render: (r) => (r.batasKredit > 0 ? <MoneyDisplay value={r.batasKredit} /> : "—") },
        ]}
        pending={pelanggan.isPending}
        jalankan={(rows, u) =>
          pelanggan.mutate(
            { rows, user: u },
            {
              onSuccess: (res) => setHasil((h) => ({ ...h, pelanggan: res })),
              onError: (err) => setError(String(err)),
            },
          )
        }
      />

      <KartuImpor<ImporSaldoAwalBaris>
        judul="Impor Saldo Awal GL (Neraca Pembuka)"
        deskripsi={`Nama akun harus sesuai daftar akun; total debit harus sama dengan total kredit. Menggantikan saldo pembuka sebelumnya.${daftarAkun ? ` Akun tersedia: ${daftarAkun}.` : ""}`}
        namaTemplate="template-saldo-awal-gl.csv"
        headerTemplate={["akun", "debit", "kredit"]}
        barisContoh={[
          ["Kas", 1500000, 0],
          ["Bank", 3000000, 0],
          ["Persediaan", 8250000, 0],
          ["Modal", 0, 12750000],
        ]}
        kolom={[
          { key: "akun", header: "Akun", render: (r) => <span className="font-medium">{r.akun}</span> },
          { key: "debit", header: "Debit", align: "right", render: (r) => <MoneyDisplay value={r.debit} /> },
          { key: "kredit", header: "Kredit", align: "right", render: (r) => <MoneyDisplay value={r.kredit} /> },
        ]}
        pending={saldoAwal.isPending}
        jalankan={(rows, u) =>
          saldoAwal.mutate(
            { rows, user: u },
            {
              onSuccess: (res) => setHasil((h) => ({ ...h, saldoAwal: res })),
              onError: (err) => setError(String(err)),
            },
          )
        }
      />

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {Object.entries(hasil).map(([kunci, res]) =>
        res ? (
          <div key={kunci} className="panel p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
              <p className="text-sm font-bold text-ink">{res.sukses} baris tersimpan</p>
              <StatusBadge label={`${res.gagal} ditolak`} tone={res.gagal > 0 ? "warning" : "success"} />
            </div>
            {res.pesan.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-rose-700">
                {res.pesan.slice(0, 10).map((p, i) => <li key={i}>• {p}</li>)}
                {res.pesan.length > 10 && <li>… {res.pesan.length - 10} pesan lainnya</li>}
              </ul>
            )}
          </div>
        ) : null,
      )}
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
        <FormField label="Pajak transaksi (%)">
          <input
            type="number"
            min={0}
            max={100}
            className="input text-right tabular-nums"
            value={draft.pajakPersen ?? 0}
            onChange={(e) => setDraft({ ...draft, pajakPersen: Number(e.target.value) })}
            placeholder="0"
          />
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
      ? ["Printer & scanner barcode", "Multi outlet / gudang", "Queue mutasi offline (P2)"]
      : ["Kebijakan HPP", "Periode akuntansi", "Konfigurasi pajak lanjutan"];
  return (
    <div className="panel p-6">
      <h2 className="text-sm font-bold text-brand">{grup}</h2>
      <ul className="mt-3 space-y-2 text-sm text-muted">
        {daftar.map((t) => (
          <li key={t} className="flex items-center justify-between border-b border-line/60 pb-2">
            <span>{t}</span>
            <StatusBadge label="Menyusul (P2)" tone="neutral" />
          </li>
        ))}
      </ul>
      {grup === "Operasional" && <KebijakanOperasional />}
      {grup === "Akuntansi" && <DaftarAkunInfo />}
    </div>
  );
}

function KebijakanOperasional() {
  const kebijakan = useToko((s) => s.kebijakan);
  const simpanKebijakan = useToko((s) => s.simpanKebijakan);

  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="text-sm font-semibold text-ink">Kebijakan penjualan kredit</p>
      <label className="mt-2 flex items-center gap-2.5 text-sm text-muted">
        <input
          type="checkbox"
          checked={kebijakan.izinkanKredit}
          onChange={(e) => simpanKebijakan({ ...kebijakan, izinkanKredit: e.target.checked })}
        />
        Izinkan kasir mengubah sisa pembayaran menjadi piutang (penjualan kredit)
      </label>
      <p className="mt-1.5 text-xs text-muted">
        Bila nonaktif, kasir harus melunasi seluruh sisa — kotak piutang di dialog pembayaran terkunci. Di live, kebijakan ini divalidasi ulang oleh engine C#.
      </p>
    </div>
  );
}

function DaftarAkunInfo() {
  const akun = useAkun();
  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="text-sm font-semibold text-ink">Daftar akun (dari engine)</p>
      <ul className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-muted sm:grid-cols-2">
        {(akun.data ?? []).map((a) => (
          <li key={a.akun} className="flex items-center justify-between rounded-lg border border-line/60 bg-white px-2.5 py-1.5">
            <span className="font-medium text-ink">{a.akun}</span>
            <span className="tabular-nums"><MoneyDisplay value={a.saldo} /></span>
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
  const { buat, ubah, hapus } = useUserMutations();
  const [form, setForm] = useState({ nama: "", username: "", password: "", role: "kasir" as User["role"] });
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [targetUbah, setTargetUbah] = useState<User | null>(null);
  const [targetHapus, setTargetHapus] = useState<User | null>(null);

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
    {
      key: "aksi",
      header: "",
      align: "right",
      render: (r) => (
        user?.role === "pemilik" ? (
          <div className="flex justify-end gap-1.5">
            <button type="button" onClick={() => setTargetUbah(r)} className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs">Ubah</button>
            {r.id !== user.id && (
              <button type="button" onClick={() => setTargetHapus(r)} className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs text-rose-600">Hapus</button>
            )}
          </div>
        ) : null
      ),
    },
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
        {user?.role === "pemilik" && (
          <form
            className="mb-4 flex flex-wrap items-end gap-2.5 rounded-xl border border-line bg-slate-50/60 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              setSukses(null);
              buat.mutate(
                { input: form, actor: user },
                {
                  onSuccess: () => {
                    setForm({ nama: "", username: "", password: "", role: "kasir" });
                    setSukses("Pengguna baru tersimpan.");
                  },
                  onError: (err) => setError(String(err).replace("Error: ", "")),
                },
              );
            }}
          >
            <FormField label="Nama">
              <input className="input w-40" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </FormField>
            <FormField label="Username">
              <input className="input w-32" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </FormField>
            <FormField label="Password (min. 6)">
              <input type="password" className="input w-36" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </FormField>
            <FormField label="Peran">
              <select className="input w-28" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User["role"] })}>
                <option value="kasir">Kasir</option>
                <option value="pemilik">Pemilik</option>
              </select>
            </FormField>
            <button type="submit" disabled={buat.isPending} className="btn-primary">Tambah</button>
          </form>
        )}
        {error && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        {sukses && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{sukses}</p>}
        <DataTable columns={kolomUser} rows={users.data ?? []} rowKey={(r) => r.id} empty="Belum ada pengguna." />
        <p className="mt-3 px-1 text-xs text-muted">
          Password disimpan oleh engine; di live, tambah/ubah/hapus pengguna tetap lewat API C# dengan audit log.
        </p>
      </div>
      <div className="panel p-4">
        <h2 className="mb-3 px-1 text-sm font-bold text-brand">Audit log sesi</h2>
        <DataTable columns={kolomAudit} rows={audit.data ?? []} rowKey={(r) => r.id} empty="Belum ada aktivitas tercatat." />
      </div>

      {targetUbah && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={() => setTargetUbah(null)}>
          <div className="panel w-full max-w-sm p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-brand">Ubah {targetUbah.nama}</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                if (!user) return;
                const data = new FormData(e.currentTarget);
                const password = String(data.get("password") ?? "");
                const role = String(data.get("role") ?? targetUbah.role) as User["role"];
                ubah.mutate(
                  { id: targetUbah.id, input: { ...(password ? { password } : {}), role }, actor: user },
                  { onSuccess: () => setTargetUbah(null), onError: (err) => setError(String(err).replace("Error: ", "")) },
                );
              }}
            >
              <FormField label="Password baru (kosongkan = tidak diubah)">
                <input type="password" name="password" className="input" />
              </FormField>
              <FormField label="Peran">
                <select name="role" defaultValue={targetUbah.role} className="input">
                  <option value="kasir">Kasir</option>
                  <option value="pemilik">Pemilik</option>
                </select>
              </FormField>
              {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={ubah.isPending} className="btn-primary flex-1">Simpan</button>
                <button type="button" onClick={() => setTargetUbah(null)} className="btn-secondary">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {targetHapus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={() => setTargetHapus(null)}>
          <div className="panel w-full max-w-sm p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-brand">Hapus {targetHapus.nama}?</h2>
            <p className="mt-2 text-sm text-muted">Pengguna ini tidak akan bisa login lagi.</p>
            {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={hapus.isPending}
                className="btn-primary flex-1 bg-rose-600 hover:bg-rose-500"
                onClick={() => {
                  if (!user) return;
                  hapus.mutate(
                    { id: targetHapus.id, actor: user },
                    { onSuccess: () => setTargetHapus(null), onError: (err) => setError(String(err).replace("Error: ", "")) },
                  );
                }}
              >
                {hapus.isPending ? "Memproses..." : "Ya, Hapus"}
              </button>
              <button type="button" onClick={() => setTargetHapus(null)} className="btn-secondary">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
