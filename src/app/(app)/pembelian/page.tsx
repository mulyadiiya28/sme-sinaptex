"use client";

import { useState } from "react";
import { Plus, ReceiptText, Trash2 } from "lucide-react";
import type { Pembelian, PembelianItem, PembelianMetode, Product } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { usePembelian, usePembelianMutations } from "@/hooks/queries";
import { useProducts } from "@/hooks/queries";

export default function PembelianPage() {
  const pembelian = usePembelian();
  const [buat, setBuat] = useState(false);

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
        {pembelian.isLoading ? (
          <p className="py-12 text-center text-sm text-muted">Memuat faktur...</p>
        ) : pembelian.isError ? (
          <p className="py-12 text-center text-sm text-rose-600">Gagal memuat faktur pembelian.</p>
        ) : (
          <DataTable
            columns={columns}
            rows={pembelian.data ?? []}
            rowKey={(r) => r.id}
            empty="Belum ada pembelian."
          />
        )}
      </div>

      {buat && <PembelianFormDialog onClose={() => setBuat(false)} />}
    </div>
  );
}

function PembelianFormDialog({ onClose }: { onClose: () => void }) {
  const products = useProducts();
  const { buat } = usePembelianMutations();

  const [pemasok, setPemasok] = useState("");
  const [metode, setMetode] = useState<PembelianMetode>("tunai");
  const [items, setItems] = useState<PembelianItem[]>([]);
  const [produkId, setProdukId] = useState("");
  const [qty, setQty] = useState(0);
  const [harga, setHarga] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const produkDipilih: Product | undefined = products.data?.find((p) => p.id === produkId);
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pemasok.trim()) return setError("Pemasok wajib diisi.");
    if (items.length === 0) return setError("Tambahkan minimal satu item.");
    buat.mutate(
      { pemasok, items, metode },
      { onSuccess: onClose, onError: (err) => setError(String(err)) },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="panel max-h-[90vh] w-full max-w-xl overflow-y-auto p-7">
        <h2 className="font-black text-brand">Buat Pembelian</h2>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Pemasok">
              <input className="input" value={pemasok} onChange={(e) => setPemasok(e.target.value)} placeholder="cth. Sumber Rejeki" autoFocus />
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
              <Plus className="size-3.5" aria-hidden /> Tambah ke faktur
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
                      <button type="button" aria-label="Hapus item" onClick={() => setItems((v) => v.filter((_, x) => x !== idx))} className="text-muted hover:text-rose-600">
                        <Trash2 className="size-3.5" aria-hidden />
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
            <button type="submit" disabled={buat.isPending} className="btn-primary flex-1 disabled:opacity-40">
              <ReceiptText className="size-4" aria-hidden />
              {buat.isPending ? "Menyimpan..." : "Simpan Pembelian"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
