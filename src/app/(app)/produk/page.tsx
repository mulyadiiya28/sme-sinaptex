"use client";

import { useMemo, useRef, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import type { Product } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/data-table";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ProductFormDialog } from "@/components/produk/product-form-dialog";
import { useProductMutations, useProducts } from "@/hooks/queries";

type Filter = "semua" | "menipis" | "nonaktif";

export default function ProdukPage() {
  const products = useProducts();
  const { remove } = useProductMutations();
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<Filter>("semua");
  const [dialog, setDialog] = useState<{ open: boolean; editing: Product | null }>({
    open: false,
    editing: null,
  });
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
          <button type="button" onClick={() => setDialog({ open: true, editing: null })} className="btn-primary">
            <Plus className="size-4" aria-hidden /> Tambah Produk
          </button>
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

        {products.isLoading ? (
          <p className="py-12 text-center text-sm text-muted">Memuat produk...</p>
        ) : products.isError ? (
          <p className="py-12 text-center text-sm text-rose-600">Gagal memuat produk.</p>
        ) : (
          <DataTable columns={columns} rows={filtered} empty="Produk tidak ditemukan." className="mt-2" />
        )}
      </div>

      {dialog.open && <ProductFormDialog editing={dialog.editing} onClose={() => setDialog({ open: false, editing: null })} />}
    </div>
  );
}
