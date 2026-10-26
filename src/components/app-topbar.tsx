"use client";

import { useRouter } from "next/navigation";
import { Bell, LogOut, Search, Store } from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import { useToko } from "@/lib/store/toko";

export function Topbar() {
  const user = useAuth((s) => s.user);
  const namaToko = useToko((s) => s.profil.nama);
  const clearSession = useAuth((s) => s.clearSession);
  const router = useRouter();

  async function keluar() {
    if (user) await api.auth.logout(user);
    clearSession();
    router.replace("/login");
  }

  const inisial = (user?.nama ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-line/80 bg-white/80 px-6 py-3.5 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-sm font-semibold text-brand">
        <Store className="size-4" aria-hidden />
        {namaToko}
      </div>
      <div className="relative ml-auto w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted/60" aria-hidden />
        <input type="search" placeholder="Cari..." className="input pl-9" />
      </div>
      <button
        type="button"
        aria-label="Notifikasi"
        className="relative flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted transition-colors hover:text-ink"
      >
        <Bell className="size-4" aria-hidden />
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" />
      </button>
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
          {inisial}
        </span>
        <span className="hidden text-xs leading-tight sm:block">
          <span className="block font-semibold text-ink">{user?.nama ?? "—"}</span>
          <span className="block capitalize text-muted">{user?.role ?? ""} · {namaToko}</span>
        </span>
      </div>
      <button
        type="button"
        onClick={keluar}
        aria-label="Keluar"
        title="Keluar"
        className="flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
      >
        <LogOut className="size-4" aria-hidden />
      </button>
    </header>
  );
}
