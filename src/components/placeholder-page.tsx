import Link from "next/link";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export function PlaceholderPage({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="panel flex flex-col items-center gap-3 p-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Construction className="size-6" aria-hidden />
        </span>
        <p className="font-bold text-brand">Masuk antrean pengembangan (Tahap 3)</p>
        <p className="max-w-md text-sm text-muted">Rencana fitur halaman ini sesuai blueprint:</p>
        <ul className="flex flex-wrap justify-center gap-2 text-xs text-muted">
          {features.map((f) => (
            <li key={f} className="rounded-full border border-line bg-slate-50 px-3 py-1.5">
              {f}
            </li>
          ))}
        </ul>
        <Link href="/" className="btn-secondary mt-3">Kembali ke Dashboard</Link>
      </div>
    </div>
  );
}
