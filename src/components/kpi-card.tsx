import { cn } from "@/lib/utils";

export type KpiTone = "navy" | "violet" | "emerald" | "rose";

const TONES: Record<KpiTone, { icon: string; value: string }> = {
  navy: { icon: "bg-brand/10 text-brand", value: "text-brand" },
  violet: { icon: "bg-[#7C3AED]/10 text-[#7C3AED]", value: "text-[#7C3AED]" },
  emerald: { icon: "bg-[#059669]/10 text-[#059669]", value: "text-[#059669]" },
  rose: { icon: "bg-[#E11D48]/10 text-[#E11D48]", value: "text-[#E11D48]" },
};

export function KpiCard({
  label,
  value,
  hint,
  tone = "navy",
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: KpiTone;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon ? (
          <span className={cn("flex size-9 items-center justify-center rounded-xl", TONES[tone].icon)}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className={cn("mt-3 text-2xl font-bold tabular-nums", TONES[tone].value)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
