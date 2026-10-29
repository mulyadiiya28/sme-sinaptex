import { cn } from "@/lib/utils";

const GRID_KOLOM: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
};

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-slate-200/80", className)} />;
}

export function KpiSkeleton({
  kolom = 4,
  className,
}: {
  kolom?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4", GRID_KOLOM[kolom] ?? GRID_KOLOM[4], className)} role="status" aria-label="Memuat ringkasan">
      {Array.from({ length: kolom }).map((_, i) => (
        <div key={i} className="panel p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-9 rounded-xl" />
          </div>
          <Skeleton className="mt-3 h-7 w-36" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  kolom = 5,
  baris = 6,
  className,
}: {
  kolom?: number;
  baris?: number;
  className?: string;
}) {
  return (
    <div className={cn("px-4 pb-2", className)} role="status" aria-label="Memuat data">
      <div className="flex gap-4 border-b border-line py-3">
        {Array.from({ length: kolom }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: baris }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-line/60 py-3.5 last:border-0">
          {Array.from({ length: kolom }).map((_, c) => (
            <Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "max-w-[42%]")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({
  baris = 4,
  className,
}: {
  baris?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Memuat daftar">
      {Array.from({ length: baris }).map((_, i) => (
        <div key={i} className="panel p-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-2 h-3 w-64" />
        </div>
      ))}
    </div>
  );
}
