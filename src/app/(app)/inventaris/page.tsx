"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, Building2, ClipboardCheck, PackageSearch, Plus, SlidersHorizontal } from "lucide-react";
import type {
  Gudang,
  StockAdjustmentInput,
  StockMovement,
  StockOpname,
  StockOpnameInput,
  StockTransferInput,
} from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { KpiCard } from "@/components/kpi-card";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  useGudangList,
  useInventarisMutations,
  useInventarisRingkasan,
  useMutasiStok,
  useOpnameList,
  useProducts,
  useStokGudang,
  useStokRendah,
} from "@/hooks/queries";
import { useAuth } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

type Tab = "ringkasan" | "stok" | "mutasi" | "opname" | "gudang";

const OPNAME_TONE: Record<StockOpname["status"], "neutral" | "info" | "success" | "danger"> = {
  draft: "neutral",
  selesai: "success",
  dibatalkan: "danger",
};

const OPNAME_LABEL: Record<StockOpname["status"], string> = {
  draft: "Draft",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const ALASAN_LABEL: Record<StockAdjustmentInput["alasan"], string> = {
  rusak: "Rusak",
  hilang: "Hilang",
  kedaluwarsa: "Kedaluwarsa",
  opname: "Opname",
  lainnya: "Lainnya",
};

function tanggalTampil(nilai: string): string {
  const d = new Date(nilai);
  if (Number.isNaN(d.getTime())) return nilai;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function InventarisPage() {
  const user = useAuth((s) => s.user);
  const [tab, setTab] = useState<Tab>("ringkasan");
  const produk = useProducts();
  const gudang = useGudangList();
  const ringkasan = useInventarisRingkasan();
  const opname = useOpnameList(tab === "opname");
  const stokRendah = useStokRendah();
  const { penyesuaian, transfer, buatOpname, selesaikanOpname, batalkanOpname, buatGudang, nonaktifkanGudang } =
    useInventarisMutations();
  const [filterGudang, setFilterGudang] = useState("");
  const stok = useStokGudang(filterGudang || undefined);

  const [mutasiProduk, setMutasiProduk] = useState("");
  const [mutasiGudang, setMutasiGudang] = useState("");
  const mutasi = useMutasiStok(mutasiProduk, mutasiGudang || undefined);

  const [openAdjust, setOpenAdjust] = useState(false);
  const [adjust, setAdjust] = useState<StockAdjustmentInput>({
    productId: "",
    gudangId: "",
    stokFisik: 0,
    alasan: "lainnya",
    catatan: "",
  });

  const [openTransfer, setOpenTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState<StockTransferInput>({
    productId: "",
    gudangAsalId: "",
    gudangTujuanId: "",
    qty: 1,
    catatan: "",
  });

  const [openGudang, setOpenGudang] = useState(false);
  const [formGudang, setFormGudang] = useState({
    kode: "",
    nama: "",
    alamat: "",
    isDefault: false,
  });

  const [opnameGudang, setOpnameGudang] = useState("");
  const [opnameTanggal, setOpnameTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [opnameCatatan, setOpnameCatatan] = useState("");
  const [opnameQty, setOpnameQty] = useState<Record<string, string>>({});
  const stokOpname = useStokGudang(opnameGudang || undefined);

  const daftarGudang = gudang.data ?? [];
  const gudangAktif = daftarGudang.filter((g) => g.isActive);
  const daftarProduk = produk.data ?? [];

  const qtySistem = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of stokOpname.data?.items ?? []) map.set(item.productId, item.qty);
    return map;
  }, [stokOpname.data]);

  useEffect(() => {
    if (!opnameGudang) return;
    const next: Record<string, string> = {};
    for (const p of produk.data ?? []) next[p.id] = String(qtySistem.get(p.id) ?? 0);
    setOpnameQty(next);
  }, [opnameGudang, qtySistem, produk.data]);

  const selisihOpname = useMemo(() => {
    const rows: Array<{ productId: string; nama: string; sistem: number; fisik: number; selisih: number }> = [];
    for (const p of daftarProduk) {
      const sistem = qtySistem.get(p.id) ?? 0;
      const raw = opnameQty[p.id];
      if (raw === undefined || raw === "") continue;
      const fisik = Number(raw);
      if (!Number.isFinite(fisik) || fisik === sistem) continue;
      rows.push({ productId: p.id, nama: p.nama, sistem, fisik, selisih: fisik - sistem });
    }
    return rows;
  }, [daftarProduk, qtySistem, opnameQty]);

  const stokColumns: Column<NonNullable<typeof stok.data>["items"][number]>[] = [
    {
      key: "produk",
      header: "Produk",
      render: (r) => (
        <span>
          <span className="block font-semibold text-ink">{r.productNama}</span>
          <span className="font-mono text-xs text-muted">{r.sku}</span>
        </span>
      ),
    },
    { key: "gudang", header: "Gudang", render: (r) => <span className="text-muted">{r.gudangNama}</span> },
    { key: "qty", header: "Qty", align: "right", render: (r) => <span className="tabular-nums">{r.qty}</span> },
    { key: "satuan", header: "Satuan", render: (r) => <span className="text-muted">{r.satuan}</span> },
    {
      key: "harga",
      header: "Harga Rata-rata",
      align: "right",
      render: (r) => <MoneyDisplay value={r.hargaRataRata} />,
    },
    {
      key: "nilai",
      header: "Nilai",
      align: "right",
      render: (r) => <MoneyDisplay value={r.totalNilai} />,
    },
  ];

  const opnameColumns: Column<StockOpname>[] = [
    {
      key: "id",
      header: "Nomor",
      render: (r) => <span className="font-mono text-xs">{r.id}</span>,
    },
    {
      key: "tanggal",
      header: "Tanggal",
      render: (r) => <span className="text-muted">{tanggalTampil(r.tanggal)}</span>,
    },
    {
      key: "gudang",
      header: "Gudang",
      render: (r) => <span>{daftarGudang.find((g) => g.id === r.gudangId)?.nama ?? r.gudangId}</span>,
    },
    {
      key: "item",
      header: "Item Berselisih",
      align: "center",
      render: (r) => <span className="tabular-nums">{r.items.filter((i) => i.selisih !== 0).length}</span>,
    },
    {
      key: "nilai",
      header: "Nilai Selisih",
      align: "right",
      render: (r) => (
        <MoneyDisplay value={r.items.reduce((s, i) => s + Math.abs(i.nilaiSelisih), 0)} />
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (r) => <StatusBadge label={OPNAME_LABEL[r.status]} tone={OPNAME_TONE[r.status]} />,
    },
    {
      key: "aksi",
      header: "",
      align: "right",
      render: (r) =>
        r.status === "draft" && user?.role === "pemilik" ? (
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              className="btn-primary rounded-lg px-2.5 py-1.5 text-xs"
              onClick={() => selesaikanOpname.mutate({ id: r.id, user: user })}
              disabled={selesaikanOpname.isPending}
            >
              Selesaikan
            </button>
            <button
              type="button"
              className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs text-rose-600"
              onClick={() => batalkanOpname.mutate({ id: r.id, user: user })}
              disabled={batalkanOpname.isPending}
            >
              Batalkan
            </button>
          </div>
        ) : null,
    },
  ];

  const gudangColumns: Column<Gudang>[] = [
    { key: "kode", header: "Kode", render: (r) => <span className="font-mono text-xs text-muted">{r.kode}</span> },
    {
      key: "nama",
      header: "Nama",
      render: (r) => (
        <span className="font-medium">
          {r.nama} {r.isDefault ? <span className="ml-1 text-xs text-brand">(default)</span> : null}
        </span>
      ),
    },
    { key: "alamat", header: "Alamat", render: (r) => <span className="text-muted">{r.alamat ?? "-"}</span> },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (r) => (
        <StatusBadge label={r.isActive ? "Aktif" : "Nonaktif"} tone={r.isActive ? "success" : "neutral"} />
      ),
    },
    {
      key: "aksi",
      header: "",
      align: "right",
      render: (r) =>
        r.isActive && !r.isDefault && user?.role === "pemilik" ? (
          <button
            type="button"
            className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs text-rose-600"
            onClick={() => nonaktifkanGudang.mutate({ id: r.id, user: user })}
            disabled={nonaktifkanGudang.isPending}
          >
            Nonaktifkan
          </button>
        ) : null,
    },
  ];

  const errorMutation =
    penyesuaian.error ?? transfer.error ?? buatOpname.error ?? selesaikanOpname.error ?? buatGudang.error ?? null;

  return (
    <div>
      <PageHeader
        title="Inventaris"
        description="Stok per gudang, kartu stok, penyesuaian, dan opname."
        actions={
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setAdjust({ productId: "", gudangId: gudangAktif[0]?.id ?? "", stokFisik: 0, alasan: "lainnya", catatan: "" });
                setOpenAdjust(true);
              }}
            >
              <SlidersHorizontal className="size-4" aria-hidden /> Penyesuaian
            </button>
            <button type="button" className="btn-secondary" onClick={() => setOpenGudang(true)}>
              <Plus className="size-4" aria-hidden /> Gudang
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["ringkasan", "stok", "mutasi", "opname", "gudang"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold capitalize transition-colors",
              tab === t
                ? "border-brand bg-brand text-white"
                : "border-line bg-white text-muted hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "ringkasan" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Produk Aktif"
              value={ringkasan.data?.totalProduk ?? 0}
              hint={`${ringkasan.data?.totalGudang ?? 0} gudang aktif`}
              icon={<Boxes className="size-4" aria-hidden />}
            />
            <KpiCard
              label="Total Qty"
              value={ringkasan.data?.totalQty ?? 0}
              tone="violet"
              icon={<PackageSearch className="size-4" aria-hidden />}
            />
            <KpiCard
              label="Nilai Persediaan"
              value={<MoneyDisplay value={ringkasan.data?.totalNilai ?? 0} />}
              tone="emerald"
              icon={<Building2 className="size-4" aria-hidden />}
            />
            <KpiCard
              label="Stok Menipis"
              value={ringkasan.data?.lowStockCount ?? 0}
              hint={`${ringkasan.data?.outOfStockCount ?? 0} produk habis`}
              tone="rose"
              icon={<ClipboardCheck className="size-4" aria-hidden />}
            />
          </div>

          <div className="panel p-4">
            <h2 className="mb-3 px-1 text-sm font-bold text-brand">Nilai per Gudang</h2>
            <DataTable
              columns={[
                { key: "nama", header: "Gudang", render: (r) => <span className="font-medium">{r.gudangNama}</span> },
                { key: "qty", header: "Qty", align: "right", render: (r) => <span className="tabular-nums">{r.totalQty}</span> },
                { key: "nilai", header: "Nilai", align: "right", render: (r) => <MoneyDisplay value={r.totalNilai} /> },
              ]}
              rows={ringkasan.data?.nilaiPerGudang ?? []}
              rowKey={(r) => r.gudangId}
              loading={ringkasan.isPending}
              empty="Belum ada gudang."
            />
          </div>

          {ringkasan.isError ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{String(ringkasan.error)}</p>
          ) : null}

          <div className="panel p-4">
            <h2 className="mb-3 px-1 text-sm font-bold text-brand">Stok Menipis</h2>
            <DataTable
              columns={[
                {
                  key: "produk",
                  header: "Produk",
                  render: (r) => (
                    <span>
                      <span className="block font-semibold text-ink">{r.productNama}</span>
                      <span className="font-mono text-xs text-muted">{r.sku}</span>
                    </span>
                  ),
                },
                { key: "gudang", header: "Gudang", render: (r) => <span className="text-muted">{r.gudangNama}</span> },
                { key: "qty", header: "Stok", align: "right", render: (r) => <span className="tabular-nums">{r.qty}</span> },
                { key: "min", header: "Minimum", align: "right", render: (r) => <span className="tabular-nums">{r.stokMinimum}</span> },
                {
                  key: "kurang",
                  header: "Kekurangan",
                  align: "right",
                  render: (r) => <span className="tabular-nums font-semibold text-rose-600">{r.kekurangan}</span>,
                },
                { key: "satuan", header: "Satuan", render: (r) => <span className="text-muted">{r.satuan}</span> },
              ]}
              rows={stokRendah.data ?? []}
              rowKey={(r) => `${r.productId}-${r.gudangId}`}
              loading={stokRendah.isPending}
              empty="Semua stok di atas minimum."
            />
            {stokRendah.isError ? (
              <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{String(stokRendah.error)}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "stok" ? (
        <div className="panel p-4">
          <div className="mb-3 flex flex-wrap items-end gap-3 px-1">
            <FormField label="Gudang">
              <select className="input" value={filterGudang} onChange={(e) => setFilterGudang(e.target.value)}>
                <option value="">Semua gudang</option>
                {gudangAktif.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama}
                  </option>
                ))}
              </select>
            </FormField>
            <p className="pb-2 text-xs text-muted">
              Nilai memakai harga beli master sebagai dasar — engine belum membuka harga rata-rata per gudang.
            </p>
            <button
              type="button"
              className="btn-secondary mb-0.5"
              onClick={() => {
                setTransferForm({
                  productId: "",
                  gudangAsalId: gudangAktif[0]?.id ?? "",
                  gudangTujuanId: gudangAktif[1]?.id ?? "",
                  qty: 1,
                  catatan: "",
                });
                setOpenTransfer(true);
              }}
            >
              Transfer Antar Gudang
            </button>
          </div>
          <DataTable
            columns={stokColumns}
            rows={stok.data?.items ?? []}
            rowKey={(r) => `${r.productId}-${r.gudangId}`}
            loading={stok.isPending}
            empty="Belum ada stok tercatat."
          />
          {stok.isError ? (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{String(stok.error)}</p>
          ) : null}
        </div>
      ) : null}

      {tab === "mutasi" ? (
        <div className="panel p-4">
          <p className="px-1 text-sm text-muted">
            Kartu stok menampilkan riwayat mutasi per produk. Di mode live engine belum menyediakan endpoint
            riwayat mutasi, jadi daftar ini hanya terisi pada mode mock.
          </p>
          <div className="mb-3 mt-3 flex flex-wrap items-end gap-3 px-1">
            <FormField label="Produk">
              <select className="input" value={mutasiProduk} onChange={(e) => setMutasiProduk(e.target.value)}>
                <option value="">— pilih produk —</option>
                {daftarProduk.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} ({p.sku})
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Gudang">
              <select className="input" value={mutasiGudang} onChange={(e) => setMutasiGudang(e.target.value)}>
                <option value="">Semua gudang</option>
                {gudangAktif.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <DataTable
            columns={[
              { key: "waktu", header: "Waktu", render: (r) => <span className="text-muted">{tanggalTampil(r.createdAt)}</span> },
              { key: "produk", header: "Produk", render: (r) => <span>{daftarProduk.find((p) => p.id === r.productId)?.nama ?? r.productId}</span> },
              { key: "gudang", header: "Gudang", render: (r) => <span className="text-muted">{daftarGudang.find((g) => g.id === r.gudangId)?.nama ?? r.gudangId}</span> },
              { key: "tipe", header: "Tipe", render: (r) => <span className="capitalize">{r.tipe.replace("_", " ")}</span> },
              { key: "qty", header: "Qty", align: "right", render: (r) => <span className="tabular-nums">{r.qty}</span> },
              { key: "sebelum", header: "Sebelum", align: "right", render: (r) => <span className="tabular-nums">{r.qtySebelum}</span> },
              { key: "sesudah", header: "Sesudah", align: "right", render: (r) => <span className="tabular-nums">{r.qtySesudah}</span> },
              { key: "ref", header: "Referensi", render: (r) => <span className="font-mono text-xs text-muted">{r.referensi.id}</span> },
            ] satisfies Column<StockMovement>[]}
            rows={mutasi.data ?? []}
            rowKey={(r) => r.id}
            loading={mutasi.isPending && mutasiProduk !== ""}
            empty={mutasiProduk ? "Belum ada mutasi untuk produk ini." : "Pilih produk untuk melihat kartu stok."}
          />
          {mutasi.isError ? (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{String(mutasi.error)}</p>
          ) : null}
        </div>
      ) : null}

      {tab === "opname" ? (
        <div className="space-y-4">
          <div className="panel p-4">
            <h2 className="mb-3 px-1 text-sm font-bold text-brand">Buat Opname Stok</h2>
            <div className="grid grid-cols-1 gap-3 px-1 sm:grid-cols-3">
              <FormField label="Gudang">
                <select className="input" value={opnameGudang} onChange={(e) => setOpnameGudang(e.target.value)}>
                  <option value="">— pilih gudang —</option>
                  {gudangAktif.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Tanggal">
                <input type="date" className="input" value={opnameTanggal} onChange={(e) => setOpnameTanggal(e.target.value)} />
              </FormField>
              <FormField label="Catatan">
                <input className="input" value={opnameCatatan} onChange={(e) => setOpnameCatatan(e.target.value)} />
              </FormField>
            </div>

            {opnameGudang ? (
              <>
                <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-line">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                        <th className="px-4 py-3">Produk</th>
                        <th className="px-4 py-3 text-right">Stok Sistem</th>
                        <th className="px-4 py-3 text-right">Qty Fisik</th>
                        <th className="px-4 py-3 text-right">Selisih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daftarProduk.map((p) => {
                        const sistem = qtySistem.get(p.id) ?? 0;
                        const raw = opnameQty[p.id] ?? "";
                        const fisik = raw === "" ? sistem : Number(raw);
                        const selisih = Number.isFinite(fisik) ? fisik - sistem : 0;
                        return (
                          <tr key={p.id} className="border-b border-line/60 last:border-0">
                            <td className="px-4 py-2">
                              <span className="block font-medium">{p.nama}</span>
                              <span className="font-mono text-xs text-muted">{p.sku}</span>
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">{sistem}</td>
                            <td className="px-4 py-2 text-right">
                              <input
                                type="number"
                                min={0}
                                className="input w-24 text-right tabular-nums"
                                value={raw}
                                onChange={(e) =>
                                  setOpnameQty((prev) => ({ ...prev, [p.id]: e.target.value }))
                                }
                              />
                            </td>
                            <td className={cn("px-4 py-2 text-right tabular-nums", selisih !== 0 && "font-semibold text-rose-600")}>
                              {selisih}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center gap-3 px-1">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={selisihOpname.length === 0 || buatOpname.isPending}
                    onClick={() => {
                      const input: StockOpnameInput = {
                        gudangId: opnameGudang,
                        tanggal: opnameTanggal,
                        items: selisihOpname.map((r) => ({ productId: r.productId, qtyFisik: r.fisik })),
                        catatan: opnameCatatan || undefined,
                      };
                      buatOpname.mutate({ input, user: user! });
                    }}
                  >
                    Buat Opname ({selisihOpname.length} item)
                  </button>
                  <span className="text-xs text-muted">Hanya baris dengan selisih yang dikirim.</span>
                </div>
              </>
            ) : (
              <p className="mt-4 px-1 text-xs text-muted">Pilih gudang untuk memuat stok sistem.</p>
            )}
          </div>

          <div className="panel p-4">
            <h2 className="mb-3 px-1 text-sm font-bold text-brand">Riwayat Opname</h2>
            <DataTable
              columns={opnameColumns}
              rows={opname.data ?? []}
              rowKey={(r) => r.id}
              loading={opname.isPending}
              empty="Belum ada opname."
            />
          </div>
        </div>
      ) : null}

      {tab === "gudang" ? (
        <div className="panel p-4">
          <DataTable
            columns={gudangColumns}
            rows={daftarGudang}
            rowKey={(r) => r.id}
            loading={gudang.isPending}
            empty="Belum ada gudang."
          />
        </div>
      ) : null}

      {errorMutation ? (
        <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{String(errorMutation)}</p>
      ) : null}

      {openAdjust ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
          onClick={() => setOpenAdjust(false)}
        >
          <div className="panel w-full max-w-lg p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-brand">Penyesuaian Stok</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                penyesuaian.mutate(
                  { input: adjust, user: user! },
                  { onSuccess: () => setOpenAdjust(false) },
                );
              }}
            >
              <FormField label="Produk">
                <select
                  className="input"
                  value={adjust.productId}
                  onChange={(e) => setAdjust({ ...adjust, productId: e.target.value })}
                  required
                >
                  <option value="">— pilih produk —</option>
                  {daftarProduk.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.sku})
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Gudang">
                <select
                  className="input"
                  value={adjust.gudangId}
                  onChange={(e) => setAdjust({ ...adjust, gudangId: e.target.value })}
                  required
                >
                  <option value="">— pilih gudang —</option>
                  {gudangAktif.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Stok Fisik">
                <input
                  type="number"
                  min={0}
                  className="input text-right tabular-nums"
                  value={adjust.stokFisik || ""}
                  onChange={(e) => setAdjust({ ...adjust, stokFisik: Number(e.target.value) })}
                  required
                />
              </FormField>
              <FormField label="Alasan">
                <select
                  className="input"
                  value={adjust.alasan}
                  onChange={(e) => setAdjust({ ...adjust, alasan: e.target.value as StockAdjustmentInput["alasan"] })}
                >
                  {Object.entries(ALASAN_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Catatan">
                <input
                  className="input"
                  value={adjust.catatan ?? ""}
                  onChange={(e) => setAdjust({ ...adjust, catatan: e.target.value })}
                />
              </FormField>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1" disabled={penyesuaian.isPending}>
                  Simpan Penyesuaian
                </button>
                <button type="button" className="btn-secondary" onClick={() => setOpenAdjust(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {openTransfer ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
          onClick={() => setOpenTransfer(false)}
        >
          <div className="panel w-full max-w-lg p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-brand">Transfer Stok</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                transfer.mutate(
                  { input: transferForm, user: user! },
                  { onSuccess: () => setOpenTransfer(false) },
                );
              }}
            >
              <FormField label="Produk">
                <select
                  className="input"
                  value={transferForm.productId}
                  onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
                  required
                >
                  <option value="">— pilih produk —</option>
                  {daftarProduk.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.sku})
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Gudang Asal">
                  <select
                    className="input"
                    value={transferForm.gudangAsalId}
                    onChange={(e) => setTransferForm({ ...transferForm, gudangAsalId: e.target.value })}
                    required
                  >
                    <option value="">— pilih —</option>
                    {gudangAktif.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Gudang Tujuan">
                  <select
                    className="input"
                    value={transferForm.gudangTujuanId}
                    onChange={(e) => setTransferForm({ ...transferForm, gudangTujuanId: e.target.value })}
                    required
                  >
                    <option value="">— pilih —</option>
                    {gudangAktif.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <FormField label="Qty">
                <input
                  type="number"
                  min={1}
                  className="input text-right tabular-nums"
                  value={transferForm.qty}
                  onChange={(e) => setTransferForm({ ...transferForm, qty: Number(e.target.value) })}
                  required
                />
              </FormField>
              <FormField label="Catatan">
                <input
                  className="input"
                  value={transferForm.catatan ?? ""}
                  onChange={(e) => setTransferForm({ ...transferForm, catatan: e.target.value })}
                />
              </FormField>
              {transfer.isError ? (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{String(transfer.error)}</p>
              ) : null}
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1" disabled={transfer.isPending}>
                  Transfer
                </button>
                <button type="button" className="btn-secondary" onClick={() => setOpenTransfer(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {openGudang ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
          onClick={() => setOpenGudang(false)}
        >
          <div className="panel w-full max-w-lg p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-brand">Tambah Gudang</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                buatGudang.mutate(
                  {
                    input: {
                      kode: formGudang.kode,
                      nama: formGudang.nama,
                      alamat: formGudang.alamat || undefined,
                      isDefault: formGudang.isDefault,
                      isActive: true,
                    },
                    user: user!,
                  },
                  {
                    onSuccess: () => {
                      setOpenGudang(false);
                      setFormGudang({ kode: "", nama: "", alamat: "", isDefault: false });
                    },
                  },
                );
              }}
            >
              <FormField label="Kode">
                <input
                  className="input font-mono"
                  value={formGudang.kode}
                  onChange={(e) => setFormGudang({ ...formGudang, kode: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Nama">
                <input
                  className="input"
                  value={formGudang.nama}
                  onChange={(e) => setFormGudang({ ...formGudang, nama: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Alamat">
                <input
                  className="input"
                  value={formGudang.alamat}
                  onChange={(e) => setFormGudang({ ...formGudang, alamat: e.target.value })}
                />
              </FormField>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formGudang.isDefault}
                  onChange={(e) => setFormGudang({ ...formGudang, isDefault: e.target.checked })}
                />
                Jadikan gudang default
              </label>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1" disabled={buatGudang.isPending}>
                  Simpan Gudang
                </button>
                <button type="button" className="btn-secondary" onClick={() => setOpenGudang(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
