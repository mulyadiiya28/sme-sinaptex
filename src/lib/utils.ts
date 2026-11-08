export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Membentuk kode master dari nama (mis. "Pasar Baru" -> "PASAR-BARU").
 * Kode yang sudah terpakai diberi akhiran angka agar tetap unik.
 */
export function kodeDariNama(nama: string, terpakai: Iterable<string>, cadangan = "PEMASOK"): string {
  const dasar =
    nama
      .normalize("NFKD")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || cadangan;
  const dipakai = new Set(Array.from(terpakai, (kode) => kode.toUpperCase()));
  let kode = dasar;
  let urutan = 2;
  while (dipakai.has(kode)) kode = `${dasar}-${urutan++}`;
  return kode;
}
