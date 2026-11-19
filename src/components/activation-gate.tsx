"use client";

import { useEffect, useState } from "react";
import { ActivationDialog } from "@/components/activation/activation-dialog";
import { SplashScreen } from "@/components/splash-screen";
import { TermsDialog } from "@/components/legal/terms-dialog";
import { API_MODE } from "@/lib/api/client";
import { sidikMesin } from "@/lib/license-device";
import { validasiFormatKey } from "@/lib/license";
import { useAktivasi } from "@/lib/store/aktivasi";

type Langkah = "muat" | "syarat" | "aktivasi" | "siap";

const TUNDA_SPLASH_MS = 700;

export function ActivationGate({ children }: { children: React.ReactNode }) {
  const [langkah, setLangkah] = useState<Langkah>("muat");
  const [hidrasi, setHidrasi] = useState(false);

  useEffect(() => {
    const lepas = useAktivasi.persist.onFinishHydration(() => setHidrasi(true));
    if (useAktivasi.persist.hasHydrated()) setHidrasi(true);
    return () => {
      lepas();
    };
  }, []);

  useEffect(() => {
    if (!hidrasi) return;
    let batal = false;
    const mulai = performance.now();
    void (async () => {
      const state = useAktivasi.getState();
      if (!state.pengecualian && !state.aktivasi && instalasiSudahJalan()) {
        state.tandaiPengecualian("instalasi-lama");
      }
      const aktivasi = useAktivasi.getState().aktivasi;
      if (aktivasi) {
        const cek = validasiFormatKey(aktivasi.key);
        const mesin = await sidikMesin().catch(() => aktivasi.mesinId);
        if (!cek.ok || mesin !== aktivasi.mesinId) useAktivasi.getState().cabutAktivasi();
      }
      const sisa = Math.max(0, TUNDA_SPLASH_MS - (performance.now() - mulai));
      await new Promise((selesai) => window.setTimeout(selesai, sisa));
      if (batal) return;
      const sekarang = useAktivasi.getState();
      if (sekarang.aktivasi || sekarang.pengecualian) setLangkah("siap");
      else if (!sekarang.syaratDisetujuiPada) setLangkah("syarat");
      else setLangkah("aktivasi");
    })();
    return () => {
      batal = true;
    };
  }, [hidrasi]);

  if (langkah === "muat") return <SplashScreen />;
  if (langkah === "syarat") {
    return (
      <TermsDialog
        onAccept={() => {
          useAktivasi.getState().setujuiSyarat();
          setLangkah("aktivasi");
        }}
      />
    );
  }
  if (langkah === "aktivasi") {
    return <ActivationDialog bolehLewati={API_MODE !== "live"} onDone={() => setLangkah("siap")} />;
  }
  return <>{children}</>;
}

function instalasiSudahJalan(): boolean {
  try {
    const mentah = localStorage.getItem("pos-sinaptex-auth");
    if (!mentah) return false;
    const data = JSON.parse(mentah) as { state?: { user?: unknown } };
    return Boolean(data.state?.user);
  } catch {
    return false;
  }
}
