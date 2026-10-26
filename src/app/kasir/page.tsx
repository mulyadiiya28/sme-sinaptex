"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useProducts, useActiveShift } from "@/hooks/queries";
import { useCart } from "@/lib/store/cart";
import { AuthGuard } from "@/components/auth-guard";
import { ProductCatalog } from "@/components/kasir/product-catalog";
import { CartPanel } from "@/components/kasir/cart-panel";
import { PaymentDialog } from "@/components/kasir/payment-dialog";

export default function KasirPage() {
  return (
    <AuthGuard>
      <KasirScreen />
    </AuthGuard>
  );
}

function KasirScreen() {
  const products = useProducts();
  const shift = useActiveShift();
  const add = useCart((s) => s.add);
  const reset = useCart((s) => s.reset);
  const lines = useCart((s) => s.lines);
  const [bayar, setBayar] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        document.getElementById("pos-product-search")?.focus();
      }
      if (e.key === "F4" && useCart.getState().lines.length > 0) {
        e.preventDefault();
        setBayar(true);
      }
      if (e.key === "Escape") setBayar(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (products.isLoading || shift.isLoading) {
    return <div className="grid h-screen place-items-center text-sm text-muted">Memuat kasir...</div>;
  }
  if (products.isError || !products.data) {
    return (
      <div className="grid h-screen place-items-center text-sm text-rose-600">
        Gagal memuat produk.
      </div>
    );
  }
  if (!shift.data) {
    return (
      <div className="grid h-screen place-items-center gap-3 text-center">
        <div>
          <p className="font-black text-brand">Shift belum dibuka</p>
          <p className="mt-1 text-sm text-muted">Buka shift dulu untuk bisa melayani transaksi.</p>
          <Link href="/shift" className="btn-primary mt-4 inline-flex">Buka Shift</Link>
        </div>
      </div>
    );
  }

  const tutupDialog = (resetCart: boolean) => {
    if (resetCart) reset();
    setBayar(false);
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-line/80 bg-white/80 px-6 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link href="/" className="btn-secondary px-3 py-2" aria-label="Kembali ke dashboard">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <div>
            <h1 className="text-sm font-black text-brand">Kasir — Transaksi Baru</h1>
            <p className="text-[11px] text-muted">
              Kasir {shift.data.kasir} · Shift {shift.data.id} · Pelanggan opsional
            </p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          Shift aktif
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="w-[62%] border-r border-line/80 p-5">
          <ProductCatalog products={products.data} onPick={add} />
        </section>

        <aside className="w-[38%] bg-slate-50/80">
          <CartPanel
            onBayar={() => setBayar(true)}
            onBatal={() => {
              if (confirm("Batal dan kosongkan keranjang?")) reset();
            }}
          />
        </aside>
      </div>

      {bayar && (
        <PaymentDialog
          kasir={shift.data.kasir}
          shiftId={shift.data.id}
          onClose={tutupDialog}
        />
      )}
    </div>
  );
}
