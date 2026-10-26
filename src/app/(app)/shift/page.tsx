"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, DoorOpen, LogIn, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FormField } from "@/components/form-field";
import { StatusBadge } from "@/components/status-badge";
import { KpiCard } from "@/components/kpi-card";
import { MoneyDisplay } from "@/components/money-display";
import { useActiveShift, useShiftMutations, useShiftRiwayat } from "@/hooks/queries";
import type { ShiftMutasiInput } from "@/lib/api/types";

export default function ShiftPage() {
  const shift = useActiveShift();
  const riwayat = useShiftRiwayat();
  const { buka, mutasiKas, tutup } = useShiftMutations();

  return (
    <div>
      <PageHeader
        title="Shift Kasir"
        description="Buka shift dengan saldo awal, catat kas masuk/keluar, lalu tutup shift dan tinjau selisih."
      />

      {shift.isLoading ? (
        <p className="py-12 text-center text-sm text-muted">Memuat...</p>
      ) : shift.data ? (
        <PanelShiftAktif shift={shift.data} mutasiKas={mutasiKas} tutup={tutup} />
      ) : (
        <PanelBukaShift buka={buka} />
      )}

      {riwayat.data && riwayat.data.length > 0 && (
        <div className="panel mt-6 p-5">
          <h2 className="text-sm font-bold text-brand">Riwayat shift</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-2 py-2.5">ID</th>
                <th className="px-2 py-2.5">Kasir</th>
                <th className="px-2 py-2.5 text-right">Saldo sistem</th>
                <th className="px-2 py-2.5 text-right">Uang fisik</th>
                <th className="px-2 py-2.5 text-right">Selisih</th>
                <th className="px-2 py-2.5">Status selisih</th>
              </tr>
            </thead>
            <tbody>
              {riwayat.data.map((r) => (
                <tr key={r.id} className="border-b border-line/60 last:border-0">
                  <td className="px-2 py-2.5 font-medium">{r.id}</td>
                  <td className="px-2 py-2.5">{r.kasir}</td>
                  <td className="px-2 py-2.5 text-right"><MoneyDisplay value={r.kasTunaiSistem} /></td>
                  <td className="px-2 py-2.5 text-right"><MoneyDisplay value={r.uangFisik} /></td>
                  <td className="px-2 py-2.5 text-right"><MoneyDisplay value={r.selisih} /></td>
                  <td className="px-2 py-2.5">
                    <StatusBadge
                      label={r.selisih === 0 ? "Pas" : r.selisih > 0 ? "Lebih" : "Kurang"}
                      tone={r.selisih === 0 ? "success" : "warning"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PanelBukaShift({
  buka,
}: {
  buka: ReturnType<typeof useShiftMutations>["buka"];
}) {
  const [kasir, setKasir] = useState("");
  const [saldoAwal, setSaldoAwal] = useState(200000);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="panel mx-auto max-w-md p-7">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <DoorOpen className="size-6" aria-hidden />
      </span>
      <h2 className="mt-3 text-center font-black text-brand">Buka Shift</h2>
      <p className="text-center text-xs text-muted">Kasir perlu shift aktif sebelum bisa transaksi.</p>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!kasir.trim()) return setError("Nama kasir wajib diisi.");
          buka.mutate(
            { kasir, saldoAwal },
            { onError: (err) => setError(String(err)) },
          );
        }}
      >
        <FormField label="Nama kasir" error={error}>
          <input className="input" value={kasir} onChange={(e) => setKasir(e.target.value)} placeholder="cth. Andi" autoFocus />
        </FormField>
        <FormField label="Saldo awal kas (Rp)">
          <input
            type="number" min={0} className="input text-right tabular-nums"
            value={saldoAwal || ""} onChange={(e) => setSaldoAwal(Number(e.target.value))}
          />
        </FormField>
        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={buka.isPending}>
          <LogIn className="size-4" aria-hidden />
          {buka.isPending ? "Membuka..." : "Buka Shift"}
        </button>
      </form>
    </div>
  );
}

function PanelShiftAktif({
  shift,
  mutasiKas,
  tutup,
}: {
  shift: NonNullable<ReturnType<typeof useActiveShift>["data"]>;
  mutasiKas: ReturnType<typeof useShiftMutations>["mutasiKas"];
  tutup: ReturnType<typeof useShiftMutations>["tutup"];
}) {
  const [formMutasi, setFormMutasi] = useState<ShiftMutasiInput>({ jenis: "masuk", nominal: 0 });
  const [errorMutasi, setErrorMutasi] = useState<string | null>(null);

  const cekBuka = tutup.isPending || mutasiKas.isPending;

  function kirimMutasi(e: React.FormEvent) {
    e.preventDefault();
    setErrorMutasi(null);
    if (formMutasi.nominal <= 0) return setErrorMutasi("Nominal harus > 0.");
    mutasiKas.mutate(formMutasi, { onError: (err) => setErrorMutasi(String(err)) });
    setFormMutasi({ jenis: formMutasi.jenis, nominal: 0 });
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Saldo awal" value={<MoneyDisplay value={shift.saldoAwal} />} tone="navy" icon={<DoorOpen className="size-4" aria-hidden />} />
        <KpiCard label="Penjualan tunai" value={<MoneyDisplay value={shift.penjualanTunai} />} tone="emerald" icon={<ArrowUpCircle className="size-4" aria-hidden />} />
        <KpiCard
          label="Kas tunai (sistem)"
          value={<MoneyDisplay value={shift.kasTunaiSistem} />}
          hint={shift.kasMasuk > 0 ? `Kas masuk ${shift.kasMasuk}` : undefined}
          tone="violet"
          icon={<ShieldCheck className="size-4" aria-hidden />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-sm font-bold text-brand">Kas masuk / keluar</h2>
          <p className="text-xs text-muted">cth. pemasukkan modal tambahan atau pengeluaran belanja operasional.</p>
          <form onSubmit={kirimMutasi} className="mt-4 flex items-end gap-2">
            <FormField label="Jenis" className="w-32">
              <select
                className="input"
                value={formMutasi.jenis}
                onChange={(e) => setFormMutasi((v) => ({ ...v, jenis: e.target.value as "masuk" | "keluar" }))}
              >
                <option value="masuk">Kas masuk</option>
                <option value="keluar">Kas keluar</option>
              </select>
            </FormField>
            <FormField label="Nominal (Rp)" className="flex-1">
              <input
                type="number" min={0} className="input text-right tabular-nums"
                value={formMutasi.nominal || ""}
                onChange={(e) => setFormMutasi((v) => ({ ...v, nominal: Number(e.target.value) }))}
              />
            </FormField>
            <button type="submit" className="btn-primary py-2.5" disabled={cekBuka}>
              {formMutasi.jenis === "masuk" ? <ArrowDownCircle className="size-4" aria-hidden /> : <ArrowUpCircle className="size-4" aria-hidden />}
              Catat
            </button>
          </form>
          {errorMutasi && <p className="mt-2 text-xs font-medium text-rose-600">{errorMutasi}</p>}

          <dl className="mt-4 space-y-1.5 border-t border-dashed border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Kas masuk</dt><dd><MoneyDisplay value={shift.kasMasuk} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">Kas keluar</dt><dd><MoneyDisplay value={shift.kasKeluar} /></dd></div>
          </dl>
        </div>

        <TutupShiftPanel tutup={tutup} kasTunaiSistem={shift.kasTunaiSistem} />
      </div>
    </div>
  );
}

function TutupShiftPanel({
  tutup,
  kasTunaiSistem,
}: {
  tutup: ReturnType<typeof useShiftMutations>["tutup"];
  kasTunaiSistem: number;
}) {
  const [uangFisik, setUangFisik] = useState<number>(0);

  const selisih = uangFisik - kasTunaiSistem;

  return (
    <div className="panel p-5">
      <h2 className="text-sm font-bold text-brand">Tutup shift</h2>
      <p className="text-xs text-muted">Hitung uang tunai di laci, bandingkan dengan saldo sistem, tinjau selisih.</p>
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          tutup.mutate(uangFisik);
        }}
      >
        <FormField
          label={`Uang fisik di laci (Rp) — sistem: ${new Intl.NumberFormat("id-ID").format(kasTunaiSistem)}`}
        >
          <input
            type="number" min={0} className="input text-right text-base font-bold tabular-nums"
            value={uangFisik || ""} onChange={(e) => setUangFisik(Number(e.target.value))} placeholder="0"
          />
        </FormField>
        <ul className="mt-2 text-sm">
          <li className="flex justify-between">
            <span className="text-muted">Selisih</span>
            <span className={selisih === 0 ? "font-bold text-emerald-600" : "font-bold text-amber-600"}>
              <MoneyDisplay value={selisih} />
            </span>
          </li>
        </ul>
        {selisih !== 0 && uangFisik > 0 && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Selisih tidak nol — sesuai blueprint, ini muncul sebagai peringatan dan menunggu kebijakan persetujuan (audit trail).
          </p>
        )}
        <button type="submit" disabled={tutup.isPending || uangFisik <= 0} className="btn-primary mt-4 w-full disabled:opacity-40">
          {tutup.isPending ? "Menutup..." : "Tutup Shift"}
        </button>
      </form>
    </div>
  );
}
