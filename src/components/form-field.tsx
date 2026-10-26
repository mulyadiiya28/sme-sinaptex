import { cn } from "@/lib/utils";

export function FormField({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <label className="label">{label}</label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-muted/80">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
