"use client";

import { useState } from "react";
import { ReceiptText, Wallet } from "lucide-react";
import type { Biaya, Pembelian, TransaksiRiwayat } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { KpiCard } from "@/components/kpi-card";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { KpiSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/store/auth";
import {
  useActiveShift,
  useBiaya,
  useBiayaMutations,
  usePembayaranMutations,
  usePembelian,
  useRiwayatTransaksi,
  useTransaksiMutations,
} from "@/hooks/queries";
import { cn } from "@/lib/utils";

type Tab = "kas" | "biaya" | "piutang" | "hutang";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "kas", label: "Kas & Bank" },
  { id: "biaya", label: "Biaya" },
  { id: "piutang", label: "Piutang" },
  { id: "hutang", label: "Hutang" },
];

export default function KeuanganPage() {
  const [tab, setTab] = useState<Tab>("kas");

  return (
    <div>
      <PageHeader
        title="Keuangan"
        description="Aktivitas bisnis dipisah per jenis, bukan per jenis laporan. Semua saldo hasil transaksi, bukan input manual."
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

      {tab === "kas" && <PanelKas />}
      {tab === "biaya" && <PanelBiaya />}
      {tab === "piutang" && <PanelPiutang />}
      {tab === "hutang" && <PanelHutang />}
    </div>
  );
}

function PanelKas() {
  const shift = useActiveShift();
  const biaya = useBiaya();
  const pembelian = usePembelian();
  const riwayat = useRiwayatTransaksi();
  const user = useAuth((s) => s.user);
  const { konfirmasiDigital } = useTransaksiMutations();
  const [target, setTarget] = useState<TransaksiRiwayat | null>(null);

  const tunai = shift.data?.kasTunaiSistem ?? 0;
  const biayaTransfer = (biaya.data ?? []).filter((b) => b.metode === "transfer").reduce((s, b) => s + b.nominal, 0);
  const pembelianHutang = (pembelian.data ?? []).filter((p) => p.metode === "hutang" && p.terbayar < p.total);
  const totalHutang = pembelianHutang.reduce((s, p) => s + (p.total - p.terbayar), 0);
  const transaksiValid = (riwayat.data ?? []).filter((t) => t.status !== "dibatalkan");
  const totalPiutang = transaksiValid.reduce((s, t) => s + t.piutang, 0);
  const menunggu = transaksiValid.filter((t) => t.status === "menunggu_pembayaran");
  const memuat = shift.isLoading || biaya.isLoading || pembelian.isLoading || riwayat.isLoading;

  return (
    <div>
      {memuat ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Kas tunai (sistem)"
            value={shift.data ? <MoneyDisplay value={tunai} /> : <span className="text-sm text-muted">Belum ada shift</span>}
            hint={shift.data ? `Shift ${shift.data.id}` : "Buka shift di menu Shift Kasir"}
            tone="emerald"
            icon={<Wallet className="size-4" aria-hidden />}
          />
          <KpiCard label="Total piutang" value={<MoneyDisplay value={totalPiutang} />} hint="Penjualan kredit belum lunas" tone="violet" />
          <KpiCard label="Total hutang" value={<MoneyDisplay value={totalHutang} />} hint="Kepada pemasok" tone="rose" />
          <KpiCard label="Biaya tercatat" value={<MoneyDisplay value={(biaya.data ?? []).reduce((s, b) => s + b.nominal, 0)} />} hint={`Bulan ini · transfer ${new Intl.NumberFormat("id-ID").format(biayaTransfer)}`} tone="navy" />
        </div>
      )}

      <div className="panel mt-4 p-5">
        <div className="flex items-center justify-between">
          <p className="font-bold text-brand">Pembayaran menunggu konfirmasi</p>
          <StatusBadge label={`${menunggu.length} tertunda`} tone={menunggu.length > 0 ? "warning" : "success"} />
        </div>
        <p className="mt-1 text-xs text-muted">
          QRIS/gateway yang dipilih pelanggan "bayar kemudian" harus dikonfirmasi setelah dana masuk, sehingga kas/bank tercatat tepat waktu.
        </p>
        {menunggu.length > 0 ? (
          <div className="mt-3 space-y-2">
            {menunggu.map((t) => (
              <div key={t.nomor} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white p-3">
                <div>
                  <p className="text-sm font-bold text-ink">{t.nomor}</p>
                  <p className="text-xs text-muted">
                    {new Date(t.waktu).toLocaleString("id-ID")} · {t.pembayaran?.some((b) => b.metode === "qris") ? "QRIS" : "Gateway"} · {t.kasir}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <MoneyDisplay value={t.total} className="font-bold text-brand" />
                  {user?.role === "pemilik" ? (
                    <button
                      type="button"
                      className="btn-primary px-3 py-1.5 text-xs"
                      disabled={konfirmasiDigital.isPending}
                      onClick={() => setTarget(t)}
                    >
                      Konfirmasi
                    </button>
                  ) : (
                    <StatusBadge label="Pemilik" tone="info" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Tidak ada pembayaran tertunda — semua dana digital sudah terkonfirmasi.</p>
        )}
      </div>

      <div className="panel mt-4 p-5 text-sm text-muted">
        <p className="font-bold text-brand">Rekonsiliasi</p>
        <p className="mt-1">
          Kas tunai = saldo awal shift + penjualan tunai + kas masuk − kas keluar (dihitung dari aktivitas nyata).
          Dana QRIS/gateway masuk ke akun Penampung gateway, lalu dipindahkan ke Bank saat dikonfirmasi.
        </p>
      </div>

      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={() => setTarget(null)}>
          <div className="panel max-w-sm p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="flex items-center gap-2 font-black text-brand">
              <ReceiptText className="size-5" aria-hidden /> Konfirmasi dana masuk
            </h2>
            <p className="mt-2 text-sm text-muted">
              Pastikan dana {target.pembayaran?.some((b) => b.metode === "qris") ? "QRIS" : "gateway"} untuk <span className="font-bold text-ink">{target.nomor}</span> sudah terlihat di rekening/portal.
            </p>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
              <span className="font-semibold">Nominal</span>
              <MoneyDisplay value={target.total} className="font-black text-brand" />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={konfirmasiDigital.isPending}
                onClick={() =>
                  konfirmasiDigital.mutate(
                    { nomor: target.nomor, user: user! },
                    { onSuccess: () => setTarget(null), onError: (err) => alert(String(err)) },
                  )
                }
              >
                {konfirmasiDigital.isPending ? "Memproses..." : "Ya, Dana Masuk"}
              </button>
              <button type="button" onClick={() => setTarget(null)} className="btn-secondary">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelBiaya() {
  const biaya = useBiaya();
  const { catat } = useBiayaMutations();
  const [kategori, setKategori] = useState("");
  const [nominal, setNominal] = useState(0);
  const [metode, setMetode] = useState<"tunai" | "transfer">("tunai");
  const [error, setError] = useState<string | null>(null);

  const columns: Column<Biaya>[] = [
    { key: "waktu", header: "Waktu", render: (r) => (
      <span className="text-muted">{new Date(r.waktu).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
    ) },
    { key: "kategori", header: "Kategori", render: (r) => <span className="font-medium">{r.kategori}</span> },
    { key: "metode", header: "Metode", align: "center", render: (r) => <StatusBadge label={r.metode === "tunai" ? "Tunai" : "Transfer"} tone="info" /> },
    { key: "nominal", header: "Nominal", align: "right", render: (r) => <MoneyDisplay value={r.nominal} /> },
    { key: "catatan", header: "Catatan", render: (r) => <span className="text-muted">{r.catatan ?? "—"}</span> },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="panel p-5">
        <h2 className="text-sm font-bold text-brand">Catat biaya</h2>
        <form
          className="mt-4 space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            catat.mutate(
              { kategori, nominal, metode },
              {
                onSuccess: () => {
                  setKategori("");
                  setNominal(0);
                },
                onError: (err) => setError(String(err)),
              },
            );
          }}
        >
          <FormField label="Kategori">
            <input className="input" value={kategori} onChange={(e) => setKategori(e.target.value)} placeholder="cth. Listrik, ATK, transport" autoFocus />
          </FormField>
          <FormField label="Nominal (Rp)">
            <input type="number" min={0} className="input text-right tabular-nums" value={nominal || ""} onChange={(e) => setNominal(Number(e.target.value))} />
          </FormField>
          <FormField label="Sumber dana">
            <select className="input" value={metode} onChange={(e) => setMetode(e.target.value as "tunai" | "transfer")}>
              <option value="tunai">Kas tunai</option>
              <option value="transfer">Bank</option>
            </select>
          </FormField>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <button type="submit" disabled={catat.isPending} className="btn-primary w-full disabled:opacity-40">
            {catat.isPending ? "Menyimpan..." : "Catat Biaya"}
          </button>
        </form>
      </div>
      <div className="panel p-4 xl:col-span-2">
        <DataTable columns={columns} rows={biaya.data ?? []} rowKey={(r) => r.id} loading={biaya.isLoading} empty="Belum ada biaya tercatat." />
      </div>
    </div>
  );
}

function PanelPiutang() {
  const riwayat = useRiwayatTransaksi();
  const { bayarPiutang } = usePembayaranMutations();
  const [target, setTarget] = useState<TransaksiRiwayat | null>(null);
  const daftar = (riwayat.data ?? []).filter((t) => t.status !== "dibatalkan" && t.piutang > 0);

  const columns: Column<TransaksiRiwayat>[] = [
    { key: "nomor", header: "Nomor", render: (r) => <span className="font-semibold text-brand">{r.nomor}</span> },
    { key: "pelanggan", header: "Pelanggan", render: (r) => r.pelanggan ?? "—" },
    { key: "waktu", header: "Waktu", render: (r) => (
      <span className="text-muted">{new Date(r.waktu).toLocaleDateString("id-ID")}</span>
    ) },
    { key: "total", header: "Total", align: "right", render: (r) => <MoneyDisplay value={r.total} /> },
    { key: "piutang", header: "Sisa piutang", align: "right", render: (r) => <MoneyDisplay value={r.piutang} className="font-bold text-amber-600" /> },
    { key: "aksi", header: "", align: "right", render: (r) => (
      <button type="button" onClick={() => setTarget(r)} className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs">Bayar</button>
    ) },
  ];

  return (
    <div className="panel p-4">
      <DataTable columns={columns} rows={daftar} rowKey={(r) => r.nomor} loading={riwayat.isLoading} empty="Tidak ada piutang — semua penjualan kredit lunas." />
      {target && (
        <BayarDialog
          judul={`Pelunasan piutang ${target.nomor}`}
          sisa={target.piutang}
          pending={bayarPiutang.isPending}
          onClose={() => setTarget(null)}
          onSubmit={(nominal, metode) =>
            bayarPiutang.mutate(
              { nomor: target.nomor, nominal, metode },
              { onSuccess: () => setTarget(null), onError: (err) => alert(String(err)) },
            )
          }
        />
      )}
    </div>
  );
}

function PanelHutang() {
  const pembelian = usePembelian();
  const { bayarHutang } = usePembayaranMutations();
  const [target, setTarget] = useState<Pembelian | null>(null);
  const hutang = (pembelian.data ?? []).filter((p) => p.terbayar < p.total);

  const columns: Column<Pembelian>[] = [
    { key: "nomor", header: "Nomor", render: (r) => <span className="font-semibold text-brand">{r.nomor}</span> },
    { key: "pemasok", header: "Pemasok", render: (r) => <span className="font-medium">{r.pemasok}</span> },
    { key: "total", header: "Total", align: "right", render: (r) => <MoneyDisplay value={r.total} /> },
    { key: "terbayar", header: "Terbayar", align: "right", render: (r) => <MoneyDisplay value={r.terbayar} /> },
    { key: "sisa", header: "Sisa", align: "right", render: (r) => <MoneyDisplay value={r.total - r.terbayar} className="font-bold text-rose-600" /> },
    { key: "aksi", header: "", align: "right", render: (r) => (
      <button type="button" onClick={() => setTarget(r)} className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs">Bayar</button>
    ) },
  ];

  return (
    <div className="panel p-4">
      <DataTable columns={columns} rows={hutang} rowKey={(r) => r.id} loading={pembelian.isLoading} empty="Tidak ada hutang ke pemasok." />
      {target && (
        <BayarDialog
          judul={`Pelunasan hutang ${target.nomor}`}
          sisa={target.total - target.terbayar}
          pending={bayarHutang.isPending}
          onClose={() => setTarget(null)}
          onSubmit={(nominal, metode) =>
            bayarHutang.mutate(
              { id: target.id, nominal, metode },
              { onSuccess: () => setTarget(null), onError: (err) => alert(String(err)) },
            )
          }
        />
      )}
    </div>
  );
}

function BayarDialog({
  judul,
  sisa,
  pending,
  onClose,
  onSubmit,
}: {
  judul: string;
  sisa: number;
  pending: boolean;
  onClose: () => void;
  onSubmit: (nominal: number, metode: "tunai" | "transfer") => void;
}) {
  const [nominal, setNominal] = useState(sisa);
  const [metode, setMetode] = useState<"tunai" | "transfer">("tunai");
  const [error, setError] = useState<string | null>(null);

  const kurang = nominal <= 0 || nominal > sisa;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-sm p-7">
        <h2 className="font-black text-brand">{judul}</h2>
        <form
          className="mt-4 space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (kurang) return setError(`Nominal harus di antara 1 dan sisa (${new Intl.NumberFormat("id-ID").format(sisa)}).`);
            onSubmit(nominal, metode);
          }}
        >
          <FormField label={`Sisa harus dibayar: ${new Intl.NumberFormat("id-ID").format(sisa)}`}>
            <input type="number" min={1} max={sisa} className="input text-right text-lg font-bold tabular-nums" value={nominal || ""} onChange={(e) => { setError(null); setNominal(Number(e.target.value)); }} autoFocus />
          </FormField>
          <FormField label="Sumber dana">
            <select className="input" value={metode} onChange={(e) => setMetode(e.target.value as "tunai" | "transfer")}>
              <option value="tunai">Kas tunai</option>
              <option value="transfer">Bank</option>
            </select>
          </FormField>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary flex-1 disabled:opacity-40">
              <ReceiptText className="size-4" aria-hidden />
              {pending ? "Memproses..." : "Bayar"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
