import { TrendingUp } from "lucide-react";
import type { TitikPenjualan } from "@/lib/dashboard";
import { formatIDR, formatRingkasIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Grafik garis omzet harian. Digambar sebagai SVG biasa supaya tidak menambah
 * pustaka grafik hanya untuk satu layar.
 */
export function SalesTrendChart({ data, className }: { data: TitikPenjualan[]; className?: string }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  const jumlahTransaksi = data.reduce((s, d) => s + d.transaksi, 0);
  const kosong = data.length === 0 || data.every((d) => d.total === 0);

  return (
    <section className={cn("panel p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-brand">
            <TrendingUp className="size-4" aria-hidden />
            Tren penjualan
          </h2>
          <p className="mt-1 text-xs text-muted">Omzet harian pada periode terpilih.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-brand tabular-nums">{formatIDR(total)}</p>
          <p className="text-xs text-muted">{jumlahTransaksi} transaksi</p>
        </div>
      </div>

      {kosong ? (
        <div className="mt-4 grid h-52 place-items-center rounded-2xl border border-dashed border-line text-center">
          <p className="max-w-xs text-sm text-muted">
            Belum ada penjualan pada periode ini. Grafik akan terisi setelah kasir mencatat transaksi.
          </p>
        </div>
      ) : (
        <SalesTrendSvg data={data} />
      )}
    </section>
  );
}

function SalesTrendSvg({ data }: { data: TitikPenjualan[] }) {
  const lebar = 720;
  const tinggi = 220;
  const pad = { atas: 16, kanan: 16, bawah: 28, kiri: 64 };
  const areaLebar = lebar - pad.kiri - pad.kanan;
  const areaTinggi = tinggi - pad.atas - pad.bawah;
  const maks = Math.max(1, ...data.map((d) => d.total));

  const x = (i: number) =>
    pad.kiri + (data.length <= 1 ? areaLebar / 2 : (i / (data.length - 1)) * areaLebar);
  const y = (nilai: number) => pad.atas + areaTinggi - (nilai / maks) * areaTinggi;

  const garis = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.total).toFixed(1)}`)
    .join(" ");
  const bidang = `${garis} L${x(data.length - 1).toFixed(1)},${(pad.atas + areaTinggi).toFixed(1)} L${x(0).toFixed(1)},${(pad.atas + areaTinggi).toFixed(1)} Z`;

  const langkahLabel = Math.max(1, Math.ceil(data.length / 6));
  const kisi = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${lebar} ${tinggi}`}
      className="mt-4 h-auto w-full"
      role="img"
      aria-label="Grafik tren penjualan harian"
    >
      <defs>
        <linearGradient id="tren-penjualan-isi" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b2f6e" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0b2f6e" stopOpacity="0" />
        </linearGradient>
      </defs>

      {kisi.map((bagian) => {
        const nilai = maks * bagian;
        const posisi = y(nilai);
        return (
          <g key={bagian}>
            <line
              x1={pad.kiri}
              x2={lebar - pad.kanan}
              y1={posisi}
              y2={posisi}
              stroke="#e2e8f0"
              strokeDasharray={bagian === 0 ? undefined : "4 4"}
            />
            <text x={pad.kiri - 8} y={posisi + 4} textAnchor="end" fontSize="10" fill="#64748b">
              {formatRingkasIDR(nilai)}
            </text>
          </g>
        );
      })}

      <path d={bidang} fill="url(#tren-penjualan-isi)" />
      <path d={garis} fill="none" stroke="#0b2f6e" strokeWidth="2.5" strokeLinejoin="round" />

      {data.map((d, i) => (
        <circle key={d.tanggal} cx={x(i)} cy={y(d.total)} r="7" fill="transparent">
          <title>{`${d.label}: ${formatIDR(d.total)} · ${d.transaksi} transaksi`}</title>
        </circle>
      ))}

      {data.map((d, i) =>
        i % langkahLabel === 0 || i === data.length - 1 ? (
          <text
            key={`label-${d.tanggal}`}
            x={x(i)}
            y={tinggi - 8}
            textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
            fontSize="10"
            fill="#64748b"
          >
            {d.label}
          </text>
        ) : null,
      )}

      <circle
        cx={x(data.length - 1)}
        cy={y(data[data.length - 1].total)}
        r="4"
        fill="#f97316"
        stroke="#ffffff"
        strokeWidth="2"
      />
    </svg>
  );
}
