"use client";

import { useState } from "react";
import { CheckCircle2, Mail, Save } from "lucide-react";
import { FormField } from "@/components/form-field";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { EmailSettings } from "@/lib/api/types";

export function EmailSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["email-settings"], queryFn: () => api.pengaturan.email() });
  const [draft, setDraft] = useState<EmailSettings | null>(null);
  const data = draft ?? q.data ?? {
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    fromEmail: "",
    fromName: "",
    isEnabled: false,
  };

  const mut = useMutation({
    mutationFn: (input: EmailSettings) => api.pengaturan.simpanEmail(input),
    onSuccess: (res) => {
      qc.setQueryData(["email-settings"], res);
      setDraft(null);
    },
  });

  function ubah(patch: Partial<EmailSettings>) {
    setDraft({ ...data, ...patch });
  }

  return (
    <div className="panel p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Mail className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-black text-brand">Email (SMTP)</h2>
          <p className="mt-1 text-sm text-muted">
            Konfigurasi SMTP disimpan di server engine per toko. Dipakai untuk kirim laporan dan notifikasi.
          </p>
        </div>
      </div>

      <label className="mt-5 flex items-start gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={data.isEnabled}
          onChange={(e) => ubah({ isEnabled: e.target.checked })}
        />
        <span>Aktifkan pengiriman email</span>
      </label>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="SMTP Host">
          <input className="input" value={data.smtpHost} onChange={(e) => ubah({ smtpHost: e.target.value })} placeholder="smtp.gmail.com" />
        </FormField>
        <FormField label="SMTP Port">
          <input type="number" className="input" value={data.smtpPort} onChange={(e) => ubah({ smtpPort: Number(e.target.value) })} />
        </FormField>
        <FormField label="Username">
          <input className="input" value={data.smtpUsername} onChange={(e) => ubah({ smtpUsername: e.target.value })} />
        </FormField>
        <FormField label="Password">
          <input type="password" className="input" value={data.smtpPassword} onChange={(e) => ubah({ smtpPassword: e.target.value })} />
        </FormField>
        <FormField label="Email Pengirim">
          <input className="input" value={data.fromEmail} onChange={(e) => ubah({ fromEmail: e.target.value })} placeholder="toko@contoh.com" />
        </FormField>
        <FormField label="Nama Pengirim">
          <input className="input" value={data.fromName} onChange={(e) => ubah({ fromName: e.target.value })} placeholder="Toko Saya" />
        </FormField>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => mut.mutate(data)}
          disabled={mut.isPending}
          className="btn-primary inline-flex items-center gap-1.5"
        >
          <Save className="size-4" aria-hidden /> {mut.isPending ? "Menyimpan..." : "Simpan"}
        </button>
        {mut.isSuccess && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle2 className="size-4" aria-hidden /> Tersimpan
          </span>
        )}
        {mut.isError && (
          <span className="text-sm text-rose-600">{String(mut.error)}</span>
        )}
      </div>
    </div>
  );
}
