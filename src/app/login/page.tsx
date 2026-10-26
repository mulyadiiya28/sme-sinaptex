"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck } from "lucide-react";
import type { Role } from "@/lib/api/types";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import { FormField } from "@/components/form-field";

export default function LoginPage() {
  const setSession = useAuth((s) => s.setSession);
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function masuk(un: string, pw: string) {
    setError(null);
    setPending(true);
    try {
      const sesi = await api.auth.login(un, pw);
      setSession(sesi);
      router.replace(sesi.user.role === "kasir" ? "/kasir" : "/");
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand p-12 text-white lg:flex">
        <div>
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-black">S</span>
          <h1 className="mt-8 text-4xl font-black leading-tight">
            SINAPTEX
            <span className="block text-lg font-semibold text-white/60">Smart Retail &amp; Accounting</span>
          </h1>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-white/70">
            Kasir, persediaan, keuangan, dan akuntansi otomatis dalam satu aplikasi operasional toko.
            Transaksi hari ini membentuk jurnal dan laporan tanpa perlu memahami debit-kredit.
          </p>
        </div>
        <ul className="space-y-2.5 text-sm text-white/70">
          {["Kasir dibuka per shift dengan selisih yang diaudit", "Pembayaran tunai, transfer, QRIS, dan campuran", "Jurnal & laba-rugi terbentuk otomatis dari transaksi"].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 shrink-0" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-center bg-canvas p-6">
        <div className="panel w-full max-w-sm p-8">
          <h2 className="text-xl font-black text-brand">Masuk</h2>
          <p className="mt-1 text-sm text-muted">Gunakan akun yang diberikan pemilik toko.</p>
          <form
            className="mt-6 space-y-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!username || !password) return setError("Username dan password wajib diisi.");
              masuk(username, password);
            }}
          >
            <FormField label="Username">
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="cth. pemilik" autoFocus />
            </FormField>
            <FormField label="Password">
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </FormField>
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
            <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-40">
              <LogIn className="size-4" aria-hidden />
              {pending ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-brand/5 p-4 text-xs text-muted">
            <p className="font-bold text-brand">Akun demo (mock)</p>
            <div className="mt-2 grid grid-cols-1 gap-1.5">
              {(
                [
                  ["pemilik", "pemilik123", "Pemilik — akses penuh"],
                  ["kasir", "kasir123", "Kasir — transaksi & shift"],
                ] as Array<[string, string, Role | string]>
              ).map(([u, p, ket]) => (
                <button
                  key={u}
                  type="button"
                  disabled={pending}
                  onClick={() => masuk(u, p)}
                  className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2 text-left transition-colors hover:border-brand"
                >
                  <span>
                    <span className="font-semibold text-ink">{u} / {p}</span>
                    <span className="block text-[11px]">{ket}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-brand">Isi &amp; masuk</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
