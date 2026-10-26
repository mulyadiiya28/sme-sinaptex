"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { useAuth } from "@/lib/store/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    setSiap(true);
  }, []);

  useEffect(() => {
    if (siap && !user) router.replace("/login");
  }, [siap, user, router]);

  useEffect(() => {
    if (!user) return;
    const item = NAV_GROUPS.flatMap((g) => g.items).find(
      (i) => i.roles && (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)),
    );
    if (item?.roles && !item.roles.includes(user.role)) {
      router.replace(user.role === "kasir" ? "/kasir" : "/");
    }
  }, [user, pathname, router]);

  if (!siap || !user) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted">Memuat sesi...</div>;
  }
  return <>{children}</>;
}

export function AksesDitolak() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="panel p-8 text-center">
        <LockKeyhole className="mx-auto size-8 text-muted" aria-hidden />
        <p className="mt-3 font-bold text-brand">Akses ditolak</p>
        <p className="mt-1 text-sm text-muted">Halaman ini hanya untuk pemilik toko.</p>
        <Link href="/" className="btn-primary mt-4 inline-flex">
          Kembali
        </Link>
      </div>
    </div>
  );
}
