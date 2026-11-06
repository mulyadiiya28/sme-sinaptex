export function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Tanggal kalender lokal (YYYY-MM-DD). `toISOString()` berbasis UTC, jadi
 * transaksi pukul 00.00–06.59 WIB akan terbaca sebagai hari sebelumnya. */
export function tanggalLokal(nilai: string | Date = new Date()): string {
  const d = typeof nilai === "string" ? new Date(nilai) : nilai;
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Menulis nilai indikator kesehatan dengan satuan yang sama seperti engine:
 * "723,50×", "Rp 2.890.000,00", "-1,87%", "40,56 hari".
 */
export function formatNilaiIndikator(nilai: number, satuan: string): string {
  const satuanLower = satuan.toLowerCase();
  if (satuanLower.includes("rp")) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(nilai);
  }
  if (satuanLower.includes("%")) {
    return `${nilai.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }
  if (satuanLower.includes("×") || satuanLower.includes("x")) {
    return `${nilai.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`;
  }
  if (satuanLower.includes("hari")) {
    return `${nilai.toLocaleString("id-ID", { maximumFractionDigits: 2 })} hari`;
  }
  return nilai.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}
