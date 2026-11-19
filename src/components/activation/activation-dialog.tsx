"use client";

import { useState } from "react";
import { labelLisensi, normalisasiKey, validasiFormatKey } from "@/lib/license";
import { sidikMesin } from "@/lib/license-device";
import { useAktivasi } from "@/lib/store/aktivasi";

export function ActivationDialog({ onDone, bolehLewati = false }: { onDone: () => void; bolehLewati?: boolean }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function aktifkan() {
    const normal = normalisasiKey(key);
    const hasil = validasiFormatKey(normal);
    if (!hasil.ok) {
      setError(hasil.alasan);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const mesinId = await sidikMesin();
      const ada = bacaKeyTerpakai(normal);
      if (ada && ada !== mesinId) {
        setError("Key ini sudah dipakai di perangkat lain.");
        return;
      }
      catatKeyTerpakai(normal, mesinId);
      useAktivasi.getState().simpanAktivasi({
        key: normal,
        jenis: hasil.jenis,
        berakhirPada: hasil.berakhirPada,
        mesinId,
        diaktifkanPada: new Date().toISOString(),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membaca identitas perangkat.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4">
      <form
        className="panel w-full max-w-md p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void aktifkan();
        }}
      >
        <h2 className="text-lg font-black text-brand">Aktivasi Aplikasi</h2>
        <p className="mt-1 text-sm text-muted">
          Masukkan key dari penerbit. Key mengikat perangkat ini dan tidak bisa dipakai di komputer lain.
        </p>
        <label className="label mt-4" htmlFor="key-aktivasi">
          Key aktivasi
        </label>
        <input
          id="key-aktivasi"
          className="input text-center font-mono tracking-widest uppercase"
          value={key}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          placeholder="SNTX-XXXXX-XXXXX-XXXXX"
          onChange={(e) => {
            setKey(normalisasiKey(e.target.value));
            setError(null);
          }}
        />
        {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        <button type="submit" className="btn-primary mt-4 w-full disabled:opacity-40" disabled={pending || key.length < 10}>
          {pending ? "Memeriksa perangkat..." : "Aktifkan"}
        </button>
        {bolehLewati && (
          <button
            type="button"
            className="btn-secondary mt-2 w-full"
            onClick={() => {
              useAktivasi.getState().tandaiPengecualian("demo");
              onDone();
            }}
          >
            Lewati — mode demo
          </button>
        )}
        <p className="mt-3 text-center text-xs text-muted">
          Lisensi yang dikenali: {labelLisensi("starter")}, {labelLisensi("professional")}, {labelLisensi("enterprise")}.
        </p>
      </form>
    </div>
  );
}

const KUNCI_TERPAKAI = "pos-sinaptex-key-terpakai";

function bacaKeyTerpakai(key: string): string | null {
  try {
    const semua = JSON.parse(localStorage.getItem(KUNCI_TERPAKAI) ?? "{}") as Record<string, string>;
    return semua[key] ?? null;
  } catch {
    return null;
  }
}

function catatKeyTerpakai(key: string, mesinId: string) {
  const semua = JSON.parse(localStorage.getItem(KUNCI_TERPAKAI) ?? "{}") as Record<string, string>;
  semua[key] = mesinId;
  localStorage.setItem(KUNCI_TERPAKAI, JSON.stringify(semua));
}
