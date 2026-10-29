"use client";

import { useMemo, useRef, useState } from "react";
import { Pencil, Plus, Search, SlidersHorizontal } from "lucide-react";
import type { PenyesuaianStokInput, Product } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ProductFormDialog } from "@/components/produk/product-form-dialog";
import { useProductMutations, useProducts } from "@/hooks/queries";
import { useAuth } from "@/lib/store/auth";

type Filter = "semua" | "menipis" | "nonaktif";

export default function ProdukPage() {
  const products = useProducts();
  const { remove } = useProductMutations();
  const user = useAuth((s) => s.user);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<Filter>("semua");
  const [dialog, setDialog] = useState<{ open: boolean; editing: Product | null }>({
    open: false,
    editing: null,
  });
  const [penyesuaian, setPenyesuaian] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return (products.data ?? []).filter((p) => {
      const sesuaiKata =
        !q || p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q);
      const sesuaiFilter =
        filter === "semua" ||
        (filter === "menipis" && p.stok > 0 && p.stok <= p.stokMinimum) ||
        (filter === "nonaktif" && p.status === "nonaktif");
      return sesuaiKata && sesuaiFilter;
    });
  }, [products.data, keyword, filter]);

  const columns: Column<Product>[] = [
    { key: "sku", header: "SKU / Barcode", render: (r) => (
      <span>
        <span className="block font-semibold text-ink">{r.sku}</span>
        <span className="block text-xs text-muted">{r.barcode || "—"}</span>
      </span>
    ) },
    { key: "nama", header: "Nama produk", render: (r) => <span className="font-medium">{r.nama}</span> },
    { key: "satuan", header: "Satuan" },
    { key: "hargaBeli", header: "Harga beli", align: "right", render: (r) => <MoneyDisplay value={r.hargaBeli} /> },
    { key: "hargaJual", header: "Harga jual", align: "right", render: (r) => <MoneyDisplay value={r.hargaJual} /> },
    { key: "stok", header: "Stok", align: "right", render: (r) => (
      <span className={r.stok <= r.stokMinimum ? "font-bold text-amber-600" : undefined}>{r.stok}</span>
    ) },
    { key: "status", header: "Status", align: "center", render: (r) => {
      if (r.status === "nonaktif") return <StatusBadge label="Nonaktif" tone="neutral" />;
      if (r.stok <= r.stokMinimum) return <StatusBadge label="Stok menipis" tone="warning" />;
      return <StatusBadge label="Aktif" tone="success" />;
    } },
    { key: "aksi", header: "", align: "right", render: (r) => (
      <button
        type="button"
        onClick={() => setDialog({ open: true, editing: r })}
        className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs"
      >
        <Pencil className="size-3.5" aria-hidden /> Edit
      </button>
    ) },
  ];

  return (
    <div>
      <PageHeader
        title="Produk & Stok"
        description="Master produk untuk kasir. Stok tersedia nantinya dihitung engine dari mutasi stok."
        actions={
          <div className="flex gap-2">
            {user?.role === "pemilik" && (
              <button type="button" onClick={() => setPenyesuaian(true)} className="btn-secondary">
                <SlidersHorizontal className="size-4" aria-hidden /> Penyesuaian Stok
              </button>
            )}
            <button type="button" onClick={() => setDialog({ open: true, editing: null })} className="btn-primary">
              <Plus className="size-4" aria-hidden /> Tambah Produk
            </button>
          </div>
        }
      />

      <div className="panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted/60" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nama, SKU, atau barcode..."
              className="input pl-9"
            />
          </div>
          <div className="flex gap-2">
            {([
              ["semua", "Semua"],
              ["menipis", "Stok menipis"],
              ["nonaktif", "Nonaktif"],
            ] as Array<[Filter, string]>).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={
                  filter === id
                    ? "rounded-full border border-brand bg-brand px-3 py-1.5 text-xs font-semibold text-white"
                    : "rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {products.isError ? (
          <p className="py-12 text-center text-sm text-rose-600">Gagal memuat produk.</p>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            loading={products.isLoading}
            empty="Produk tidak ditemukan."
            className="mt-2"
          />
        )}
      </div>

      {dialog.open && <ProductFormDialog editing={dialog.editing} onClose={() => setDialog({ open: false, editing: null })} />}
      {penyesuaian && (
        <PenyesuaianStokDialog
          produk={products.data ?? []}
          pending={false}
          onClose={() => setPenyesuaian(false)}
        />
      )}
    </div>
  );
}

function PenyesuaianStokDialog({
  produk,
  onClose,
}: {
  produk: Product[];
  pending?: boolean;
  onClose: () => void;
}) {
  const penyesuaianStok = useProductMutations().penyesuaianStok;
  const user = useAuth((s) => s.user);
  const [input, setInput] = useState<PenyesuaianStokInput>({ productId: "", stokFisik: 0, alasan: "stok opname" });
  const [error, setError] = useState<string | null>(null);
  const terpilih = produk.find((p) => p.id === input.productId);
  const selisih = terpilih ? input.stokFisik - terpilih.stok : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="panel w-full max-w-sm p-7" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-black text-brand">Penyesuaian stok</h2>
        <p className="mt-1 text-xs text-muted">
          Stok sistem diganti dengan stok fisik hasil hitung (stok opname). Selisih membentuk jurnal akun
          &ldquo;Selisih stok&rdquo; dan tercatat di audit log.
        </p>
        <form
          className="mt-4 space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!user) return setError("Sesi tidak ditemukan.");
            if (!terpilih) return setError("Pilih produk terlebih dahulu.");
            penyesuaianStok.mutate(
              { input, user },
              { onSuccess: () => onClose(), onError: (err) => setError(String(err)) },
            );
          }}
        >
          <FormField label="Produk">
            <select className="input" value={input.productId} onChange={(e) => setInput({ ...input, productId: e.target.value })} autoFocus>
              <option value="">— pilih produk —</option>
              {produk.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} (sistem: {p.stok} {p.satuan})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={`Stok fisik (${terpilih?.satuan ?? "satuan"})`}>
            <input
              type="number"
              min={0}
              className="input text-right tabular-nums"
              value={input.stokFisik || ""}
              onChange={(e) => setInput({ ...input, stokFisik: Number(e.target.value) })}
            />
          </FormField>
          <FormField label="Alasan">
            <select className="input" value={input.alasan} onChange={(e) => setInput({ ...input, alasan: e.target.value })}>
              <option value="stok opname">Stok opname</option>
              <option value="rusak">Rusak / kedaluwarsa</option>
              <option value="hilang">Hilang</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </FormField>
          {terpilih && selisih !== 0 && (
            <p className={`rounded-xl px-3 py-2 text-xs ${selisih > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              Selisih {selisih > 0 ? "+" : ""}{selisih} — nilai jurnal{" "}
              <MoneyDisplay value={Math.abs(selisih) * terpilih.hargaBeli} className="font-bold" />
            </p>
          )}
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">Simpan Penyesuaian</button>
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
