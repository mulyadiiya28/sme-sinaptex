"use client";

import { useEffect, useState } from "react";

const LANGKAH = [
  "Memuat konfigurasi...",
  "Mengecek lisensi perangkat...",
  "Menyiapkan layar kasir...",
];

export function SplashScreen() {
  const [langkah, setLangkah] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLangkah((n) => (n + 1) % LANGKAH.length);
    }, 700);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-brand text-white">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black">
        S
      </span>
      <h1 className="mt-6 text-3xl font-black tracking-tight">POS-Sinaptex</h1>
      <p className="mt-1 text-sm text-white/60">Smart Retail Operations &amp; Accounting</p>
      <div className="mt-10 h-1.5 w-56 overflow-hidden rounded-full bg-white/15">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
      </div>
      <p className="mt-4 text-xs text-white/70">{LANGKAH[langkah]}</p>
      <p className="absolute bottom-6 text-[11px] text-white/40">© 2026 Sinaptex</p>
    </div>
  );
}
