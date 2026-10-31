"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Menu, Package, ReceiptText, Search } from "lucide-react";
import { useProducts, useRiwayatTransaksi } from "@/hooks/queries";
import { NAV_GROUPS } from "@/lib/nav";
import { useAuth } from "@/lib/store/auth";

type Hasil = {
  kunci: string;
  judul: string;
  detail: string;
  href: string;
  jenis: "produk" | "transaksi" | "menu";
};

export function GlobalSearch() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const products = useProducts();
  const transaksi = useRiwayatTransaksi();
  const [cari, setCari] = useState("");
  const [terbuka, setTerbuka] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);

  // Klik di luar menutup hasil — dropdown yang tidak bisa ditutup adalah
  // dropdown yang menutup halaman.
  useEffect(() => {
    function klikLuar(e: MouseEvent) {
      if (wadah.current && !wadah.current.contains(e.target as Node)) setTerbuka(false);
    }
    document.addEventListener("mousedown", klikLuar);
    return () => document.removeEventListener("mousedown", klikLuar);
  }, []);

  const hasil = useMemo<Hasil[]>(() => {
    const q = cari.trim().toLowerCase();
    if (q.length < 2) return [];

    const produk: Hasil[] = (products.data ?? [])
      .filter(
        (p) =>
          p.nama.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((p) => ({
        kunci: `produk-${p.id}`,
        judul: p.nama,
        detail: `${p.sku} · stok ${p.stok}`,
        href: `/produk?cari=${encodeURIComponent(p.nama)}`,
        jenis: "produk",
      }));

    const riwayat: Hasil[] = (transaksi.data ?? [])
      .filter(
        (t) =>
          t.nomor.toLowerCase().includes(q) ||
          (t.pelanggan ?? "").toLowerCase().includes(q) ||
          t.kasir.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((t) => ({
        kunci: `transaksi-${t.nomor}`,
        judul: t.nomor,
        detail: [t.pelanggan, t.kasir].filter(Boolean).join(" · ") || "Transaksi",
        href: `/riwayat?cari=${encodeURIComponent(t.nomor)}`,
        jenis: "transaksi",
      }));

    const menu: Hasil[] = NAV_GROUPS.flatMap((g) => g.items)
      .filter(
        (i) =>
          i.label.toLowerCase().includes(q) &&
          (!i.roles || (user ? i.roles.includes(user.role) : false)),
      )
      .slice(0, 4)
      .map((i) => ({
        kunci: `menu-${i.href}`,
        judul: i.label,
        detail: "Menu",
        href: i.href,
        jenis: "menu",
      }));

    return [...produk, ...riwayat, ...menu];
  }, [cari, products.data, transaksi.data, user]);

  function buka(href: string) {
    setTerbuka(false);
    setCari("");
    router.push(href);
  }

  return (
    <div className="relative ml-auto w-full max-w-xs" ref={wadah}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted/60" aria-hidden />
      <input
        type="search"
        value={cari}
        onChange={(e) => {
          setCari(e.target.value);
          setTerbuka(true);
        }}
        onFocus={() => setTerbuka(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setTerbuka(false);
            setCari("");
          }
          if (e.key === "Enter" && hasil.length > 0) buka(hasil[0].href);
        }}
        placeholder="Cari produk, transaksi, menu..."
        className="input pl-9"
        aria-label="Cari produk, transaksi, atau menu"
      />

      {terbuka && cari.trim().length >= 2 && (
        <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          {hasil.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted">Tidak ada yang cocok dengan “{cari}”.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {hasil.map((h) => (
                <li key={h.kunci}>
                  <button
                    type="button"
                    onClick={() => buka(h.href)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-brand/5"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      {h.jenis === "produk" ? (
                        <Package className="size-3.5" aria-hidden />
                      ) : h.jenis === "transaksi" ? (
                        <ReceiptText className="size-3.5" aria-hidden />
                      ) : (
                        <Menu className="size-3.5" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{h.judul}</span>
                      <span className="block truncate text-[11px] text-muted">{h.detail}</span>
                    </span>
                    <CornerDownLeft className="size-3.5 shrink-0 text-muted/60" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
