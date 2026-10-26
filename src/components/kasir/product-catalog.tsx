"use client";

import { useMemo, useState } from "react";
import { PackageX, Search } from "lucide-react";
import type { Product } from "@/lib/api/types";
import { MoneyDisplay } from "@/components/money-display";
import { cn } from "@/lib/utils";

export function ProductCatalog({
  products,
  onPick,
}: {
  products: Product[];
  onPick: (product: Product) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [kategori, setKategori] = useState<string | null>(null);

  const kategoris = useMemo(
    () => Array.from(new Set(products.map((p) => p.kategori))),
    [products],
  );

  const visible = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return products.filter((p) => {
      if (p.status !== "aktif") return false;
      const sesuaiKategori = !kategori || p.kategori === kategori;
      const sesuaiKata =
        !q ||
        p.nama.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.sku.toLowerCase().includes(q);
      return sesuaiKategori && sesuaiKata;
    });
  }, [products, keyword, kategori]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted/60"
          aria-hidden
        />
        <input
          id="pos-product-search"
          type="search"
          placeholder="Scan barcode atau cari nama produk, lalu Enter..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && visible.length > 0) {
              onPick(visible[0]);
              e.currentTarget.value = "";
              setKeyword("");
            }
          }}
          className="input py-3.5 pl-11 text-base"
          autoFocus
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Chip label="Semua" active={kategori === null} onClick={() => setKategori(null)} />
        {kategoris.map((k) => (
          <Chip key={k} label={k} active={kategori === k} onClick={() => setKategori(k)} />
        ))}
      </div>

      <div className="mt-4 grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto pr-1 md:grid-cols-3 xl:grid-cols-4">
        {visible.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-2 py-14 text-muted">
            <PackageX className="size-8" aria-hidden />
            <p className="text-sm">Produk tidak ditemukan.</p>
          </div>
        ) : (
          visible.map((p) => {
            const habis = p.stok <= 0;
            const menipis = !habis && p.stok <= p.stokMinimum;
            return (
              <button
                key={p.id}
                type="button"
                disabled={habis}
                onClick={() => onPick(p)}
                className={cn(
                  "panel group rounded-2xl p-4 text-left transition",
                  habis ? "cursor-not-allowed opacity-40" : "hover:border-brand/40 hover:shadow-md",
                )}
              >
                <span className="block truncate font-semibold text-ink group-hover:text-brand">
                  {p.nama}
                </span>
                <MoneyDisplay value={p.hargaJual} className="mt-1 block text-sm font-bold text-brand" />
                <span className="mt-2 flex items-center gap-2 text-xs text-muted">
                  Stok {p.stok}
                  {menipis && <span className="font-semibold text-amber-600">· menipis</span>}
                  {habis && <span className="font-semibold text-rose-600">· habis</span>}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "border-brand bg-brand text-white" : "border-line bg-white text-muted hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}
