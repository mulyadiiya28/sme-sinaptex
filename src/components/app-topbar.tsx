"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, LogOut, Store } from "lucide-react";
import { api } from "@/lib/api/client";
import { urlLogoAbsolut } from "@/lib/api/live";
import { useAuth } from "@/lib/store/auth";
import { useCabang } from "@/lib/store/cabang";
import { useToko } from "@/lib/store/toko";
import { useCabangList } from "@/hooks/queries";
import { useQueryClient } from "@tanstack/react-query";
import { GlobalSearch } from "@/components/global-search";
import { NotifButton } from "@/components/notif-button";
import { cn } from "@/lib/utils";

export function Topbar() {
  const user = useAuth((s) => s.user);
  const namaToko = useToko((s) => s.profil.nama);
  const logoUrl = useToko((s) => s.profil.logoUrl ?? "");
  const clearSession = useAuth((s) => s.clearSession);
  const router = useRouter();
  const qc = useQueryClient();

  const cabangList = useCabangList();
  const cabangAktif = useCabang((s) => s.cabangAktif);
  const setCabangAktif = useCabang((s) => s.setCabangAktif);
  const setDaftar = useCabang((s) => s.setDaftar);

  // Sinkronkan daftar cabang ke store supaya selector selalu terisi.
  useEffect(() => {
    if (cabangList.data) setDaftar(cabangList.data);
  }, [cabangList.data, setDaftar]);

  function gantiCabang(id: string) {
    setCabangAktif(id === "" ? null : id);
    qc.invalidateQueries();
  }

  const namaCabangAktif =
    cabangAktif === null
      ? "Pusat (semua)"
      : cabangList.data?.find((c) => c.id === cabangAktif)?.nama ?? "Cabang";

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
        {logoUrl ? (
          <img
            src={urlLogoAbsolut(logoUrl)}
            alt=""
            className="size-7 rounded-lg border border-line bg-white object-contain"
          />
        ) : (
          <Store className="size-4" aria-hidden />
        )}
        {namaToko}
      </div>
      {cabangList.data && cabangList.data.length > 1 ? (
        <label className="hidden items-center gap-2 sm:flex">
          <Building2 className="size-4 text-muted" aria-hidden />
          <select
            className="rounded-xl border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none"
            value={cabangAktif ?? ""}
            onChange={(e) => gantiCabang(e.target.value)}
            aria-label="Cabang aktif"
          >
            <option value="">Pusat (semua)</option>
            {cabangList.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kode} — {c.nama}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <GlobalSearch />
      <NotifButton />
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
