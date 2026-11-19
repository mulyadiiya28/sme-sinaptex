"use client";

import { useEffect, useState } from "react";
import { labelLisensi } from "@/lib/license";
import { useAktivasi } from "@/lib/store/aktivasi";

export function LisensiSettings() {
  const [siap, setSiap] = useState(false);
  const aktivasi = useAktivasi((s) => s.aktivasi);
  const pengecualian = useAktivasi((s) => s.pengecualian);

  useEffect(() => setSiap(true), []);

  return (
    <div className="panel max-w-xl p-6">
      <h2 className="text-sm font-bold text-brand">Lisensi perangkat</h2>
      <p className="mt-1 text-sm text-muted">
        Key aktivasi mengikat komputer ini. Penerbit yang menerbitkan key baru bila pindah perangkat.
      </p>
      {!siap ? null : aktivasi ? (
        <dl className="mt-4 space-y-2 text-sm">
          <Baris label="Jenis" nilai={labelLisensi(aktivasi.jenis)} />
          <Baris label="Key" nilai={samarkanKey(aktivasi.key)} />
          <Baris
            label="Berlaku sampai"
            nilai={aktivasi.berakhirPada ? new Date(aktivasi.berakhirPada).toLocaleDateString("id-ID") : "Tanpa batas"}
          />
          <Baris
            label="Diaktifkan"
            nilai={new Date(aktivasi.diaktifkanPada).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          />
          <Baris label="Perangkat" nilai={aktivasi.mesinId} mono />
        </dl>
      ) : (
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {pengecualian === "demo"
            ? "Perangkat ini berjalan dalam mode demo (key dilewati)."
            : "Perangkat ini belum diaktivasi dengan key. Instalasi yang sudah berjalan tidak dikunci."}
        </p>
      )}
    </div>
  );
}

function Baris({ label, nilai, mono }: { label: string; nilai: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/70 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : "font-semibold"}>{nilai}</dd>
    </div>
  );
}

function samarkanKey(key: string): string {
  const bagian = key.split("-");
  if (bagian.length < 2) return key;
  return `${bagian[0]}-····-····-${bagian[bagian.length - 1]}`;
}
