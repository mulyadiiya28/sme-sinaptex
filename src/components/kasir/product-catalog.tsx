"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Search, PackageX } from "lucide-react";
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

  // --- Navigasi keyboard ---
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);

  const indeksAktif = useMemo(() => {
    if (focusedIndex >= 0 && visible[focusedIndex]?.stok > 0) return focusedIndex;
    return visible.findIndex((p) => p.stok > 0);
  }, [focusedIndex, visible]);

  useEffect(() => {
    setFocusedIndex((i) => {
      if (visible.length === 0) return -1;
      if (i >= 0 && i < visible.length && visible[i].stok > 0) return i;
      return visible.findIndex((p) => p.stok > 0);
    });
  }, [visible]);

  const fokusBaris = (index: number) => {
    setFocusedIndex(index);
    const row = rowRefs.current[index];
    row?.focus();
    row?.scrollIntoView({ block: "nearest" });
  };

  const pindahBaris = (dari: number, arah: 1 | -1) => {
    if (visible.length === 0) return;
    const awal = dari >= 0 && dari < visible.length ? dari : -1;
    for (let i = awal + arah; i >= 0 && i < visible.length; i += arah) {
      if (visible[i].stok > 0) {
        fokusBaris(i);
        return;
      }
    }
  };

  const keUjung = (dariAwal: boolean) => {
    if (dariAwal) {
      const index = visible.findIndex((p) => p.stok > 0);
      if (index >= 0) fokusBaris(index);
      return;
    }
    for (let i = visible.length - 1; i >= 0; i--) {
      if (visible[i].stok > 0) {
        fokusBaris(i);
        return;
      }
    }
  };

  const pilih = (product: Product) => {
    if (product.stok <= 0) return;
    onPick(product);
    setKeyword("");
    setFocusedIndex(-1);
    searchRef.current?.focus();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative mb-3">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted/60"
          aria-hidden
        />
        <input
          id="pos-product-search"
          ref={searchRef}
          type="search"
          placeholder="Cari nama produk, SKU, atau barcode..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const pertama = visible.find((p) => p.stok > 0);
              if (!pertama) return;
              e.preventDefault();
              pilih(pertama);
            } else if (e.key === "ArrowDown" && visible.length > 0) {
              e.preventDefault();
              keUjung(true);
            }
          }}
          className="input pl-11 text-base"
          autoFocus
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setKategori(null)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            kategori === null
              ? "border-brand bg-brand text-white"
              : "border-line bg-white text-muted hover:text-ink",
          )}
        >
          Semua
        </button>
        {kategoris.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKategori(k)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              kategori === k
                ? "border-brand bg-brand text-white"
                : "border-line bg-white text-muted hover:text-ink",
            )}
          >
            {k}
          </button>
        ))}
      </div>

      <div
        className="mt-4 min-h-0 flex-1 overflow-y-auto border border-line rounded-2xl bg-white"
        onKeyDown={(e) => {
          const target = e.target as HTMLElement;
          const index = Number(target.dataset.index);
          if (!target.dataset.index || Number.isNaN(index)) return;

          if (e.key === "ArrowDown") {
            e.preventDefault();
            pindahBaris(index, 1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            pindahBaris(index, -1);
          } else if (e.key === "Home") {
            e.preventDefault();
            keUjung(true);
          } else if (e.key === "End") {
            e.preventDefault();
            keUjung(false);
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (visible[index]) pilih(visible[index]);
          } else if (e.key === "Escape") {
            e.preventDefault();
            searchRef.current?.focus();
          }
        }}
      >
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-3 font-medium text-muted">Produk</th>
              <th className="px-4 py-3 font-medium text-muted">Kategori</th>
              <th className="px-4 py-3 font-medium text-muted text-right">Harga Jual</th>
              <th className="px-4 py-3 font-medium text-muted text-center">Stok</th>
              <th className="px-4 py-3 font-medium text-muted text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center">
                  <PackageX className="mx-auto size-8 mb-1.5" aria-hidden />
                  <p className="text-sm text-muted">Produk tidak ditemukan.</p>
                </td>
              </tr>
            ) : (
              visible.map((p, i) => {
                const habis = p.stok <= 0;
                const menipis = !habis && p.stok <= p.stokMinimum;
                return (
                  <tr
                    key={p.id}
                    ref={(el) => {
                      rowRefs.current[i] = el;
                    }}
                    data-index={i}
                    onClick={() => pilih(p)}
                    onFocus={() => setFocusedIndex(i)}
                    onMouseEnter={() => setFocusedIndex(i)}
                    tabIndex={i === indeksAktif ? 0 : -1}
                    aria-disabled={habis}
                    className={cn(
                      "group border-b border-line/40 transition",
                      habis ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-brand/5",
                      focusedIndex === i ? "bg-brand/10 ring-1 ring-brand" : "",
                    )}
                  >
                    <td className="px-4 py-3.5">
                      <span className="block truncate font-semibold text-ink group-hover:text-brand">
                        {p.nama}
                      </span>
                      <span className="text-[11px] text-muted">{p.sku}</span>
                    </td>
                    <td className="px-4 py-3.5 text-muted">{p.kategori}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums font-medium text-ink">
                      <MoneyDisplay value={p.hargaJual} className="text-brand" />
                    </td>
                    <td className="px-4 py-3.5 text-center tabular-nums">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          habis
                            ? "text-rose-600"
                            : menipis
                              ? "text-amber-600"
                              : "text-emerald-600",
                        )}
                      >
                        {habis ? "Habis" : menipis ? `Menipis (${p.stok})` : p.stok}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-xs text-muted">Pilih</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] text-muted">
        Tekan F2 untuk fokus pencarian, panah atas/bawah untuk pilih produk, dan Enter untuk
        tambah ke keranjang.
      </p>
    </div>
  );
}
