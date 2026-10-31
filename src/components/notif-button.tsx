"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCircle2, Timer } from "lucide-react";
import { useActiveShift, useProducts, useRiwayatTransaksi } from "@/hooks/queries";
import { useAuth } from "@/lib/store/auth";

type Notif = {
  kunci: string;
  judul: string;
  detail: string;
  href: string;
  nada: "peringatan" | "info";
};

export function NotifButton() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const products = useProducts();
  const transaksi = useRiwayatTransaksi();
  const shift = useActiveShift();
  const [terbuka, setTerbuka] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function klikLuar(e: MouseEvent) {
      if (wadah.current && !wadah.current.contains(e.target as Node)) setTerbuka(false);
    }
    document.addEventListener("mousedown", klikLuar);
    return () => document.removeEventListener("mousedown", klikLuar);
  }, []);

  const menipis = (products.data ?? []).filter(
    (p) => p.status === "aktif" && p.stok <= p.stokMinimum,
  );
  const menunggu = (transaksi.data ?? []).filter((t) => t.status === "menunggu_pembayaran");
  const shiftAktif = shift.data;
  const shiftLain =
    shiftAktif && shiftAktif.cashierUserId !== "" && shiftAktif.cashierUserId !== user?.id;

  const notif: Notif[] = [];
  if (menipis.length > 0) {
    notif.push({
      kunci: "stok",
      judul: `${menipis.length} produk stoknya menipis`,
      detail: menipis
        .slice(0, 3)
        .map((p) => `${p.nama} (${p.stok})`)
        .join(", "),
      href: "/produk",
      nada: "peringatan",
    });
  }
  if (menunggu.length > 0) {
    notif.push({
      kunci: "bayar",
      judul: `${menunggu.length} transaksi menunggu pembayaran`,
      detail: menunggu
        .slice(0, 3)
        .map((t) => t.nomor)
        .join(", "),
      href: "/riwayat",
      nada: "peringatan",
    });
  }
  if (shiftLain && shiftAktif) {
    notif.push({
      kunci: "shift",
      judul: `Shift dibuka oleh ${shiftAktif.kasir}`,
      detail: "Transaksi Anda tetap tercatat atas nama Anda sendiri.",
      href: "/shift",
      nada: "info",
    });
  }

  function buka(href: string) {
    setTerbuka(false);
    router.push(href);
  }

  return (
    <div className="relative" ref={wadah}>
      <button
        type="button"
        aria-label="Notifikasi"
        aria-expanded={terbuka}
        onClick={() => setTerbuka((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted transition-colors hover:text-ink"
      >
        <Bell className="size-4" aria-hidden />
        {notif.length > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {notif.length}
          </span>
        )}
      </button>

      {terbuka && (
        <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          <p className="border-b border-line px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted">
            Notifikasi
          </p>
          {notif.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-4 text-xs text-muted">
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
              Tidak ada hal yang perlu ditindak.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {notif.map((n) => (
                <li key={n.kunci}>
                  <button
                    type="button"
                    onClick={() => buka(n.href)}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand/5"
                  >
                    <span
                      className={
                        n.nada === "peringatan"
                          ? "mt-0.5 text-amber-600"
                          : "mt-0.5 text-brand"
                      }
                    >
                      {n.nada === "peringatan" ? (
                        <AlertTriangle className="size-4" aria-hidden />
                      ) : (
                        <Timer className="size-4" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{n.judul}</span>
                      <span className="block truncate text-[11px] text-muted">{n.detail}</span>
                    </span>
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
