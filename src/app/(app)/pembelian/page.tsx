"use client";

import { useState } from "react";
import { Plus, ReceiptText, RotateCcw, Trash2 } from "lucide-react";
import type { Pembelian, PembelianItem, PembelianMetode, Product, ReturPembelianInput } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { usePembelian, usePembelianMutations, useProducts, useSupplierCreate, useSupplierList } from "@/hooks/queries";
import { useAuth } from "@/lib/store/auth";
import { kodeDariNama } from "@/lib/utils";

export default function PembelianPage() {
  const pembelian = usePembelian();
  const user = useAuth((s) => s.user);
  const [buat, setBuat] = useState(false);
  const [returDari, setReturDari] = useState<Pembelian | null>(null);

  const columns: Column<Pembelian>[] = [
    { key: "nomor", header: "Nomor", render: (r) => <span className="font-semibold text-brand">{r.nomor}</span> },
    { key: "waktu", header: "Waktu", render: (r) => (
      <span className="text-muted">{new Date(r.waktu).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
    ) },
    { key: "pemasok", header: "Pemasok", render: (r) => <span className="font-medium">{r.pemasok}</span> },
    { key: "item", header: "Item", align: "center", render: (r) => r.items.length },
    { key: "total", header: "Total", align: "right", render: (r) => <MoneyDisplay value={r.total} /> },
    { key: "metode", header: "Pembayaran", align: "center", render: (r) => {
      if (r.metode === "hutang") {
        return r.terbayar >= r.total
          ? <StatusBadge label="Lunas" tone="success" />
          : <StatusBadge label={`Hutang · sisa ${new Intl.NumberFormat("id-ID").format(r.total - r.terbayar)}`} tone="warning" />;
      }
      return <StatusBadge label={r.metode === "tunai" ? "Tunai" : "Bank"} tone="info" />;
    } },
    { key: "aksi", header: "", align: "right", render: (r) => (
      user?.role === "pemilik" ? (
        <button
          type="button"
          onClick={() => setReturDari(r)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
        >
          <RotateCcw className="size-3.5" aria-hidden /> Retur
        </button>
      ) : null
    ) },
  ];

  return (
    <div>
      <PageHeader
        title="Pembelian & Persediaan"
        description="Faktur pembelian menambah stok dan memperbarui harga beli (HPP) produk, lalu membentuk jurnal otomatis."
        actions={
          <button type="button" onClick={() => setBuat(true)} className="btn-primary">
            <Plus className="size-4" aria-hidden /> Buat Pembelian
          </button>
        }
      />

      <div className="panel p-4">
        {pembelian.isError ? (
          <p className="py-12 text-center text-sm text-rose-600">Gagal memuat faktur pembelian.</p>
        ) : (
          <DataTable
            columns={columns}
            rows={pembelian.data ?? []}
            rowKey={(r) => r.id}
            loading={pembelian.isLoading}
            empty="Belum ada pembelian."
          />
        )}
      </div>

      {buat && <PembelianFormDialog onClose={() => setBuat(false)} />}
      {returDari && <ReturPembelianDialog pembelian={returDari} onClose={() => setReturDari(null)} />}
    </div>
  );
}

function PembelianFormDialog({ onClose }: { onClose: () => void }) {
  const products = useProducts();
  const suppliers = useSupplierList();
  const { buat } = usePembelianMutations();
  const { mutateAsync: createSupplier, isPending: creatingSupplier } = useSupplierCreate();

  const [pemasokId, setPemasokId] = useState<string | null>(null);
  const [pemasokNama, setPemasokNama] = useState("");
  const [metode, setMetode] = useState<PembelianMetode>("tunai");
  const [items, setItems] = useState<PembelianItem[]>([]);
  const [produkId, setProdukId] = useState("");
  const [qty, setQty] = useState(0);
  const [harga, setHarga] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const produkDipilih: Product | undefined = products.data?.find((p) => p.id === produkId);
  const suppliersAktif = (suppliers.data ?? []).filter((s) => s.isActive);
  const total = items.reduce((s, i) => s + i.qty * i.hargaBeli, 0);

  function tambahItem() {
    setError(null);
    if (!produkDipilih) return setError("Pilih produk terlebih dahulu.");
    if (qty <= 0) return setError("Kuantitas harus lebih dari nol.");
    if (harga <= 0) return setError("Harga beli harus lebih dari nol.");
    setItems((v) => [...v, { productId: produkDipilih.id, nama: produkDipilih.nama, qty, hargaBeli: harga }]);
    setProdukId("");
    setQty(0);
    setHarga(0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (items.length === 0) return setError("Tambahkan minimal satu item.");

    const nama = pemasokNama.trim();
    if (!nama && metode === "hutang") {
      return setError("Pembelian hutang wajib menyebut pemasok agar sisa hutang bisa dilacak. Untuk pembelian pasar, pilih Tunai.");
    }

    let supplierId = pemasokId;
    let pemasok = nama;
    if (nama && !supplierId) {
      const cocok = suppliersAktif.find((s) => s.name.trim().toLowerCase() === nama.toLowerCase());
      if (cocok) {
        supplierId = cocok.id;
        pemasok = cocok.name;
      } else {
        try {
          const baru = await createSupplier({
            code: kodeDariNama(nama, (suppliers.data ?? []).map((s) => s.code)),
            name: nama,
          });
          supplierId = baru.id;
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          return;
        }
      }
    }
    if (!nama) pemasok = "Tanpa pemasok";

    buat.mutate(
      { pemasok, supplierId, items, metode },
      { onSuccess: onClose, onError: (err) => setError(String(err)) },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="panel max-h-[90vh] w-full max-w-xl overflow-y-auto p-7">
        <h2 className="font-black text-brand">Buat Pembelian</h2>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Pemasok"
              hint={
                metode === "hutang"
                  ? "Wajib untuk pembelian hutang."
                  : "Boleh kosong untuk pembelian pasar. Nama baru otomatis disimpan sebagai pemasok."
              }
            >
              <input
                className="input"
                list="daftar-pemasok"
                value={pemasokNama}
                onChange={(e) => {
                  const nilai = e.target.value;
                  setPemasokNama(nilai);
                  const cocok = suppliersAktif.find((s) => s.name.trim().toLowerCase() === nilai.trim().toLowerCase());
                  setPemasokId(cocok?.id ?? null);
                }}
                placeholder="Ketik nama pemasok / pasar..."
              />
              <datalist id="daftar-pemasok">
                {suppliersAktif.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Metode pembayaran">
              <select className="input" value={metode} onChange={(e) => setMetode(e.target.value as PembelianMetode)}>
                <option value="tunai">Tunai (kas)</option>
                <option value="bank">Transfer/bank</option>
                <option value="hutang">Hutang ke pemasok</option>
              </select>
            </FormField>
          </div>

          <div className="rounded-2xl border border-line bg-slate-50/70 p-3.5">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Tambah item</p>
            <div className="grid grid-cols-4 items-end gap-2">
              <FormField label="Produk" className="col-span-2">
                <select
                  className="input"
                  value={produkId}
                  onChange={(e) => {
                    setProdukId(e.target.value);
                    const p = products.data?.find((x) => x.id === e.target.value);
                    setHarga(p?.hargaBeli ?? 0);
                  }}
                >
                  <option value="">Pilih...</option>
                  {(products.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Qty">
                <input type="number" min={0} className="input text-right tabular-nums" value={qty || ""} onChange={(e) => setQty(Number(e.target.value))} />
              </FormField>
              <FormField label="Harga beli">
                <input type="number" min={0} className="input text-right tabular-nums" value={harga || ""} onChange={(e) => setHarga(Number(e.target.value))} />
              </FormField>
            </div>
            <button type="button" onClick={tambahItem} className="btn-secondary mt-2 w-full rounded-lg py-2 text-xs">
              <Plus className="size-4" aria-hidden /> Tambah ke faktur
            </button>
          </div>

          {items.length > 0 && (
            <table className="w-full text-sm">
              <tbody>
                {items.map((i, idx) => (
                  <tr key={idx} className="border-b border-line/60 last:border-0">
                    <td className="py-2">{i.nama}<span className="block text-xs text-muted">{i.qty} × <MoneyDisplay value={i.hargaBeli} /></span></td>
                    <td className="py-2 text-right"><MoneyDisplay value={i.qty * i.hargaBeli} /></td>
                    <td className="w-8 py-2 text-right">
                      <button
                        type="button"
                        aria-label="Hapus item"
                        onClick={() => setItems((v) => v.filter((_, x) => x !== idx))}
                        className="flex items-center justify-center size-8 rounded-lg border border-line bg-white text-muted hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                      >
                        <Trash2 className="size-4.5" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex items-baseline justify-between border-t border-dashed border-line pt-3 text-sm">
            <span className="font-bold text-ink">Total</span>
            <MoneyDisplay value={total} className="text-lg font-black text-brand" />
          </div>

          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={buat.isPending || creatingSupplier} className="btn-primary flex-1 disabled:opacity-40">
              <ReceiptText className="size-4" aria-hidden />
              {buat.isPending || creatingSupplier ? "Menyimpan..." : "Simpan Pembelian"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReturPembelianDialog({ pembelian, onClose }: { pembelian: Pembelian; onClose: () => void }) {
  const { retur } = usePembelianMutations();
  const user = useAuth((s) => s.user);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [alasan, setAlasan] = useState("barang rusak");
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<{ nomor: string; menunggu: boolean } | null>(null);

  // Satu produk bisa tercatat di beberapa baris faktur; retur memakai nama,
  // jadi baris digabung dulu dan batas qty = total yang pernah dibeli.
  const baris = (() => {
    const unik = new Map<string, { nama: string; hargaBeli: number; qty: number }>();
    for (const i of pembelian.items) {
      const ada = unik.get(i.nama);
      if (ada) ada.qty += i.qty;
      else unik.set(i.nama, { nama: i.nama, hargaBeli: i.hargaBeli, qty: i.qty });
    }
    return [...unik.values()];
  })();

  const items = baris
    .map((i) => ({ nama: i.nama, qty: Math.min(Math.max(0, Math.floor(qty[i.nama] ?? 0)), i.qty) }))
    .filter((i) => i.qty > 0);

  const total = items.reduce((s, it) => {
    const asli = baris.find((b) => b.nama === it.nama);
    return s + (asli?.hargaBeli ?? 0) * it.qty;
  }, 0);

  if (hasil) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
        <div className="panel w-full max-w-md p-7 text-center">
          <h2 className="flex items-center justify-center gap-2 font-black text-brand">
            <RotateCcw className="size-5" aria-hidden /> Retur {hasil.nomor} dibuat
          </h2>
          <p className="mt-2 text-sm text-muted">
            {hasil.menunggu
              ? "Batch ditahan aturan persetujuan. Stok baru keluar setelah pemilik menyetujui di halaman Persetujuan."
              : "Stok sudah dikurangi dan hutang ke pemasok dikreditkan."}
          </p>
          <button type="button" onClick={onClose} className="btn-primary mt-5 w-full">
            Selesai
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="panel max-h-[90vh] w-full max-w-md overflow-y-auto p-7" onClick={(e) => e.stopPropagation()}>
        <h2 className="flex items-center gap-2 font-black text-brand">
          <RotateCcw className="size-5" aria-hidden /> Retur dari {pembelian.nomor}
        </h2>
        <p className="mt-1 text-xs text-muted">
          Tentukan jumlah barang yang dikembalikan ke {pembelian.pemasok} — stok berkurang dan hutang usaha dikreditkan.
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!user) return setError("Sesi tidak ditemukan.");
            if (items.length === 0) return setError("Isi jumlah minimal satu item.");
            const input: ReturPembelianInput = { referensi: pembelian.nomor, items, alasan };
            retur.mutate(
              { input, user },
              {
                onSuccess: (r) => setHasil({ nomor: r.nomor, menunggu: r.menungguPersetujuan }),
                onError: (err) => setError(String(err)),
              },
            );
          }}
        >
          <div className="space-y-2">
            {baris.map((i, idx) => (
              <div key={`${i.nama}-${idx}`} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white p-2.5">
                <div>
                  <p className="text-sm font-semibold text-ink">{i.nama}</p>
                  <p className="text-xs text-muted">dibeli {i.qty} × <MoneyDisplay value={i.hargaBeli} /></p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={i.qty}
                  value={qty[i.nama] ?? ""}
                  onChange={(e) => setQty({ ...qty, [i.nama]: Number(e.target.value) })}
                  className="input w-20 text-right tabular-nums"
                  placeholder={`0-${i.qty}`}
                  aria-label={`Jumlah retur ${i.nama}`}
                />
              </div>
            ))}
          </div>
          <FormField label="Alasan retur">
            <input className="input" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
          </FormField>

          <div className="flex items-baseline justify-between border-t border-dashed border-line pt-3 text-sm">
            <span className="font-bold text-ink">Nilai retur</span>
            <MoneyDisplay value={total} className="text-lg font-black text-brand" />
          </div>

          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={retur.isPending} className="btn-primary flex-1 disabled:opacity-40">
              <RotateCcw className="size-4" aria-hidden />
              {retur.isPending ? "Memproses..." : "Proses Retur"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
