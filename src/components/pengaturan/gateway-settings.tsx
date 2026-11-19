"use client";

import { useState } from "react";
import { CheckCircle2, CreditCard, RotateCcw, Save, Wifi } from "lucide-react";
import { FormField } from "@/components/form-field";
import { tesKoneksi, type HasilTes } from "@/lib/gateway/client";
import {
  useGateway,
  type GatewayAuth,
  type GatewayConfig,
  type GatewayProvider,
} from "@/lib/store/gateway";

const BASE_URL: Record<GatewayProvider, { sandbox: string; produksi: string }> = {
  midtrans: { sandbox: "https://api.sandbox.midtrans.com", produksi: "https://api.midtrans.com" },
  xendit: { sandbox: "https://api.sandbox.xendit.co", produksi: "https://api.xendit.co" },
  umum: { sandbox: "", produksi: "" },
};

const AUTH_UMUM: Record<GatewayProvider, GatewayAuth> = {
  midtrans: "basic",
  xendit: "bearer",
  umum: "bearer",
};

export function GatewaySettings() {
  const { config, simpan, reset } = useGateway();
  const [hasilTes, setHasilTes] = useState<HasilTes | null>(null);
  const [menguji, setMenguji] = useState(false);

  function ubah(patch: Partial<GatewayConfig>) {
    simpan({ ...config, ...patch });
    setHasilTes(null);
  }

  function gantiProvider(provider: GatewayProvider) {
    ubah({
      provider,
      auth: AUTH_UMUM[provider],
      baseUrl: BASE_URL[provider][config.mode],
    });
  }

  function gantiMode(mode: GatewayConfig["mode"]) {
    ubah({ mode, baseUrl: BASE_URL[config.provider][mode] });
  }

  async function uji() {
    setMenguji(true);
    setHasilTes(null);
    try {
      setHasilTes(await tesKoneksi(config));
    } catch (err) {
      setHasilTes({ ok: false, pesan: err instanceof Error ? err.message : String(err) });
    } finally {
      setMenguji(false);
    }
  }

  return (
    <div className="panel p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <CreditCard className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-black text-brand">Payment Gateway</h2>
          <p className="mt-1 text-sm text-muted">
            Kredensial gateway disimpan lokal di perangkat ini (bukan di server engine) sehingga tiap toko bisa
            memakai akun provider sendiri. Tidak ada nilai bawaan yang terkunci di kode aplikasi.
          </p>
        </div>
      </div>

      <label className="mt-5 flex items-start gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={config.aktif}
          onChange={(e) => ubah({ aktif: e.target.checked })}
        />
        <span>
          Aktifkan pembayaran lewat gateway
          <span className="mt-0.5 block text-xs text-muted">
            Kasir akan melihat tombol “Bayar via Gateway” pada layar pembayaran. QRIS manual tetap tersedia.
          </span>
        </span>
      </label>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Provider">
          <select
            className="input"
            value={config.provider}
            onChange={(e) => gantiProvider(e.target.value as GatewayProvider)}
          >
            <option value="midtrans">Midtrans (QRIS)</option>
            <option value="xendit">Xendit (QRIS)</option>
            <option value="umum">Gateway sendiri (REST)</option>
          </select>
        </FormField>

        <FormField label="Mode">
          <select
            className="input"
            value={config.mode}
            onChange={(e) => gantiMode(e.target.value as GatewayConfig["mode"])}
          >
            <option value="sandbox">Sandbox (uji coba)</option>
            <option value="produksi">Produksi</option>
          </select>
        </FormField>

        <FormField
          label="Base URL"
          hint="Boleh diubah manual bila memakai domain sendiri atau proxy internal."
        >
          <input
            className="input"
            value={config.baseUrl}
            onChange={(e) => ubah({ baseUrl: e.target.value })}
            placeholder="https://api.sandbox.midtrans.com"
          />
        </FormField>

        <FormField
          label={config.provider === "midtrans" ? "Server Key" : "API Key"}
          hint="Disimpan lokal. Midtrans memakai Basic auth (server key), Xendit memakai Bearer token."
        >
          <input
            type="password"
            className="input"
            value={config.apiKey}
            onChange={(e) => ubah({ apiKey: e.target.value })}
            autoComplete="off"
            placeholder="••••••••••••"
          />
        </FormField>

        <FormField label="Merchant ID" hint="Opsional — dikirim sebagai merchant_id saat provider memintanya.">
          <input
            className="input"
            value={config.merchantId}
            onChange={(e) => ubah({ merchantId: e.target.value })}
            placeholder="opsional"
          />
        </FormField>

        <FormField label="Jenis autentikasi">
          <select
            className="input"
            value={config.auth}
            onChange={(e) => ubah({ auth: e.target.value as GatewayAuth })}
          >
            <option value="basic">Basic auth (server key:kolom)</option>
            <option value="bearer">Bearer token</option>
            <option value="x-api-key">Header API key</option>
          </select>
        </FormField>

        {config.auth === "x-api-key" && (
          <FormField label="Nama header API key">
            <input
              className="input"
              value={config.headerName}
              onChange={(e) => ubah({ headerName: e.target.value })}
              placeholder="X-Api-Key"
            />
          </FormField>
        )}

        {config.provider === "umum" && (
          <>
            <FormField label="Path buat tagihan" hint="Dipakai untuk provider REST milik sendiri.">
              <input
                className="input"
                value={config.pathBuat}
                onChange={(e) => ubah({ pathBuat: e.target.value })}
                placeholder="/charges"
              />
            </FormField>
            <FormField label="Path status" hint="Gunakan {id} sebagai penanda id tagihan.">
              <input
                className="input"
                value={config.pathStatus}
                onChange={(e) => ubah({ pathStatus: e.target.value })}
                placeholder="/charges/{id}"
              />
            </FormField>
          </>
        )}

        <FormField
          label="Kode akun kas penampung"
          hint="Kosongkan untuk memakai kode bawaan (1130 / env). Akun engine dibuat otomatis bila belum ada."
        >
          <input
            className="input"
            value={config.kodeAkunGateway}
            onChange={(e) => ubah({ kodeAkunGateway: e.target.value })}
            placeholder="1130"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Interval polling (detik)">
            <input
              type="number"
              min={2}
              max={60}
              className="input"
              value={config.intervalPolling}
              onChange={(e) => ubah({ intervalPolling: Math.max(2, Number(e.target.value) || 5) })}
            />
          </FormField>
          <FormField label="Timeout (detik)">
            <input
              type="number"
              min={5}
              max={120}
              className="input"
              value={config.timeoutDetik}
              onChange={(e) => ubah({ timeoutDetik: Math.max(5, Number(e.target.value) || 30) })}
            />
          </FormField>
        </div>
      </div>

      {config.provider === "umum" && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs text-muted">
          <p className="font-semibold text-ink">Kontrak yang diharapkan (provider REST sendiri)</p>
          <p className="mt-1">
            POST <code>{config.pathBuat || "/charges"}</code> dengan body{" "}
            <code>{"{ orderId, amount, currency, description, customer, merchantId }"}</code>. Respons minimal:{" "}
            <code>{"{ id, status, qrString }"}</code> (atau <code>qr_url</code>/<code>redirect_url</code>). Status
            dibaca dari GET <code>{config.pathStatus || "/charges/{id}"}</code>. Status yang dianggap lunas: paid,
            settlement, settled, capture, success.
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void uji()} disabled={menguji} className="btn-secondary disabled:opacity-40">
          <Wifi className="size-4" aria-hidden /> {menguji ? "Menguji..." : "Test Koneksi"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            setHasilTes(null);
          }}
          className="btn-secondary"
        >
          <RotateCcw className="size-4" aria-hidden /> Kembalikan Default
        </button>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Save className="size-4" aria-hidden /> Perubahan tersimpan otomatis di perangkat ini
        </span>
        {hasilTes && (
          <span
            className={
              "inline-flex items-center gap-1.5 text-xs font-semibold " +
              (hasilTes.ok ? "text-emerald-700" : "text-rose-700")
            }
          >
            <CheckCircle2 className="size-4" aria-hidden /> {hasilTes.pesan}
          </span>
        )}
      </div>

      <p className="mt-4 text-xs text-muted">
        Tidak ada nilai gateway yang terkunci di kode aplikasi: base URL, API key, merchant, mode, polling, dan kode
        akun penampung semuanya dibaca dari form ini. Kosongkan kode akun bila ingin memakai bawaan engine
        (<code>1130</code> atau <code>NEXT_PUBLIC_ENGINE_GATEWAY</code>).
      </p>
    </div>
  );
}
