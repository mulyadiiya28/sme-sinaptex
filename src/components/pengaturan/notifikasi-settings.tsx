"use client";

import { useState } from "react";
import { CheckCircle2, Send, Save } from "lucide-react";
import { FormField } from "@/components/form-field";
import { useNotifikasi, type NotifikasiConfig } from "@/lib/store/notifikasi";
import { kirimTelegram } from "@/lib/notifikasi/telegram";

export function NotifikasiSettings() {
  const { config, simpan } = useNotifikasi();
  const [draft, setDraft] = useState<NotifikasiConfig>(config);
  const [hasil, setHasil] = useState<{ ok: boolean; pesan: string } | null>(null);
  const [menguji, setMenguji] = useState(false);

  function ubah(patch: Partial<NotifikasiConfig>) {
    setDraft({ ...draft, ...patch });
    setHasil(null);
  }

  async function tes() {
    setMenguji(true);
    setHasil(null);
    const r = await kirimTelegram(draft.telegramBotToken, draft.telegramChatId, "Tes notifikasi POS-Sinaptex: koneksi berhasil.");
    setHasil(r);
    setMenguji(false);
  }

  return (
    <div className="panel p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Send className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-black text-brand">Notifikasi (Telegram)</h2>
          <p className="mt-1 text-sm text-muted">
            Konfigurasi disimpan lokal di perangkat ini. Telegram bot token dari @BotFather, chat ID dari @userinfobot.
          </p>
        </div>
      </div>

      <label className="mt-5 flex items-start gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={draft.aktif}
          onChange={(e) => ubah({ aktif: e.target.checked })}
        />
        <span>Aktifkan notifikasi</span>
      </label>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Provider">
          <select className="input" value={draft.provider} onChange={(e) => ubah({ provider: e.target.value as NotifikasiConfig["provider"] })}>
            <option value="telegram">Telegram</option>
            <option value="wa">WhatsApp (manual)</option>
          </select>
        </FormField>
        {draft.provider === "telegram" && (
          <>
            <FormField label="Telegram Bot Token">
              <input className="input" value={draft.telegramBotToken} onChange={(e) => ubah({ telegramBotToken: e.target.value })} placeholder="123456:ABC..." />
            </FormField>
            <FormField label="Telegram Chat ID">
              <input className="input" value={draft.telegramChatId} onChange={(e) => ubah({ telegramChatId: e.target.value })} placeholder="123456789" />
            </FormField>
          </>
        )}
        {draft.provider === "wa" && (
          <FormField label="Nomor WA (manual)">
            <input className="input" value={draft.waNomor} onChange={(e) => ubah({ waNomor: e.target.value })} placeholder="628..." />
          </FormField>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="button" onClick={() => simpan(draft)} className="btn-primary inline-flex items-center gap-1.5">
          <Save className="size-4" aria-hidden /> Simpan
        </button>
        <button type="button" onClick={tes} disabled={menguji} className="btn-secondary inline-flex items-center gap-1.5">
          <Send className="size-4" aria-hidden /> {menguji ? "Menguji..." : "Tes Kirim"}
        </button>
        {hasil && (
          <span className={"text-sm " + (hasil.ok ? "text-emerald-600" : "text-rose-600")}>
            {hasil.ok && <CheckCircle2 className="mr-1 inline size-4" aria-hidden />}
            {hasil.pesan}
          </span>
        )}
      </div>
    </div>
  );
}
