"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Printer, RefreshCw } from "lucide-react";
import { FormField } from "@/components/form-field";
import { buildTestEscPos } from "@/lib/printer/escpos";
import { cetakMentah, daftarPrinter, printerNativeTersedia, type PrinterInfo } from "@/lib/printer/printer";
import { usePrinter } from "@/lib/store/printer";
import { useToko } from "@/lib/store/toko";
import { cn } from "@/lib/utils";

export function PrinterSettings() {
  const pengaturan = usePrinter();
  const [native, setNative] = useState(false);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menguji, setMenguji] = useState(false);

  useEffect(() => {
    setNative(printerNativeTersedia());
  }, []);

  async function muatDaftar() {
    if (!printerNativeTersedia()) {
      setNative(false);
      return;
    }
    setMemuat(true);
    setError(null);
    try {
      const hasil = await daftarPrinter();
      setPrinters(hasil);
      if (!usePrinter.getState().namaPrinter) {
        const bawaan = hasil.find((p) => p.isDefault) ?? hasil[0];
        if (bawaan) usePrinter.getState().simpan({ namaPrinter: bawaan.name });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setMemuat(false);
    }
  }

  useEffect(() => {
    if (native) void muatDaftar();
  }, [native]);

  async function ujiCetak() {
    setError(null);
    setPesan(null);
    if (!pengaturan.namaPrinter) {
      setError("Pilih printer terlebih dahulu.");
      return;
    }
    setMenguji(true);
    try {
      await cetakMentah(pengaturan.namaPrinter, buildTestEscPos(useToko.getState().profil, pengaturan.lebarKertas));
      setPesan("Halaman tes dikirim ke printer.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setMenguji(false);
    }
  }

  return (
    <div className="panel p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Printer className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-black text-brand">Printer Thermal</h2>
          <p className="mt-1 text-sm text-muted">
            Cetak struk langsung ke printer ESC/POS tanpa dialog browser. Hanya tersedia di aplikasi desktop
            POS-Sinaptex; di browser, cetak tetap memakai dialog print.
          </p>
        </div>
      </div>

      {!native && (
        <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
          Aplikasi berjalan di browser. Jalankan lewat POS-Sinaptex.exe agar daftar printer dan cetak langsung
          bisa dipakai.
        </p>
      )}

      <label className="mt-5 flex items-start gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={pengaturan.aktif}
          onChange={(e) => pengaturan.simpan({ aktif: e.target.checked })}
        />
        <span>
          Gunakan printer ESC/POS
          <span className="mt-0.5 block text-xs text-muted">
            Bila gagal atau tidak tersedia, struk otomatis dicetak lewat dialog browser.
          </span>
        </span>
      </label>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Printer" hint={native ? "Daftar printer dari Windows." : "Aktif hanya di aplikasi desktop."}>
          <div className="flex gap-2">
            <select
              className="input"
              value={pengaturan.namaPrinter}
              onChange={(e) => pengaturan.simpan({ namaPrinter: e.target.value })}
              disabled={!native || memuat}
            >
              <option value="">{memuat ? "Memuat printer..." : "Pilih printer"}</option>
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}{p.isDefault ? " (default)" : ""}
                </option>
              ))}
              {pengaturan.namaPrinter && !printers.some((p) => p.name === pengaturan.namaPrinter) && (
                <option value={pengaturan.namaPrinter}>{pengaturan.namaPrinter} (tersimpan)</option>
              )}
            </select>
            <button
              type="button"
              onClick={() => void muatDaftar()}
              disabled={!native || memuat}
              aria-label="Muat ulang daftar printer"
              className="btn-secondary px-3 disabled:opacity-40"
            >
              <RefreshCw className={cn("size-4", memuat && "animate-spin")} aria-hidden />
            </button>
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Lebar kertas">
            <select
              className="input"
              value={pengaturan.lebarKertas}
              onChange={(e) => pengaturan.simpan({ lebarKertas: Number(e.target.value) === 80 ? 80 : 58 })}
            >
              <option value={58}>58 mm (32 kolom)</option>
              <option value={80}>80 mm (48 kolom)</option>
            </select>
          </FormField>
          <FormField label="Salinan">
            <select
              className="input"
              value={pengaturan.salinan}
              onChange={(e) => pengaturan.simpan({ salinan: Number(e.target.value) === 2 ? 2 : 1 })}
            >
              <option value={1}>1 lembar</option>
              <option value={2}>2 lembar</option>
            </select>
          </FormField>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 text-sm text-ink sm:grid-cols-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pengaturan.autoPrint}
            onChange={(e) => pengaturan.simpan({ autoPrint: e.target.checked })}
          />
          Cetak otomatis setelah bayar
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pengaturan.potongKertas}
            onChange={(e) => pengaturan.simpan({ potongKertas: e.target.checked })}
          />
          Potong kertas
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pengaturan.bukaLaci}
            onChange={(e) => pengaturan.simpan({ bukaLaci: e.target.checked })}
          />
          Buka laci kas
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void ujiCetak()}
          disabled={!native || menguji}
          className="btn-primary disabled:opacity-40"
        >
          <Printer className="size-4" aria-hidden /> {menguji ? "Mengirim..." : "Cetak Halaman Tes"}
        </button>
        <button
          type="button"
          onClick={() => {
            pengaturan.reset();
            setPesan(null);
            setError(null);
          }}
          className="btn-secondary"
        >
          Kembalikan Default
        </button>
        {pesan && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="size-4" aria-hidden /> {pesan}
          </span>
        )}
      </div>

      {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
