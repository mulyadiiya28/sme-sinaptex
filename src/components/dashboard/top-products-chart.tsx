import { Package } from "lucide-react";
import { MoneyDisplay } from "@/components/money-display";
import { Skeleton } from "@/components/skeleton";
import type { ProductPerformance } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Produk penyumbang omzet terbesar pada periode terpilih. */
export function TopProductsChart({
  products,
  loading,
  error,
  className,
}: {
  products: ProductPerformance[];
  loading?: boolean;
  error?: boolean;
  className?: string;
}) {
  const teratas = products.slice(0, 6);
  const maks = Math.max(1, ...teratas.map((p) => p.totalRevenue));

  return (
    <section className={cn("panel p-5", className)}>
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold text-brand">
          <Package className="size-4" aria-hidden />
          Produk teratas
        </h2>
        <p className="mt-1 text-xs text-muted">
          Penyumbang omzet terbesar pada periode terpilih, dihitung dari penjualan yang sudah diposting.
        </p>
      </div>

      {loading ? (
        <div className="mt-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-4 grid h-40 place-items-center rounded-2xl border border-dashed border-line text-center">
          <p className="max-w-sm text-sm text-rose-600">
            Gagal memuat performa produk dari engine.
          </p>
        </div>
      ) : teratas.length === 0 ? (
        <div className="mt-4 grid h-40 place-items-center rounded-2xl border border-dashed border-line text-center">
          <p className="max-w-sm text-sm text-muted">
            Belum ada produk terjual pada periode ini.
          </p>
        </div>
      ) : (
        <ol className="mt-4 space-y-4">
          {teratas.map((p, i) => (
            <li key={p.productId}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold text-ink">
                  <span className="mr-2 text-xs font-bold text-muted">{i + 1}</span>
                  {p.productName}
                </p>
                <MoneyDisplay value={p.totalRevenue} className="shrink-0 text-sm font-bold text-brand" />
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.max(4, (p.totalRevenue / maks) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">
                {p.totalQuantitySold.toLocaleString("id-ID", { maximumFractionDigits: 2 })} unit ·
                margin {p.marginPercentage.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
