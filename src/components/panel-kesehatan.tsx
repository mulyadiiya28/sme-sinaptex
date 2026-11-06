"use client";

import { Activity, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/skeleton";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { useRingkasanKesehatan } from "@/hooks/queries";
import type { HealthIndicator } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const TONE_RATING: Record<string, StatusTone> = {
  BAIK: "success",
  CUKUP: "info",
  "KURANG SEHAT": "warning",
  "TIDAK BERLAKU": "neutral",
};

const LABEL_RATING: Record<string, string> = {
  BAIK: "Baik",
  CUKUP: "Cukup",
  "KURANG SEHAT": "Kurang sehat",
  "TIDAK BERLAKU": "Tidak berlaku",
};

function toneVerdict(verdict: string): StatusTone {
  if (verdict.includes("TINDAKAN")) return "danger";
  if (verdict.includes("PERHATIAN")) return "warning";
  if (verdict.includes("CUKUP")) return "info";
  return "success";
}

export function PanelKesehatan({ className }: { className?: string }) {
  const kesehatan = useRingkasanKesehatan();

  return (
    <section className={cn("panel p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-brand">
            <Activity className="size-4" aria-hidden />
            Kesehatan usaha
          </h2>
          <p className="mt-1 text-xs text-muted">
            Rasio lancar, kas, dan modal kerja — dihitung dari jurnal yang sama dengan neraca saldo.
          </p>
        </div>
        {kesehatan.data && (
          <StatusBadge label={kesehatan.data.overallVerdict} tone={toneVerdict(kesehatan.data.overallVerdict)} />
        )}
      </div>

      {kesehatan.isLoading && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-2xl border border-line/70 p-3.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      )}

      {kesehatan.isError && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="text-sm text-amber-900">
            Ringkasan kesehatan tidak bisa dimuat — engine akuntansi mungkin sedang tidak terjangkau.
          </p>
          <button
            type="button"
            onClick={() => void kesehatan.refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
          >
            <RefreshCw className="size-4" aria-hidden />
            Coba lagi
          </button>
        </div>
      )}

      {kesehatan.data && (
        <>
          <p className="mt-3 text-sm text-ink">{kesehatan.data.overallExplanation}</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {kesehatan.data.indicators.map((indikator) => (
              <KartuIndikator key={indikator.name} indikator={indikator} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function KartuIndikator({ indikator }: { indikator: HealthIndicator }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-slate-50/60 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{indikator.name}</p>
        <StatusBadge
          label={LABEL_RATING[indikator.rating] ?? indikator.rating}
          tone={TONE_RATING[indikator.rating] ?? "neutral"}
        />
      </div>
      <p className="mt-1.5 text-lg font-black text-brand tabular-nums">{indikator.displayValue}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{indikator.explanation}</p>
      {indikator.benchmark && (
        <p className="mt-2 border-t border-line/70 pt-2 text-[11px] leading-relaxed text-muted">
          {indikator.benchmark}
        </p>
      )}
    </div>
  );
}
