"use client";

import { useEffect, useState } from "react";

/**
 * Nilai awal pencarian dari query string (`?cari=...`).
 *
 * Halaman POS diekspor statis, jadi `useSearchParams` butuh Suspense boundary
 * saat prerender. Membaca `window.location.search` setelah mount accomplishes
 * the same thing without that constraint.
 */
export function useCariAwal(): [string, (value: string) => void] {
  const [cari, setCari] = useState("");

  useEffect(() => {
    const dariUrl = new URLSearchParams(window.location.search).get("cari");
    if (dariUrl) setCari(dariUrl);
  }, []);

  return [cari, setCari];
}
