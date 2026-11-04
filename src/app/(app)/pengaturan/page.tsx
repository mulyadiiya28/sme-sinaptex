"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Calendar, CheckCircle2, FileDown, FileUp, Lock, Menu, Plus, RotateCcw, ShieldCheck, X } from "lucide-react";
import type {
  AuditEntry,
  CompanyProfile,
  CreateFiscalPeriodRequest,
  FiscalPeriod,
  HasilImpor,
  ImporPelangganBaris,
  ImporProdukBaris,
  ImporSaldoAwalBaris,
  KebijakanOperasional,
  User,
} from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { useAkun, useAuditLog, useAuthUsers, useFiscalPeriodList, useImporMutations, useUserMutations } from "@/hooks/queries";
import { urlLogoAbsolut } from "@/lib/api/live";
import { API_MODE } from "@/lib/api/client";
import { unduhCsv, parseCsv } from "@/lib/csv";
import { api } from "@/lib/api/client";
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

type DraftProfil = CompanyProfile & {
  mataUang: string;
  zonaWaktu: string;
  footerStruk: string;
  pajakPersen?: number;
};

function PanelProfil() {
  const profil = useToko((s) => s.profil);
  const simpanLokal = useToko((s) => s.simpan);
  const [draft, setDraft] = useState<DraftProfil>({
    nama: profil.nama,
    alamat: profil.alamat,
    telepon: profil.telepon,
    email: "",
    website: "",
    npwp: "",
    logoUrl: "",
    mataUang: profil.mataUang,
    zonaWaktu: profil.zonaWaktu,
    footerStruk: profil.footerStruk,
    pajakPersen: profil.pajakPersen,
  });
  const [sukses, setSukses] = useState(false);
  const [mudah, setMudah] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoSukses, setLogoSukses] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const dimuat = useRef(false);

  // Saat mode live, ambil profil dari engine saat halaman pertama kali dibuka
  // agar nama/alamat/NPWP yang sudah ada di engine tampil di form.
  useEffect(() => {
    if (dimuat.current) return;
    dimuat.current = true;
    api.toko.profil
      .get()
      .then((p) => {
        setDraft((d) => ({
          ...d,
          nama: p.nama || d.nama,
          alamat: p.alamat || d.alamat,
          telepon: p.telepon || d.telepon,
          email: p.email ?? d.email,
          website: p.website ?? d.website,
          npwp: p.npwp ?? d.npwp,
          logoUrl: p.logoUrl ?? d.logoUrl,
        }));
      })
      .catch((err) => console.error("Gagal muat profil toko:", err));
  }, []);

  const ubah = (k: keyof DraftProfil) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSukses(false);
    setDraft({ ...draft, [k]: e.target.value });
  };

  const simpanSemua = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMudah(true);
    setError(null);
    try {
      const tersimpan = await api.toko.profil.put({
        nama: draft.nama,
        alamat: draft.alamat,
        telepon: draft.telepon,
        email: draft.email,
        website: draft.website,
        npwp: draft.npwp,
        logoUrl: draft.logoUrl,
      });
      setDraft((d) => ({
        ...d,
        nama: tersimpan.nama,
        alamat: tersimpan.alamat,
        telepon: tersimpan.telepon,
        email: tersimpan.email,
        website: tersimpan.website,
        npwp: tersimpan.npwp,
        logoUrl: tersimpan.logoUrl,
      }));
      // Field khusus POS (struk, pajak, zona waktu) tetap di localStorage.
      simpanLokal({
        nama: tersimpan.nama,
        alamat: tersimpan.alamat,
        telepon: tersimpan.telepon,
        mataUang: draft.mataUang,
        zonaWaktu: draft.zonaWaktu,
        footerStruk: draft.footerStruk,
        pajakPersen: draft.pajakPersen,
      });
      setSukses(true);
    } catch (err) {
      setSukses(false);
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setMudah(false);
    }
  };

  /**
   * Logo disimpan engine (file-nya dipakai server faktur PDF), bukan di
   * browser POS — jadi struk dan faktur memakai berkas yang sama.
   */
  async function pilihLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoError(null);
    setLogoSukses(false);

    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      setLogoError("Format logo harus PNG atau JPEG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Ukuran logo maksimal 2 MB.");
      return;
    }

    try {
      const p = await api.pengaturan.unggahLogo(file);
      setDraft((d) => ({ ...d, logoUrl: p.logoUrl }));
      const store = useToko.getState();
      simpanLokal({ ...store.profil, logoUrl: p.logoUrl });
      setLogoSukses(true);
    } catch (err) {
      setLogoError(String(err instanceof Error ? err.message : err));
    }
  }

  async function hapusLogo() {
    setLogoError(null);
    setLogoSukses(false);
    try {
      await api.toko.profil.put({
        nama: draft.nama,
        alamat: draft.alamat,
        telepon: draft.telepon,
        email: draft.email,
        website: draft.website,
        npwp: draft.npwp,
        logoUrl: "",
      });
      setDraft((d) => ({ ...d, logoUrl: "" }));
      const store = useToko.getState();
      simpanLokal({ ...store.profil, logoUrl: "" });
    } catch (err) {
      setLogoError(String(err instanceof Error ? err.message : err));
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <form className="panel space-y-3.5 p-5 xl:col-span-2" onSubmit={simpanSemua}>
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
          <FormField label="Email">
            <input className="input" type="email" value={draft.email} onChange={ubah("email")} placeholder="cth. toko@contoh.com" />
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <FormField label="Website">
            <input className="input" value={draft.website} onChange={ubah("website")} placeholder="cth. https://toko.contoh.id" />
          </FormField>
          <FormField label="NPWP">
            <input className="input" value={draft.npwp} onChange={ubah("npwp")} placeholder="cth. 01.234.567.8-910.000" />
          </FormField>
        </div>
        <FormField label="Mata uang">
          <input className="input" value={draft.mataUang} onChange={ubah("mataUang")} placeholder="IDR" />
        </FormField>
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
          <button type="submit" className={cn("btn-primary", mudah && "opacity-70")} disabled={mudah}>
            {mudah ? "Menyimpan..." : "Simpan Profil"}
          </button>
          {sukses && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" aria-hidden /> Profil tersimpan
            </span>
          )}
          {error && <span className="text-xs font-semibold text-rose-600">{error}</span>}
        </div>
      </form>

      <div className="space-y-4">
        <div className="panel p-5 text-sm">
          <p className="font-bold text-brand">Pratinjau identitas</p>
          <div className="mt-3 rounded-xl border border-line p-4">
            {draft.logoUrl && (
              <img
                src={urlLogoAbsolut(draft.logoUrl)}
                alt={`Logo ${draft.nama || "toko"}`}
                className="mb-3 h-16 w-auto rounded-lg border border-line bg-white object-contain p-1"
              />
            )}
            <p className="text-lg font-black text-brand">{draft.nama || "—"}</p>
            <p className="mt-1 text-xs text-muted">{draft.alamat || "Alamat belum diisi"}</p>
            {draft.telepon && <p className="text-xs text-muted">{draft.telepon}</p>}
            <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
              {draft.footerStruk || "—"}
            </p>
          </div>
          <p className="mt-3 text-xs text-muted">
            Identitas toko disimpan di engine akuntansi, jadi struk POS dan faktur PDF memakai nama
            yang sama.
          </p>
        </div>

        <div className="panel p-5 text-sm">
          <p className="font-bold text-brand">Logo toko</p>
          {draft.logoUrl ? (
            <img
              src={urlLogoAbsolut(draft.logoUrl)}
              alt="Logo toko"
              className="mt-3 h-20 w-auto rounded-xl border border-line bg-white object-contain p-1.5"
            />
          ) : (
            <p className="mt-2 text-xs text-muted">
              Belum ada logo. Logo disimpan engine dan dipakai pada faktur PDF.
            </p>
          )}

          <label className="mt-3 block text-xs font-semibold text-ink" htmlFor="logo-toko">
            Pilih berkas (PNG/JPEG, maks 2 MB)
          </label>
          <input
            id="logo-toko"
            className="input mt-1.5 text-xs"
            type="file"
            accept="image/png,image/jpeg"
            onChange={pilihLogo}
            disabled={API_MODE !== "live"}
          />
          {API_MODE !== "live" && (
            <p className="mt-1.5 text-xs text-muted">
              Unggah logo tersedia di mode live — engine yang menyimpan berkas logo.
            </p>
          )}
          {draft.logoUrl && (
            <button type="button" onClick={hapusLogo} className="btn-secondary mt-3" disabled={mudah}>
              Hapus logo
            </button>
          )}
          {logoSukses && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" aria-hidden /> Logo tersimpan
            </p>
          )}
          {logoError && <p className="mt-2 text-xs font-semibold text-rose-600">{logoError}</p>}
        </div>
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
      {grup === "Operasional" && <PanelKebijakanOperasional />}
      {grup === "Akuntansi" && (
        <>
          <DaftarAkunInfo />
          <PanelFiscalPeriods />
        </>
      )}
    </div>
  );
}

function PanelKebijakanOperasional() {
  const kebijakanLokal = useToko((s) => s.kebijakan);
  const simpanKebijakanLokal = useToko((s) => s.simpanKebijakan);
  const [draft, setDraft] = useState<KebijakanOperasional>({
    izinkanKredit: kebijakanLokal.izinkanKredit,
    saldoAwalShift: kebijakanLokal.saldoAwalShift,
  });
  const [sukses, setSukses] = useState(false);
  const [mudah, setMudah] = useState(false);
  const dimuat = useRef(false);

  // Saat mode live, ambil kebijakan dari engine saat halaman pertama kali dibuka.
  useEffect(() => {
    if (dimuat.current) return;
    dimuat.current = true;
    api.toko.kebijakan
      .get()
      .then((k) => setDraft(k))
      .catch((err) => console.error("Gagal muat kebijakan operasional:", err));
  }, []);

  const simpanSemua = async () => {
    setMudah(true);
    try {
      const tersimpan = await api.toko.kebijakan.put(draft);
      setDraft(tersimpan);
      simpanKebijakanLokal(tersimpan);
      setSukses(true);
    } catch (err) {
      setSukses(false);
      throw err;
    } finally {
      setMudah(false);
    }
  };

  const ubahKredit = (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...draft, izinkanKredit: e.target.checked });

  const ubahSaldo = (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...draft, saldoAwalShift: Number(e.target.value) });

  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="text-sm font-semibold text-ink">Kebijakan penjualan kredit</p>
      <label className="mt-2 flex items-center gap-2.5 text-sm text-muted">
        <input
          type="checkbox"
          checked={draft.izinkanKredit}
          onChange={ubahKredit}
          disabled={mudah}
        />
        Izinkan kasir mengubah sisa pembayaran menjadi piutang (penjualan kredit)
      </label>
      <p className="mt-1.5 text-xs text-muted">
        Bila nonaktif, kasir harus melunasi seluruh sisa — kotak piutang di dialog pembayaran terkunci. Di live, kebijakan ini divalidasi ulang oleh engine C#.
      </p>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-sm font-semibold text-ink">Kas awal laci saat buka shift</p>
        <div className="mt-2 max-w-48">
          <FormField label="Nilai default (Rp)" hint="Kasir tetap menyesuaikan dengan uang fisik di laci.">
            <input
              type="number"
              min={0}
              className="input text-right tabular-nums"
              value={draft.saldoAwalShift ?? 0}
              onChange={ubahSaldo}
              disabled={mudah}
            />
          </FormField>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={simpanSemua}
          className={cn("btn-primary", mudah && "opacity-70")}
          disabled={mudah}
        >
          {mudah ? "Menyimpan..." : "Simpan Kebijakan"}
        </button>
        {sukses && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="size-4" aria-hidden /> Tersimpan
          </span>
        )}
      </div>
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

function PanelFiscalPeriods() {
  const periods = useFiscalPeriodList();
  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFiscalPeriodRequest>({
    name: "",
    startDate: "",
    endDate: "",
    status: "OPEN",
  });
  const [createPending, setCreatePending] = useState(false);
  const [closePending, setClosePending] = useState(false);

  const statusWarna: Record<string, StatusTone> = {
    OPEN: "success",
    CLOSED: "danger",
    LOCKED: "neutral",
  };

  const statusLabel: Record<string, string> = {
    OPEN: "Buka",
    CLOSED: "Tutup",
    LOCKED: "Kunci",
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatePending(true);
    try {
      await api.akuntansi.fiscalPeriods.create(createForm);
      setCreateForm({ name: "", startDate: "", endDate: "", status: "OPEN" });
      setOpenCreate(false);
    } catch (err) {
      alert(String(err));
    } finally {
      setCreatePending(false);
    }
  };

  const handleClose = async (id: string) => {
    const user = useAuth.getState().user;
    if (!user) return;
    setClosePending(true);
    try {
      await api.akuntansi.fiscalPeriods.close(id, user.id, crypto.randomUUID());
    } catch (err) {
      alert(String(err));
    } finally {
      setClosePending(false);
    }
  };

  const handleLock = async (id: string) => {
    const user = useAuth.getState().user;
    if (!user) return;
    const reason = window.prompt("Alasan mengunci periode:");
    if (!reason) return;
    try {
      await api.akuntansi.fiscalPeriods.lock(id, user.id, "99", reason, crypto.randomUUID());
    } catch (err) {
      alert(String(err));
    }
  };

  const handleReopen = async (id: string) => {
    const user = useAuth.getState().user;
    if (!user) return;
    const reason = window.prompt("Alasan membuka kembali periode:");
    if (!reason) return;
    try {
      await api.akuntansi.fiscalPeriods.reopen(id, user.id, "99", reason, crypto.randomUUID());
    } catch (err) {
      alert(String(err));
    }
  };

  const handleReverseClosing = async (id: string) => {
    const user = useAuth.getState().user;
    if (!user) return;
    const reason = window.prompt("Alasan membalikkan penutupan tahun:");
    if (!reason) return;
    try {
      await api.akuntansi.fiscalPeriods.reverseClosing(id, user.id, "99", reason, crypto.randomUUID());
    } catch (err) {
      alert(String(err));
    }
  };

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-brand">Periode Fiskal</h2>
        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="btn-primary px-3 py-1.5 text-xs"
        >
          <Plus className="size-3.5" aria-hidden /> Tambah Periode
        </button>
      </div>

      <DataTable
        columns={[
          { key: "name", header: "Nama Periode", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "startDate", header: "Mulai", render: (r) => <span className="text-muted text-xs">{new Date(r.startDate).toLocaleDateString("id-ID")}</span> },
          { key: "endDate", header: "Selesai", render: (r) => <span className="text-muted text-xs">{new Date(r.endDate).toLocaleDateString("id-ID")}</span> },
          { key: "status", header: "Status", align: "center", render: (r) => <StatusBadge label={statusLabel[r.status]} tone={statusWarna[r.status]} /> },
          { key: "aksi", header: "", align: "center", render: (r) => (
            <div className="flex justify-end gap-1.5">
              {r.status === "OPEN" && (
                <>
                  <button type="button" onClick={() => handleClose(r.id)} className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs">Tutup</button>
                  <button type="button" onClick={() => handleLock(r.id)} className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs">Kunci</button>
                </>
              )}
              {r.status === "CLOSED" && (
                <>
                  <button type="button" onClick={() => handleReopen(r.id)} className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs">Buka Kembali</button>
                  <button type="button" onClick={() => handleReverseClosing(r.id)} className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs text-rose-600">Balikan Penutupan</button>
                </>
              )}
            </div>
          )},
        ]}
        rows={periods.data ?? []}
        rowKey={(r) => r.id}
        loading={periods.isLoading}
        empty="Belum ada periode fiskal."
      />

      <div className="mt-4 border-t border-line pt-4">
        <h3 className="text-sm font-bold text-brand">Pending Close</h3>
        <p className="text-xs text-muted">Periode yang telah ditutup tetapi belum ditutup tahun (close-year):</p>
        <p className="text-xs text-muted mt-1">Fitur close-year tersedia lewat API engine.</p>
      </div>

      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={() => setOpenCreate(false)}>
          <div className="panel w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-brand">Tambah Periode Fiskal</h2>
            <form className="mt-4 space-y-3" onSubmit={handleCreate}>
              <FormField label="Nama Periode">
                <input className="input" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
              </FormField>
              <FormField label="Tanggal Mulai">
                <input type="date" className="input" value={createForm.startDate} onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })} />
              </FormField>
              <FormField label="Tanggal Selesai">
                <input type="date" className="input" value={createForm.endDate} onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })} />
              </FormField>
              <FormField label="Status">
                <select className="input" value={createForm.status} onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as "OPEN" | "CLOSED" | "LOCKED" })}>
                  <option value="OPEN">Buka</option>
                  <option value="CLOSED">Tutup</option>
                  <option value="LOCKED">Kunci</option>
                </select>
              </FormField>
              <div className="flex gap-2">
                <button type="submit" disabled={createPending} className="btn-primary flex-1 disabled:opacity-40">
                  {createPending ? "Menyimpan..." : "Simpan"}
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
        <DataTable columns={kolomUser} rows={users.data ?? []} rowKey={(r) => r.id} loading={users.isLoading} empty="Belum ada pengguna." />
        <p className="mt-3 px-1 text-xs text-muted">
          Password disimpan oleh engine; di live, tambah/ubah/hapus pengguna tetap lewat API C# dengan audit log.
        </p>
      </div>
      <div className="panel p-4">
        <h2 className="mb-3 px-1 text-sm font-bold text-brand">Audit log sesi</h2>
        <DataTable columns={kolomAudit} rows={audit.data ?? []} rowKey={(r) => r.id} loading={audit.isLoading} empty="Belum ada aktivitas tercatat." />
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
