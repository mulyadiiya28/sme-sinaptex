"use client";

import { useMemo, useState, useEffect, useRef } from "react";
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

  // --- Navigasi keyboard ---
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset focus saat daftar produk berubah
    if (visible.length === 0) setFocusedIndex(-1);
  }, [visible.length]);

  const navigate = (delta: number) => {
    if (visible.length === 0) return;
    setFocusedIndex((i) => Math.max(0, Math.min(visible.length - 1, i + delta)));
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      const firstFocusable = containerRef.current.querySelector(":focus-visible");
      if (!firstFocusable && focusedIndex >= 0) {
        // Fokus belum di dalam grid, set fokus ke item pertama
        const items = containerRef.current.querySelectorAll<HTMLButtonElement>(
          "button:not([disabled])",
        );
        if (items.length > 0) {
          items[0].focus();
          setFocusedIndex(0);
        }
        return;
      }
      e.preventDefault();
      if (e.key === "ArrowDown") {
        navigate(1);
      } else if (e.key === "ArrowUp") {
        navigate(-1);
      } else if (e.key === "Home") {
        setFocusedIndex(0);
      } else if (e.key === "End") {
        setFocusedIndex(visible.length - 1);
      } else if (e.key === "Enter") {
        if (focusedIndex >= 0 && focusedIndex < visible.length) {
          onPick(visible[focusedIndex]);
          setKeyword("");
          setFocusedIndex(-1);
          // Kembalikan fokus ke input search untuk scan berikutnya
          const input = containerRef.current?.previousElementSibling?.querySelector<HTMLInputElement>("input");
          if (input) input.focus();
        }
      } else if (e.key === "Escape") {
        setFocusedIndex(-1);
        // Fokus kembali ke input search
        const input = containerRef.current?.previousElementSibling?.querySelector<HTMLInputElement>("input");
        if (input) input.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [focusedIndex, visible.length, onPick]);

  // Auto-focus ke item pertama saat daftar muncul & belum ada fokus
  useEffect(() => {
    if (visible.length > 0 && focusedIndex < 0) {
      const timeout = setTimeout(() => {
        const items = containerRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not([disabled])",
        );
        if (items && items.length > 0) {
          items[0].focus();
          setFocusedIndex(0);
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [visible.length, focusedIndex]);

  return (
    <div className="flex h-full min-h-0 flex-col" ref={containerRef}>
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
              setFocusedIndex(-1);
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
          visible.map((p, i) => {
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
                  habis
                    ? "cursor-not-allowed opacity-40"
                    : focusedIndex === i
                      ? "border-brand/30 bg-brand/5 shadow-md"
                      : "hover:border-brand/40 hover:shadow-md",
                )}
                aria-label={p.nama}
                tabIndex={!habis && focusedIndex === i ? 0 : -1}
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