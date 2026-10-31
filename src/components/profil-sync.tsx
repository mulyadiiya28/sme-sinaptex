"use client";

import { useEffect } from "react";
import { useProfilPerusahaan } from "@/hooks/queries";
import { useToko } from "@/lib/store/toko";

/**
 * Menyalin identitas toko dari engine ke cache lokal.
 *
 * Engine yang jadi sumber kebenaran (company profile), sedangkan localStorage
 * hanya cache supaya struk bisa cetak tanpa network. Tanpa sinkron ini,
 * nama toko di topbar bisa berbeda dari nama di faktur PDF.
 */
export function ProfilSync() {
  const perusahaan = useProfilPerusahaan();
  const simpan = useToko((s) => s.simpan);

  useEffect(() => {
    const p = perusahaan.data;
    if (!p || !p.nama) return;

    const store = useToko.getState();
    const sama =
      store.profil.nama === p.nama &&
      store.profil.alamat === p.alamat &&
      store.profil.telepon === p.telepon;
    if (sama) return;

    simpan({
      ...store.profil,
      nama: p.nama,
      alamat: p.alamat,
      telepon: p.telepon,
      email: p.email,
      website: p.website,
      npwp: p.npwp,
      logoUrl: p.logoUrl,
    });
  }, [perusahaan.data, simpan]);

  return null;
}
