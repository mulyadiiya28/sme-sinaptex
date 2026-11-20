import { CreditCard } from "lucide-react";
import { MoneyDisplay } from "@/components/money-display";
import type { RingkasanMetode } from "@/lib/dashboard";
import { formatRingkasIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

const WARNA: Record<string, string> = {
  tunai: "#059669",
  transfer: "#0b2f6e",
  qris: "#f97316",
};

/** Komposisi uang yang benar-benar diterima per metode bayar. */
export function PaymentBreakdown({
  data,
  piutang,
  className,
}: {
  data: RingkasanMetode[];
  piutang: number;
  className?: string;
}) {
  const total = data.reduce((s, m) => s + m.total, 0);

  return (
    <section className={cn("panel p-5", className)}>
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold text-brand">
          <CreditCard className="size-4" aria-hidden />
          Metode pembayaran
        </h2>
        <p className="mt-1 text-xs text-muted">Uang yang diterima pada periode terpilih.</p>
      </div>

      {total <= 0 ? (
        <div className="mt-4 grid h-52 place-items-center rounded-2xl border border-dashed border-line text-center">
          <p className="max-w-xs text-sm text-muted">
            Belum ada pembayaran tercatat pada periode ini.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
          <Donut data={data} total={total} />
          <ul className="w-full space-y-2.5">
            {data.map((m) => (
              <li key={m.metode} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: WARNA[m.metode] }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{m.label}</p>
                    <p className="text-xs text-muted">
                      {m.jumlah} pembayaran · {m.persen.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
                    </p>
                  </div>
                </div>
                <MoneyDisplay value={m.total} className="shrink-0 text-sm font-bold text-brand" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {piutang > 0 ? (
        <p className="mt-4 border-t border-line/70 pt-3 text-xs text-muted">
          Di luar itu, <MoneyDisplay value={piutang} className="font-semibold text-ink" /> penjualan
          periode ini masih menjadi piutang dan belum masuk komposisi di atas.
        </p>
      ) : null}
    </section>
  );
}

function Donut({ data, total }: { data: RingkasanMetode[]; total: number }) {
  const jariJari = 52;
  const keliling = 2 * Math.PI * jariJari;
  let geser = 0;

  return (
    <svg viewBox="0 0 160 160" className="size-40 shrink-0" role="img" aria-label="Komposisi metode pembayaran">
      <circle cx="80" cy="80" r={jariJari} fill="none" stroke="#e2e8f0" strokeWidth="18" />
      {data.map((m) => {
        const panjang = (m.total / total) * keliling;
        const offset = geser;
        geser += panjang;
        return (
          <circle
            key={m.metode}
            cx="80"
            cy="80"
            r={jariJari}
            fill="none"
            stroke={WARNA[m.metode]}
            strokeWidth="18"
            strokeDasharray={`${panjang} ${Math.max(0, keliling - panjang)}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 80 80)"
          >
            <title>{`${m.label}: ${m.persen.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`}</title>
          </circle>
        );
      })}
      <text x="80" y="76" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0b2f6e">
        {formatRingkasIDR(total)}
      </text>
      <text x="80" y="92" textAnchor="middle" fontSize="9" fill="#64748b">
        diterima
      </text>
    </svg>
  );
}
