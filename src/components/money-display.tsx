import { cn } from "@/lib/utils";
import { formatIDR } from "@/lib/format";

export function MoneyDisplay({ value, className }: { value: number; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatIDR(value)}</span>;
}
