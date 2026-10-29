"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, DoorOpen } from "lucide-react";
import { useProducts, useActiveShift } from "@/hooks/queries";
import { useCart } from "@/lib/store/cart";
import { useAuth } from "@/lib/store/auth";
import { AuthGuard } from "@/components/auth-guard";
import { Skeleton } from "@/components/skeleton";
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
  const user = useAuth((s) => s.user);
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
    return <KasirSkeleton />;
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
      <div className="grid h-screen place-items-center px-6 text-center">
        <div className="panel max-w-sm p-8">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <DoorOpen className="size-6" aria-hidden />
          </span>
          <p className="mt-3 font-black text-brand">Shift belum dibuka</p>
          <p className="mt-1 text-sm text-muted">
            Hai {user?.nama ?? "kasir"} — buka shift dengan menghitung uang tunai di laci sebelum melayani transaksi.
          </p>
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

function KasirSkeleton() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-line/80 bg-white/80 px-6 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-2.5 w-56" />
          </div>
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </header>
      <div className="flex min-h-0 flex-1">
        <section className="w-[62%] border-r border-line/80 p-5">
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="panel space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            ))}
          </div>
        </section>
        <aside className="w-[38%] space-y-3 bg-slate-50/80 p-5">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-11 rounded-xl" />
        </aside>
      </div>
    </div>
  );
}
