"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { buatTagihan, statusTagihan, type TagihanGateway } from "@/lib/gateway/client";
import { useGateway } from "@/lib/store/gateway";

const STATUS_LABEL: Record<TagihanGateway["status"], string> = {
  pending: "Menunggu pembayaran",
  paid: "Pembayaran diterima",
  failed: "Pembayaran gagal",
  expired: "Kedaluwarsa",
  unknown: "Status belum diketahui",
};

const STATUS_TONE: Record<TagihanGateway["status"], StatusTone> = {
  pending: "warning",
  paid: "success",
  failed: "danger",
  expired: "danger",
  unknown: "neutral",
};

const MAKS_BAYAR_DETIK = 15 * 60;

export function GatewayPanel({
  nominal,
  pelanggan,
  onTerbayar,
  onBatal,
  onManual,
}: {
  nominal: number;
  pelanggan?: { nama?: string; telepon?: string };
  onTerbayar: (chargeId: string) => void;
  onBatal: () => void;
  onManual: () => void;
}) {
  const config = useGateway((s) => s.config);
  const [tagihan, setTagihan] = useState<TagihanGateway | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [sisaDetik, setSisaDetik] = useState(MAKS_BAYAR_DETIK);
  const dibayar = useRef(false);
  const orderId = useRef(
    `POS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSisaDetik((nilai) => Math.max(0, nilai - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const kedaluwarsa = sisaDetik === 0;

  async function buatTagihanBaru() {
    setMemuat(true);
    setError(null);
    setTagihan(null);
    setQrDataUrl(null);
    setSisaDetik(MAKS_BAYAR_DETIK);
    dibayar.current = false;
    try {
      const t = await buatTagihan(config, {
        orderId: orderId.current,
        amount: nominal,
        description: `Pembayaran POS ${orderId.current}`,
        customer: pelanggan ? { name: pelanggan.nama, phone: pelanggan.telepon } : undefined,
      });
      setTagihan(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setMemuat(false);
    }
  }

  useEffect(() => {
    void buatTagihanBaru();
  }, []);

  useEffect(() => {
    const qr = tagihan?.qrString;
    if (!qr) return;
    let batal = false;
    void (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(qr, { width: 320, margin: 1, errorCorrectionLevel: "M" });
        if (!batal) setQrDataUrl(url);
      } catch {
        if (!batal) setQrDataUrl(null);
      }
    })();
    return () => {
      batal = true;
    };
  }, [tagihan?.qrString]);

  async function cekStatus(manual: boolean) {
    if (!tagihan) return;
    if (manual) setMemuat(true);
    try {
      const t = await statusTagihan(config, tagihan.id);
      setTagihan((prev) => ({
        ...(prev ?? t),
        ...t,
        qrString: t.qrString ?? prev?.qrString,
        qrUrl: t.qrUrl ?? prev?.qrUrl,
      }));
      if (t.status === "paid" && !dibayar.current) {
        dibayar.current = true;
        onTerbayar(t.id);
      }
    } catch (err) {
      if (manual) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (manual) setMemuat(false);
    }
  }

  useEffect(() => {
    if (!tagihan || tagihan.status !== "pending" || kedaluwarsa) return;
    const timer = window.setInterval(() => {
      void cekStatus(false);
    }, Math.max(2, config.intervalPolling) * 1000);
    return () => window.clearInterval(timer);
  }, [tagihan?.id, tagihan?.status, config.intervalPolling, kedaluwarsa]);

  const qrTampil = tagihan?.qrUrl ?? qrDataUrl;
  const status = tagihan?.status ?? "unknown";
  const statusTampil = kedaluwarsa && status === "pending" ? "expired" : status;
  const menit = Math.floor(sisaDetik / 60);
  const detik = sisaDetik % 60;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="panel max-h-[90vh] w-full max-w-md overflow-y-auto p-6">
        <h3 className="font-black text-brand">Bayar via Gateway</h3>
        <p className="mt-1 text-xs text-muted">
          Tunjukkan QR ke pelanggan, lalu tunggu status pembayaran dari gateway.
        </p>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-brand/5 px-3.5 py-2.5 text-sm">
          <span className="text-muted">Tagihan</span>
          <MoneyDisplay value={nominal} className="text-lg font-black text-brand" />
        </div>
        <p className="mt-1.5 text-xs text-muted">Order ID: {orderId.current}</p>

        <div className="mt-4 flex justify-center">
          {memuat && !tagihan ? (
            <div className="flex h-64 w-64 items-center justify-center rounded-2xl border border-dashed border-line bg-slate-50">
              <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
            </div>
          ) : qrTampil ? (
            <img
              src={qrTampil}
              alt="QR pembayaran gateway"
              className="size-64 rounded-2xl border border-line bg-white object-contain p-2"
            />
          ) : (
            <div className="flex h-64 w-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-slate-50 px-4 text-center">
              <AlertTriangle className="size-6 text-amber-500" aria-hidden />
              <p className="text-xs text-muted">
                Gateway tidak mengirim QR. Minta pelanggan membuka tautan pembayaran atau catat manual.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <StatusBadge label={STATUS_LABEL[statusTampil]} tone={STATUS_TONE[statusTampil]} />
          {tagihan?.statusAsli && status !== "unknown" && (
            <span className="text-xs text-muted">({tagihan.statusAsli})</span>
          )}
          {status === "pending" && !kedaluwarsa && (
            <span className="text-xs text-muted tabular-nums">
              sisa {menit}:{String(detik).padStart(2, "0")}
            </span>
          )}
        </div>

        {kedaluwarsa && status === "pending" && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Waktu pembayaran habis (15 menit). Buat tagihan baru agar pelanggan dapat memindai QR yang masih
            berlaku.
          </p>
        )}

        {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

        {status === "paid" && (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Dana diterima gateway. Transaksi sedang dicatat — dana tetap ditahan di akun penampung sampai
            pemilik mengonfirmasi di menu Riwayat.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void cekStatus(true)}
            disabled={!tagihan || status === "paid" || memuat}
            className="btn-secondary disabled:opacity-40"
          >
            <RefreshCw className="size-4" aria-hidden /> Cek Status
          </button>
          {(status === "failed" || status === "expired" || kedaluwarsa) && (
            <button type="button" onClick={() => void buatTagihanBaru()} className="btn-primary">
              <CheckCircle2 className="size-4" aria-hidden /> Tagihan Baru
            </button>
          )}
          <button
            type="button"
            onClick={onManual}
            disabled={status === "paid"}
            className="btn-secondary disabled:opacity-40"
          >
            Catat Manual
          </button>
          <button
            type="button"
            onClick={onBatal}
            disabled={status === "paid"}
            className="btn-secondary ml-auto disabled:opacity-40"
          >
            Batal
          </button>
        </div>
        {status === "paid" && (
          <p className="mt-2 text-xs text-muted">
            Batal tidak tersedia karena dana sudah masuk. Lanjutkan pencatatan transaksi.
          </p>
        )}
      </div>
    </div>
  );
}
