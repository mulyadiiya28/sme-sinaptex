"use client";

import { useMemo, useRef, useState } from "react";
import { Building2, Calendar, Filter, Plus, RotateCcw, Search, Trash2, Edit3, ExternalLink } from "lucide-react";
import type { AsetTetap, AsetTetapInput, MutasiAset, PenyusutanItem, LaporanAsetTetap } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { KpiCard } from "@/components/kpi-card";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { KpiSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useAsetTetapList, useAsetTetapMutations } from "@/hooks/queries";
import { useToko } from "@/lib/store/toko";
import { useAuth } from "@/lib/store/auth";
import { API_MODE, api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<AsetTetap["status"], string> = {
  aktif: "Aktif",
  dijual: "Dijual",
  dihapuskan: "Dihapuskan",
  dipindahkan: "Dipindahkan",
  nonaktif: "Nonaktif",
};

const STATUS_TONE: Record<AsetTetap["status"], "success" | "warning" | "danger" | "neutral" | "info"> = {
  aktif: "success",
  dijual: "warning",
  dihapuskan: "danger",
  dipindahkan: "info",
  nonaktif: "neutral",
};

const METODE_LABEL: Record<AsetTetap["metodePenyusutan"], string> = {
  "garis-lurus": "Garis Lurus",
  "menurun-ganda": "Menurun Ganda",
  "jumlah-tahun": "Jumlah Tahun",
};

const JENIS_MUTASI_LABEL: Record<MutasiAset["jenis"], string> = {
  pembelian: "Pembelian",
  penjualan: "Penjualan",
  pemindahan: "Pemindahan",
  penghapusan: "Penghapusan",
};

function tanggalTampil(nilai: string): string {
  const d = new Date(nilai);
  if (Number.isNaN(d.getTime())) return nilai;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AsetTetapPage() {
  const daftar = useAsetTetapList();
  const { create, update, remove, hitungPenyusutan, postingPenyusutan, mutasi, laporan } = useAsetTetapMutations();
  const user = useAuth((s) => s.user);
  const live = API_MODE === "live";
  const [tab, setTab] = useState<"daftar" | "penyusutan" | "mutasi" | "laporan">("daftar");
  const [openCreate, setOpenCreate] = useState(false);
  const [openMutasi, setOpenMutasi] = useState(false);
  const [openPenyusutan, setOpenPenyusutan] = useState(false);
  const [openLaporan, setOpenLaporan] = useState(false);
  const [editing, setEditing] = useState<AsetTetap | null>(null);
  const [mutasiAsetId, setMutasiAsetId] = useState<string | null>(null);
  const [form, setForm] = useState<AsetTetapInput>({
    kode: "",
    nama: "",
    kategori: "Peralatan",
    nilaiPerolehan: 0,
    nilaiResidu: 0,
    umurEkonomis: 60,
    metodePenyusutan: "garis-lurus",
    tanggalPerolehan: new Date().toISOString().slice(0, 10),
    lokasi: "Gudang Utama",
    status: "aktif",
    akunAset: "1501",
    akunPenyusutan: "1511",
    akunBebanPenyusutan: "6911",
    catatan: "",
  });
  const [mutasiForm, setMutasiForm] = useState<Omit<MutasiAset, "id" | "createdAt">>({
    asetId: "",
    jenis: "penjualan",
    tanggal: new Date().toISOString().slice(0, 10),
    nilai: 0,
    keterangan: "",
    lokasiBaru: "",
  });
  const [penyusutanPeriode, setPenyusutanPeriode] = useState(new Date().toISOString().slice(0, 7));
  const [laporanPeriode, setLaporanPeriode] = useState(new Date().toISOString().slice(0, 7));
  const [laporanData, setLaporanData] = useState<LaporanAsetTetap[]>([]);
  const [error, setError] = useState<string | null>(null);

  const asetAktif = useMemo(() => (daftar.data ?? []).filter((a) => a.status === "aktif"), [daftar.data]);
  const totalNilaiPerolehan = asetAktif.reduce((s, a) => s + a.nilaiPerolehan, 0);
  const totalNilaiBuku = asetAktif.reduce((s, a) => s + (a.nilaiPerolehan - (a.nilaiPerolehan - a.nilaiResidu)), 0); // approx

  const columns: Column<AsetTetap>[] = [
    { key: "kode", header: "Kode", render: (r) => <span className="font-mono text-xs text-muted">{r.kode}</span> },
    { key: "nama", header: "Nama Aset", render: (r) => <span className="font-medium">{r.nama}</span> },
    { key: "kategori", header: "Kategori", render: (r) => <span className="text-muted text-xs">{r.kategori}</span> },
    { key: "nilaiPerolehan", header: "Nilai Perolehan", align: "right", render: (r) => <MoneyDisplay value={r.nilaiPerolehan} /> },
    { key: "umurEkonomis", header: "Umur (bln)", align: "center", render: (r) => <span className="text-muted">{r.umurEkonomis}</span> },
    { key: "metodePenyusutan", header: "Metode", render: (r) => <span className="text-xs text-muted">{METODE_LABEL[r.metodePenyusutan]}</span> },
    { key: "tanggalPerolehan", header: "Tgl Perolehan", render: (r) => <span className="text-muted">{tanggalTampil(r.tanggalPerolehan)}</span> },
    { key: "lokasi", header: "Lokasi", render: (r) => <span className="text-muted text-xs">{r.lokasi}</span> },
    { key: "status", header: "Status", align: "center", render: (r) => <StatusBadge label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} /> },
    { key: "aksi", header: "", align: "right", render: (r) => (
      <div className="flex justify-end gap-1.5">
        {user?.role === "pemilik" && r.status !== "nonaktif" && (
          <>
            <button type="button" onClick={() => { setEditing(r); setOpenCreate(true); }} className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs"><Edit3 className="size-3.5" aria-hidden /> Edit</button>
            <button
              type="button"
              aria-label={live ? "Nonaktifkan aset" : "Hapus aset"}
              title={live ? "Nonaktifkan aset" : "Hapus aset"}
              onClick={() => {
                if (confirm(live ? "Nonaktifkan aset ini? Aset berhenti disusutkan." : "Hapus aset ini?")) {
                  remove.mutate({ id: r.id, user: { id: "", nama: "", username: "", role: "pemilik" } });
                }
              }}
              className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs text-rose-600"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
            <button type="button" onClick={() => { setMutasiAsetId(r.id); setMutasiForm({ ...mutasiForm, asetId: r.id }); setOpenMutasi(true); }} className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs"><ExternalLink className="size-3.5" aria-hidden /> Mutasi</button>
          </>
        )}
      </div>
    ) },
  ];

  // Engine tidak menyimpan lokasi aset; kolom ini hanya bermakna di mode mock.
  const kolom = live ? columns.filter((c) => c.key !== "lokasi") : columns;

  return (
    <div>
      <PageHeader
        title="Aset Tetap"
        description={
          "Tanah, bangunan, kendaraan, peralatan, dan perlengkapan: perolehan, penyusutan, mutasi, dan laporan. Stok barang dagang ada di Persediaan."
        }
        actions={
          <>
            <button type="button" onClick={() => { setForm({ kode: "", nama: "", kategori: "Peralatan", nilaiPerolehan: 0, nilaiResidu: 0, umurEkonomis: 60, metodePenyusutan: "garis-lurus", tanggalPerolehan: new Date().toISOString().slice(0, 10), lokasi: "Gudang Utama", status: "aktif", akunAset: "1501", akunPenyusutan: "1511", akunBebanPenyusutan: "6911", catatan: "" }); setEditing(null); setOpenCreate(true); }} className="btn-primary">
              <Plus className="size-4" aria-hidden /> Tambah Aset
            </button>
            <button type="button" onClick={() => { setPenyusutanPeriode(new Date().toISOString().slice(0, 7)); setOpenPenyusutan(true); }} className="btn-secondary">
              <RotateCcw className="size-4" aria-hidden /> Penyusutan Bulanan
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["daftar", "penyusutan", "mutasi", "laporan"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-full border px-4 py-2 text-sm font-semibold transition-colors", tab === t ? "border-brand bg-brand text-white" : "border-line bg-white text-muted hover:text-ink")}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "daftar" && (
        <div className="panel p-4">
          {daftar.isPending ? <KpiSkeleton /> : (
            <DataTable columns={kolom} rows={daftar.data ?? []} rowKey={(r) => r.id} loading={daftar.isPending} empty="Belum ada aset tetap." />
          )}
          {daftar.isError && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{String(daftar.error)}</p>}
        </div>
      )}

      {tab === "penyusutan" && (
        <div className="space-y-4">
          <div className="panel p-4">
            <h2 className="mb-3 px-1 text-sm font-bold text-brand">Hitung & Posting Penyusutan Bulanan</h2>
            <div className="flex flex-wrap items-end gap-4">
              <FormField label="Periode (YYYY-MM)">
                <input type="month" className="input" value={penyusutanPeriode} onChange={(e) => setPenyusutanPeriode(e.target.value)} />
              </FormField>
              <button type="button" onClick={() => hitungPenyusutan.mutate(penyusutanPeriode)} disabled={hitungPenyusutan.isPending} className="btn-primary h-10">
                {hitungPenyusutan.isPending ? "Menghitung..." : "Hitung Penyusutan"}
              </button>
              <button type="button" onClick={() => postingPenyusutan.mutate({ periode: penyusutanPeriode, user: { id: "", nama: "", username: "", role: "pemilik" } })} disabled={postingPenyusutan.isPending} className="btn-primary h-10">
                {postingPenyusutan.isPending ? "Posting..." : "Posting ke Jurnal"}
              </button>
            </div>
            {hitungPenyusutan.isError && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{String(hitungPenyusutan.error)}</p>}
            {postingPenyusutan.isError && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{String(postingPenyusutan.error)}</p>}
          </div>
          {hitungPenyusutan.data && (
            <div className="panel p-4">
              <h2 className="mb-3 px-1 text-sm font-bold text-brand">Rincian Penyusutan Periode {penyusutanPeriode}</h2>
              <DataTable
                columns={[
                  { key: "asetId", header: "Aset", render: (r) => { const a = daftar.data?.find(x => x.id === r.asetId); return <span className="font-medium">{a?.nama ?? r.asetId.slice(0,8)}</span>; } },
                  { key: "nilaiPenyusutan", header: "Penyusutan Bulan Ini", align: "right", render: (r) => <MoneyDisplay value={r.nilaiPenyusutan} /> },
                  { key: "akumulasiPenyusutan", header: "Akumulasi", align: "right", render: (r) => <MoneyDisplay value={r.akumulasiPenyusutan} /> },
                  { key: "nilaiBuku", header: "Nilai Buku", align: "right", render: (r) => <MoneyDisplay value={r.nilaiBuku} /> },
                ]}
                rows={hitungPenyusutan.data}
                rowKey={(r) => r.asetId}
                empty="Tidak ada aset yang disusutkan pada periode ini."
              />
            </div>
          )}
        </div>
      )}

      {tab === "mutasi" && (
        <div className="space-y-4">
          <div className="panel p-4">
            <h2 className="mb-3 px-1 text-sm font-bold text-brand">Mutasi Aset (Penjualan / Pemindahan / Penghapusan)</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Aset">
                <select className="input" value={mutasiForm.asetId} onChange={(e) => setMutasiForm({ ...mutasiForm, asetId: e.target.value })}>
                  <option value="">— pilih aset —</option>
                  {asetAktif.map((a) => <option key={a.id} value={a.id}>{a.nama} ({a.kode})</option>)}
                </select>
              </FormField>
              <FormField label="Jenis Mutasi">
                <select className="input" value={mutasiForm.jenis} onChange={(e) => setMutasiForm({ ...mutasiForm, jenis: e.target.value as MutasiAset["jenis"] })}>
                  <option value="penjualan">Penjualan</option>
                  <option value="pemindahan">Pemindahan</option>
                  <option value="penghapusan">Penghapusan</option>
                </select>
              </FormField>
              <FormField label="Tanggal">
                <input type="date" className="input" value={mutasiForm.tanggal} onChange={(e) => setMutasiForm({ ...mutasiForm, tanggal: e.target.value })} />
              </FormField>
              <FormField label="Nilai (harga jual)">
                <input type="number" className="input text-right tabular-nums" value={mutasiForm.nilai || ""} onChange={(e) => setMutasiForm({ ...mutasiForm, nilai: Number(e.target.value) })} />
              </FormField>
              <FormField label="Lokasi Baru (untuk pemindahan)">
                <input className="input" value={mutasiForm.lokasiBaru} onChange={(e) => setMutasiForm({ ...mutasiForm, lokasiBaru: e.target.value })} required={mutasiForm.jenis === "pemindahan"} />
              </FormField>
              <FormField label="Keterangan">
                <input className="input" value={mutasiForm.keterangan} onChange={(e) => setMutasiForm({ ...mutasiForm, keterangan: e.target.value })} />
              </FormField>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => mutasi.mutate({ input: mutasiForm, user: { id: "", nama: "", username: "", role: "pemilik" } })} disabled={mutasi.isPending || !mutasiForm.asetId || (mutasiForm.jenis === "pemindahan" && !(mutasiForm.lokasiBaru ?? "").trim())} className="btn-primary">
                {mutasi.isPending ? "Memproses..." : "Proses Mutasi"}
              </button>
            </div>
            {mutasi.isError && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{String(mutasi.error)}</p>}
          </div>
        </div>
      )}

      {tab === "laporan" && (
        <div className="space-y-4">
          <div className="panel p-4">
            <h2 className="mb-3 px-1 text-sm font-bold text-brand">Laporan Aset Tetap per Periode</h2>
            <div className="flex flex-wrap items-end gap-4">
              <FormField label="Periode (YYYY-MM)">
                <input type="month" className="input" value={laporanPeriode} onChange={(e) => setLaporanPeriode(e.target.value)} />
              </FormField>
              <button
                type="button"
                onClick={() => laporan.mutate(laporanPeriode, { onSuccess: (res) => setLaporanData(res) })}
                disabled={laporan.isPending}
                className="btn-primary h-10"
              >
                {laporan.isPending ? "Memuat..." : "Tampilkan Laporan"}
              </button>
            </div>
            {laporan.isError && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{String(laporan.error)}</p>}
          </div>
          {laporanData.length > 0 && (
            <div className="panel p-4">
              <h2 className="mb-3 px-1 text-sm font-bold text-brand">Laporan Periode {laporanPeriode}</h2>
              <DataTable
                columns={[
                  { key: "aset.nama", header: "Aset", render: (r) => <span className="font-medium">{r.aset.nama}</span> },
                  { key: "aset.kode", header: "Kode", render: (r) => <span className="font-mono text-xs text-muted">{r.aset.kode}</span> },
                  { key: "aset.nilaiPerolehan", header: "Perolehan", align: "right", render: (r) => <MoneyDisplay value={r.aset.nilaiPerolehan} /> },
                  { key: "penyusutanPeriode", header: "Penyusutan Periode", align: "right", render: (r) => <MoneyDisplay value={r.penyusutanPeriode} /> },
                  { key: "akumulasiPenyusutan", header: "Akumulasi", align: "right", render: (r) => <MoneyDisplay value={r.akumulasiPenyusutan} /> },
                  { key: "nilaiBuku", header: "Nilai Buku", align: "right", render: (r) => <MoneyDisplay value={r.nilaiBuku} /> },
                ]}
                rows={laporanData}
                rowKey={(r) => r.aset.id}
              />
            </div>
          )}
        </div>
      )}

      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={() => setOpenCreate(false)}>
          <div className="panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-brand">{editing ? "Edit Aset Tetap" : "Tambah Aset Tetap"}</h2>
            <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); if (editing) update.mutate({ id: editing.id, input: form, user: { id: "", nama: "", username: "", role: "pemilik" } }); else create.mutate({ input: form, user: { id: "", nama: "", username: "", role: "pemilik" } }); setOpenCreate(false); }}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Kode Aset"><input className="input" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} required disabled={live && !!editing} /></FormField>
                <FormField label="Nama Aset"><input className="input" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required /></FormField>
                <FormField label="Kategori"><input className="input" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} list="daftar-kategori-aset" />
                  <datalist id="daftar-kategori-aset">
                    <option value="Tanah" /><option value="Bangunan" /><option value="Kendaraan" />
                    <option value="Peralatan" /><option value="Perlengkapan" /><option value="Mesin" />
                  </datalist>
                </FormField>
                {!live && <FormField label="Lokasi"><input className="input" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} /></FormField>}
                <FormField label="Nilai Perolehan (Rp)"><input type="number" min={0} className="input text-right tabular-nums" value={form.nilaiPerolehan || ""} onChange={(e) => setForm({ ...form, nilaiPerolehan: Number(e.target.value) })} required disabled={live && !!editing} /></FormField>
                <FormField label="Nilai Residu (Rp)"><input type="number" min={0} className="input text-right tabular-nums" value={form.nilaiResidu || ""} onChange={(e) => setForm({ ...form, nilaiResidu: Number(e.target.value) })} /></FormField>
                <FormField label="Umur Ekonomis (bulan)"><input type="number" min={1} className="input text-right tabular-nums" value={form.umurEkonomis || ""} onChange={(e) => setForm({ ...form, umurEkonomis: Number(e.target.value) })} required /></FormField>
                <FormField label="Metode Penyusutan"><select className="input" value={form.metodePenyusutan} onChange={(e) => setForm({ ...form, metodePenyusutan: e.target.value as AsetTetapInput["metodePenyusutan"] })}><option value="garis-lurus">Garis Lurus</option><option value="menurun-ganda">Menurun Ganda (DDB)</option><option value="jumlah-tahun">Jumlah Tahun (SYD)</option></select></FormField>
                <FormField label="Tanggal Perolehan"><input type="date" className="input" value={form.tanggalPerolehan} onChange={(e) => setForm({ ...form, tanggalPerolehan: e.target.value })} required disabled={live && !!editing} /></FormField>
                {!live && <FormField label="Status"><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AsetTetapInput["status"] })}><option value="aktif">Aktif</option><option value="dijual">Dijual</option><option value="dihapuskan">Dihapuskan</option><option value="dipindahkan">Dipindahkan</option></select></FormField>}
                {!live && <FormField label="Akun Aset"><input className="input" value={form.akunAset} onChange={(e) => setForm({ ...form, akunAset: e.target.value })} /></FormField>}
                {!live && <FormField label="Akun Akum. Penyusutan"><input className="input" value={form.akunPenyusutan} onChange={(e) => setForm({ ...form, akunPenyusutan: e.target.value })} /></FormField>}
                {!live && <FormField label="Akun Beban Penyusutan"><input className="input" value={form.akunBebanPenyusutan} onChange={(e) => setForm({ ...form, akunBebanPenyusutan: e.target.value })} /></FormField>}
              </div>
              {!live && <FormField label="Catatan"><input className="input" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></FormField>}
              {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={create.isPending || update.isPending} className="btn-primary flex-1">{editing ? "Simpan Perubahan" : "Tambah Aset"}</button>
                <button type="button" onClick={() => setOpenCreate(false)} className="btn-secondary">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {openMutasi && mutasiAsetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={() => { setOpenMutasi(false); setMutasiAsetId(null); }}>
          <div className="panel w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-brand">Mutasi Aset</h2>
            <p className="mt-1 text-xs text-muted">Aset: {daftar.data?.find(a => a.id === mutasiAsetId)?.nama ?? mutasiAsetId}</p>
            <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); mutasi.mutate({ input: mutasiForm, user: { id: "", nama: "", username: "", role: "pemilik" } }); setOpenMutasi(false); setMutasiAsetId(null); }}>
              <FormField label="Jenis Mutasi"><select className="input" value={mutasiForm.jenis} onChange={(e) => setMutasiForm({ ...mutasiForm, jenis: e.target.value as MutasiAset["jenis"] })}><option value="penjualan">Penjualan</option><option value="pemindahan">Pemindahan</option><option value="penghapusan">Penghapusan</option></select></FormField>
              <FormField label="Tanggal"><input type="date" className="input" value={mutasiForm.tanggal} onChange={(e) => setMutasiForm({ ...mutasiForm, tanggal: e.target.value })} /></FormField>
              <FormField label="Nilai"><input type="number" min={0} className="input text-right tabular-nums" value={mutasiForm.nilai || ""} onChange={(e) => setMutasiForm({ ...mutasiForm, nilai: Number(e.target.value) })} /></FormField>
              <FormField label="Lokasi Baru (pemindahan)"><input className="input" value={mutasiForm.lokasiBaru} onChange={(e) => setMutasiForm({ ...mutasiForm, lokasiBaru: e.target.value })} /></FormField>
              <FormField label="Keterangan"><input className="input" value={mutasiForm.keterangan} onChange={(e) => setMutasiForm({ ...mutasiForm, keterangan: e.target.value })} /></FormField>
              <div className="flex gap-2">
                <button type="submit" disabled={mutasi.isPending} className="btn-primary flex-1">Proses Mutasi</button>
                <button type="button" onClick={() => { setOpenMutasi(false); setMutasiAsetId(null); }} className="btn-secondary">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {openPenyusutan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={() => setOpenPenyusutan(false)}>
          <div className="panel w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-brand">Penyusutan Bulanan</h2>
            <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); hitungPenyusutan.mutate(penyusutanPeriode); }}>
              <FormField label="Periode (YYYY-MM)"><input type="month" className="input" value={penyusutanPeriode} onChange={(e) => setPenyusutanPeriode(e.target.value)} required /></FormField>
              <div className="flex gap-2">
                <button type="submit" disabled={hitungPenyusutan.isPending} className="btn-primary flex-1">Hitung</button>
                <button type="button" onClick={() => postingPenyusutan.mutate({ periode: penyusutanPeriode, user: { id: "", nama: "", username: "", role: "pemilik" } })} disabled={postingPenyusutan.isPending} className="btn-primary">Posting Jurnal</button>
                <button type="button" onClick={() => setOpenPenyusutan(false)} className="btn-secondary">Tutup</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {openLaporan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={() => setOpenLaporan(false)}>
          <div className="panel w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-brand">Laporan Aset Tetap</h2>
            <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); laporan.mutate(laporanPeriode, { onSuccess: (res) => setLaporanData(res) }); setOpenLaporan(false); }}>
              <FormField label="Periode (YYYY-MM)"><input type="month" className="input" value={laporanPeriode} onChange={(e) => setLaporanPeriode(e.target.value)} required /></FormField>
              <div className="flex gap-2">
                <button type="submit" disabled={laporan.isPending} className="btn-primary flex-1">Tampilkan</button>
                <button type="button" onClick={() => setOpenLaporan(false)} className="btn-secondary">Tutup</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}