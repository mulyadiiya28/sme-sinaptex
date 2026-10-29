import { Skeleton } from "@/components/skeleton";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T extends object>({
  columns,
  rows,
  rowKey,
  empty = "Tidak ada data.",
  loading = false,
  skeletonRows = 6,
  className,
}: {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey?: (row: T) => string;
  empty?: string;
  loading?: boolean;
  skeletonRows?: number;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, r) => (
              <tr key={`skeleton-${r}`} className="border-b border-line/60 last:border-0">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3.5",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                    )}
                  >
                    <Skeleton
                      className={cn(
                        "h-4",
                        col.align === "right" && "ml-auto w-20",
                        col.align === "center" && "mx-auto w-12",
                        !col.align && "w-full max-w-[70%]",
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={rowKey ? rowKey(row) : String(i)} className="border-b border-line/60 last:border-0 hover:bg-slate-50/60">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3",
                      col.align === "right" && "text-right tabular-nums",
                      col.align === "center" && "text-center",
                      col.className,
                    )}
                  >
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
