import type { AkunMaster, AkunSaldo, JurnalEntry } from "@/lib/api/types";

function kodeDari(label: string): string {
  return label.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
}

function tipeAkun(kode: string, master: AkunMaster[]): AkunMaster["tipe"] {
  const ditemukan = master.find((a) => a.kode === kode);
  if (ditemukan) return ditemukan.tipe;
  if (kode.startsWith("1")) return "ASSET";
  if (kode.startsWith("2")) return "LIABILITY";
  if (kode.startsWith("3")) return "EQUITY";
  if (kode.startsWith("4")) return "REVENUE";
  return "EXPENSE";
}

export type RingkasanLabaRugi = {
  pendapatan: number;
  retur: number;
  hpp: number;
  biaya: number;
  pajak: number;
  laba: number;
};

/**
 * Satu-satunya definisi laba untuk seluruh laporan: pendapatan dikurangi HPP
 * dan beban. Pajak (PPN/PPh) adalah kewajiban, bukan beban, jadi tidak
 * mengurangi laba — jurnal penutup pun hanya menutup akun pendapatan/beban.
 */
export function ringkasLabaRugi(akun: AkunSaldo[], master: AkunMaster[] = []): RingkasanLabaRugi {
  const pendapatan = akun
    .filter((a) => tipeAkun(a.kode, master) === "REVENUE")
    .reduce((s, a) => s + (a.kredit - a.debit), 0);
  const hpp = akun
    .filter((a) => a.kode === "5000" || a.kode === "5100")
    .reduce((s, a) => s + (a.debit - a.kredit), 0);
  const biaya = akun
    .filter((a) => tipeAkun(a.kode, master) === "EXPENSE" && a.kode !== "5000" && a.kode !== "5100")
    .reduce((s, a) => s + (a.debit - a.kredit), 0);

  return {
    pendapatan,
    retur: 0,
    hpp,
    biaya,
    pajak: 0,
    laba: pendapatan - hpp - biaya,
  };
}

export type KelompokArusKas = "operasi" | "investasi" | "pendanaan";

export type ArusKasBaris = {
  kelompok: KelompokArusKas;
  akun: string;
  nominal: number;
};

export type ArusKas = {
  operasi: number;
  investasi: number;
  pendanaan: number;
  kenaikanKas: number;
  kasAwal: number;
  kasAkhir: number;
  baris: ArusKasBaris[];
};

export function susunArusKas(
  akun: AkunSaldo[],
  jurnal: JurnalEntry[],
  kodeKas: Set<string>,
  master: AkunMaster[],
): ArusKas {
  const peta = new Map<string, ArusKasBaris>();

  for (const entry of jurnal) {
    const netKas = entry.baris
      .filter((b) => kodeKas.has(kodeDari(b.akun)))
      .reduce((s, b) => s + b.debit - b.kredit, 0);
    if (Math.abs(netKas) < 0.005) continue;

    const lawan = entry.baris.filter((b) => !kodeKas.has(kodeDari(b.akun)));
    let kelompok: KelompokArusKas = "operasi";
    for (const b of lawan) {
      const kode = kodeDari(b.akun);
      const tipe = tipeAkun(kode, master);
      if (kode.startsWith("16")) {
        kelompok = "investasi";
        break;
      }
      if (
        tipe === "EQUITY" ||
        kode.startsWith("25") ||
        kode.startsWith("26") ||
        kode === "1250" ||
        kode === "2450"
      ) {
        kelompok = "pendanaan";
      }
    }

    const label = lawan.length > 0 ? lawan.map((b) => b.akun).join(", ") : "Kas";
    const key = `${kelompok}|${label}`;
    const baris = peta.get(key) ?? { kelompok, akun: label, nominal: 0 };
    baris.nominal += netKas;
    peta.set(key, baris);
  }

  const baris = [...peta.values()].filter((b) => Math.abs(b.nominal) >= 0.005);
  const jumlah = (k: KelompokArusKas) =>
    baris.filter((b) => b.kelompok === k).reduce((s, b) => s + b.nominal, 0);

  const operasi = jumlah("operasi");
  const investasi = jumlah("investasi");
  const pendanaan = jumlah("pendanaan");
  const kasAwal = akun.filter((a) => kodeKas.has(a.kode)).reduce((s, a) => s + a.saldoAwal, 0);
  const kasAkhir = akun.filter((a) => kodeKas.has(a.kode)).reduce((s, a) => s + a.saldoAkhir, 0);

  return {
    operasi,
    investasi,
    pendanaan,
    kenaikanKas: operasi + investasi + pendanaan,
    kasAwal,
    kasAkhir,
    baris,
  };
}

export type EkuitasBaris = {
  akun: string;
  saldoAwal: number;
  debit: number;
  kredit: number;
  saldoAkhir: number;
};

export type PerubahanModal = {
  modalAwal: number;
  labaBerjalan: number;
  labaDitutup: number;
  setoran: number;
  prive: number;
  modalAkhir: number;
  rincian: EkuitasBaris[];
};

function jurnalPenutup(entry: JurnalEntry): boolean {
  return entry.tipe === "CLOSING" || entry.keterangan.startsWith("Penutupan buku");
}

export function susunPerubahanModal(
  akun: AkunSaldo[],
  jurnal: JurnalEntry[],
  master: AkunMaster[],
): PerubahanModal {
  const ekuitas = akun.filter((a) => tipeAkun(a.kode, master) === "EQUITY");
  const modalAwal = ekuitas.reduce((s, a) => s + a.saldoAwal, 0);

  const labaBerjalan = ringkasLabaRugi(akun, master).laba;

  let labaDitutup = 0;
  let setoran = 0;
  let prive = 0;

  for (const entry of jurnal) {
    const penutup = jurnalPenutup(entry);
    for (const b of entry.baris) {
      const kode = kodeDari(b.akun);
      if (tipeAkun(kode, master) !== "EQUITY") continue;
      const net = b.kredit - b.debit;
      if (penutup) labaDitutup += net;
      else if (net >= 0) setoran += net;
      else prive += -net;
    }
  }

  return {
    modalAwal,
    labaBerjalan,
    labaDitutup,
    setoran,
    prive,
    modalAkhir: modalAwal + labaBerjalan + labaDitutup + setoran - prive,
    rincian: ekuitas.map((a) => ({
      akun: a.akun,
      saldoAwal: a.saldoAwal,
      debit: a.debit,
      kredit: a.kredit,
      saldoAkhir: a.saldoAkhir,
    })),
  };
}
