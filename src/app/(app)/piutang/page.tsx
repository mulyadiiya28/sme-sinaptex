"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, CheckCheck, Copy, MessageCircle, RotateCcw, Save, Settings2 } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { FormField } from "@/components/form-field";
import { KpiCard } from "@/components/kpi-card";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { KpiSkeleton, TableSkeleton } from "@/components/skeleton";
import { useArAging, usePelanggan, useRiwayatTransaksi } from "@/hooks/queries";
import type { AgedInvoice } from "@/lib/api/types";
import { formatIDR, tanggalLokal } from "@/lib/format";
import {
  LABEL_TAHAP,
  TONE_TAHAP,
  jatuhTempoEfektif,
  labelSelisih,
  perluReminder,
  selisihHariJatuhTempo,
  susunPesan,
  tahapReminder,
  tautanWhatsApp,
} from "@/lib/reminder";
import { TEMPLATE_DEFAULT, useReminder, type ReminderLog, type TahapReminder, type TemplateReminder } from "@/lib/store/reminder";
import { useToko } from "@/lib/store/toko";

type Baris = {
  inv: AgedInvoice;
  nama: string;
  telepon: string;
  selisih: number;
  tahap: TahapReminder | null;
  terakhir?: ReminderLog;
};

type Tampilan = "perlu" | "semua" | "riwayat";

export default function ReminderPiutangPage() {
  const hari = tanggalLokal();
  const aging = useArAging();
  const pelanggan = usePelanggan();
  const riwayat = useRiwayatTransaksi();
  const profil = useToko((s) => s.profil);
  const template = useReminder((s) => s.template);
  const log = useReminder((s) => s.log);
  const catat = useReminder((s) => s.catat);
  const simpanTemplate = useReminder((s) => s.simpanTemplate);
  const hapusLog = useReminder((s) => s.hapusLog);
  const [tampilan, setTampilan] = useState<Tampilan>("perlu");
  const [editorBuka, setEditorBuka] = useState(false);
  const [draft, setDraft] = useState<TemplateReminder | null>(null);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    setSiap(true);
  }, []);

  const baris = useMemo<Baris[]>(() => {
    const byId = new Map((pelanggan.data ?? []).map((p) => [p.id, p]));
    const byNama = new Map((pelanggan.data ?? []).map((p) => [p.nama.toLowerCase(), p]));
    const byNomor = new Map((riwayat.data ?? []).map((t) => [t.nomor, t]));

    return (aging.data?.invoices ?? []).map((inv) => {
      let nama = "Pelanggan umum";
      let telepon = "";
      if (inv.counterpartyId) {
        const p = byId.get(inv.counterpartyId);
        if (p) {
          nama = p.nama;
          telepon = p.telepon;
        }
      }
      if (nama === "Pelanggan umum" && inv.invoiceNumber) {
        const namaTransaksi = byNomor.get(inv.invoiceNumber)?.pelanggan;
        if (namaTransaksi) {
          nama = namaTransaksi;
          telepon = byNama.get(namaTransaksi.toLowerCase())?.telepon ?? "";
        }
      }
      return {
        inv,
        nama,
        telepon,
        selisih: selisihHariJatuhTempo(inv, hari),
        tahap: tahapReminder(inv, hari),
        terakhir: log.find((l) => l.invoiceId === inv.invoiceId),
      };
    });
  }, [aging.data, pelanggan.data, riwayat.data, hari, log]);

  const perlu = useMemo(
    () => perluReminder(aging.data?.invoices ?? [], log, hari),
    [aging.data, log, hari],
  );
  const perluIds = new Set(perlu.map((p) => p.inv.invoiceId));
  const barisPerlu = baris.filter((b) => perluIds.has(b.inv.invoiceId));
  const barisTampil = tampilan === "perlu" ? barisPerlu : baris;
  const jatuhTempoHariIni = baris.filter((b) => b.selisih === 0);
  const terlambat = baris.filter((b) => b.selisih < 0);

  function kirimWhatsApp(b: Baris, tahap: TahapReminder) {
    const pesan = susunPesan(template[tahap], {
      nama: b.nama,
      nomor: b.inv.invoiceNumber ?? b.inv.invoiceId.slice(0, 8),
      nominal: formatIDR(b.inv.outstandingAmount),
      jatuhTempo: new Date(jatuhTempoEfektif(b.inv)).toLocaleDateString("id-ID"),
      toko: profil.nama,
    });
    const url = tautanWhatsApp(b.telepon, pesan);
    if (!url) {
      alert("Nomor telepon pelanggan belum diisi. Lengkapi master pelanggan atau salin pesan lalu kirim manual.");
      return;
    }
    catat(entriLog(b, tahap, pesan));
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function salinPesan(b: Baris, tahap: TahapReminder) {
    const pesan = susunPesan(template[tahap], {
      nama: b.nama,
      nomor: b.inv.invoiceNumber ?? b.inv.invoiceId.slice(0, 8),
      nominal: formatIDR(b.inv.outstandingAmount),
      jatuhTempo: new Date(jatuhTempoEfektif(b.inv)).toLocaleDateString("id-ID"),
      toko: profil.nama,
    });
    try {
      await navigator.clipboard.writeText(pesan);
    } catch {
      alert(pesan);
    }
  }

  function tandaiTerkirim(b: Baris, tahap: TahapReminder) {
    const pesan = susunPesan(template[tahap], {
      nama: b.nama,
      nomor: b.inv.invoiceNumber ?? b.inv.invoiceId.slice(0, 8),
      nominal: formatIDR(b.inv.outstandingAmount),
      jatuhTempo: new Date(jatuhTempoEfektif(b.inv)).toLocaleDateString("id-ID"),
      toko: profil.nama,
    });
    catat(entriLog(b, tahap, pesan));
  }

  function entriLog(b: Baris, tahap: TahapReminder, pesan: string): ReminderLog {
    return {
      id: crypto.randomUUID(),
      invoiceId: b.inv.invoiceId,
      invoiceNumber: b.inv.invoiceNumber,
      pelangganNama: b.nama,
      telepon: b.telepon,
      nominal: b.inv.outstandingAmount,
      tahap,
      pesan,
      dikirimPada: new Date().toISOString(),
    };
  }

  const kolomPiutang: Column<Baris>[] = [
    {
      key: "faktur",
      header: "Faktur",
      render: (r) => (
        <div>
          <p className="font-medium">{r.inv.invoiceNumber ?? r.inv.invoiceId.slice(0, 8)}</p>
          <p className="text-xs text-muted">{r.nama}</p>
        </div>
      ),
    },
    {
      key: "telepon",
      header: "Telepon",
      render: (r) => <span className="text-xs text-muted">{r.telepon || "—"}</span>,
    },
    {
      key: "jatuhTempo",
      header: "Jatuh Tempo",
      render: (r) => (
        <div>
          <p className="text-xs font-medium">{new Date(jatuhTempoEfektif(r.inv)).toLocaleDateString("id-ID")}</p>
          <p className={r.selisih < 0 ? "text-xs text-rose-600" : "text-xs text-muted"}>{labelSelisih(r.selisih)}</p>
        </div>
      ),
    },
    {
      key: "sisa",
      header: "Sisa",
      align: "right",
      render: (r) => <MoneyDisplay value={r.inv.outstandingAmount} className="font-bold text-brand" />,
    },
    {
      key: "tahap",
      header: "Tahap",
      align: "center",
      render: (r) =>
        r.tahap ? <StatusBadge label={LABEL_TAHAP[r.tahap]} tone={TONE_TAHAP[r.tahap]} /> : <span className="text-xs text-muted">—</span>,
    },
    {
      key: "terakhir",
      header: "Terakhir Diingatkan",
      render: (r) => (
        <span className="text-xs text-muted">
          {r.terakhir ? new Date(r.terakhir.dikirimPada).toLocaleDateString("id-ID") : "Belum"}
        </span>
      ),
    },
    {
      key: "aksi",
      header: "Aksi",
      align: "center",
      render: (r) => {
        const tahap = r.tahap;
        if (!tahap) return <span className="text-xs text-muted">—</span>;
        return (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => kirimWhatsApp(r, tahap)}
              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
              aria-label={`Kirim WhatsApp ke ${r.nama}`}
              title="Kirim WhatsApp"
            >
              <MessageCircle className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => void salinPesan(r, tahap)}
              className="rounded-lg p-1.5 text-brand hover:bg-brand/5"
              aria-label={`Salin pesan untuk ${r.nama}`}
              title="Salin pesan"
            >
              <Copy className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => tandaiTerkirim(r, tahap)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label={`Tandai reminder terkirim untuk ${r.nama}`}
              title="Tandai sudah diingatkan"
            >
              <CheckCheck className="size-4" aria-hidden />
            </button>
          </div>
        );
      },
    },
  ];

  const kolomRiwayat: Column<ReminderLog>[] = [
    {
      key: "waktu",
      header: "Waktu",
      render: (r) => <span className="text-xs">{new Date(r.dikirimPada).toLocaleString("id-ID")}</span>,
    },
    { key: "pelanggan", header: "Pelanggan", render: (r) => <span className="font-medium">{r.pelangganNama}</span> },
    { key: "faktur", header: "Faktur", render: (r) => <span className="text-xs">{r.invoiceNumber ?? r.invoiceId.slice(0, 8)}</span> },
    {
      key: "tahap",
      header: "Tahap",
      align: "center",
      render: (r) => <StatusBadge label={LABEL_TAHAP[r.tahap]} tone={TONE_TAHAP[r.tahap]} />,
    },
    { key: "nominal", header: "Sisa", align: "right", render: (r) => <MoneyDisplay value={r.nominal} /> },
    { key: "telepon", header: "Telepon", render: (r) => <span className="text-xs text-muted">{r.telepon || "—"}</span> },
  ];

  const nilaiTemplate = draft ?? template;

  if (!siap) {
    return (
      <div>
        <PageHeader
          title="Reminder Piutang"
          description="Pantau faktur yang jatuh tempo dan kirim pengingat ke pelanggan lewat WhatsApp atau pesan manual."
        />
        <KpiSkeleton kolom={4} />
        <div className="mt-4">
          <TableSkeleton kolom={7} baris={6} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reminder Piutang"
        description="Pantau faktur yang jatuh tempo dan kirim pengingat ke pelanggan lewat WhatsApp atau pesan manual."
        actions={
          <Link href="/laporan" className="btn-secondary">
            Lihat Umur Piutang
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTampilan("perlu")}
          className={tampilan === "perlu" ? "btn-primary" : "btn-secondary"}
        >
          <BellRing className="size-4" aria-hidden /> Perlu Diingatkan ({perlu.length})
        </button>
        <button
          type="button"
          onClick={() => setTampilan("semua")}
          className={tampilan === "semua" ? "btn-primary" : "btn-secondary"}
        >
          Semua Piutang ({baris.length})
        </button>
        <button
          type="button"
          onClick={() => setTampilan("riwayat")}
          className={tampilan === "riwayat" ? "btn-primary" : "btn-secondary"}
        >
          Riwayat ({log.length})
        </button>
        <button
          type="button"
          onClick={() => setEditorBuka((v) => !v)}
          className="btn-secondary ml-auto"
        >
          <Settings2 className="size-4" aria-hidden /> Template Pesan
        </button>
      </div>

      {editorBuka && (
        <div className="panel mb-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-brand">Template Reminder</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setDraft(TEMPLATE_DEFAULT)} className="btn-secondary">
                <RotateCcw className="size-4" aria-hidden /> Pulihkan default
              </button>
              <button
                type="button"
                onClick={() => {
                  simpanTemplate(nilaiTemplate);
                  setDraft(null);
                }}
                className="btn-primary"
              >
                <Save className="size-4" aria-hidden /> Simpan
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">
            Placeholder: <code>{"{nama}"}</code>, <code>{"{nomor}"}</code>, <code>{"{nominal}"}</code>,{" "}
            <code>{"{jatuhTempo}"}</code>, <code>{"{toko}"}</code>.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
            {(["jatuhTempo", "h1", "h3", "h7"] as TahapReminder[]).map((tahap) => (
              <FormField key={tahap} label={`Pesan ${LABEL_TAHAP[tahap]}`}>
                <textarea
                  value={nilaiTemplate[tahap]}
                  onChange={(e) => setDraft({ ...nilaiTemplate, [tahap]: e.target.value })}
                  rows={3}
                  className="input w-full"
                />
              </FormField>
            ))}
          </div>
        </div>
      )}

      {tampilan !== "riwayat" && (
        <>
          {aging.isLoading ? (
            <KpiSkeleton kolom={4} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Perlu diingatkan"
                value={perlu.length}
                hint="Jatuh tempo, H-1, H+3, atau H+7 yang belum dikirim"
                tone={perlu.length > 0 ? "rose" : "emerald"}
                icon={<BellRing className="size-4" aria-hidden />}
              />
              <KpiCard
                label="Jatuh tempo hari ini"
                value={jatuhTempoHariIni.length}
                hint={formatIDR(jatuhTempoHariIni.reduce((s, b) => s + b.inv.outstandingAmount, 0))}
                tone="violet"
              />
              <KpiCard
                label="Terlambat"
                value={terlambat.length}
                hint={formatIDR(terlambat.reduce((s, b) => s + b.inv.outstandingAmount, 0))}
                tone="rose"
              />
              <KpiCard
                label="Total piutang"
                value={<MoneyDisplay value={aging.data?.outstandingTotal ?? 0} />}
                hint={`${baris.length} faktur terbuka`}
                tone="navy"
              />
            </div>
          )}

          <div className="mt-4 panel p-4">
            <h2 className="mb-3 px-1 text-sm font-bold text-brand">
              {tampilan === "perlu" ? "Faktur yang Perlu Diingatkan" : "Semua Faktur Piutang"}
            </h2>
            {aging.isLoading ? (
              <TableSkeleton kolom={7} baris={6} />
            ) : (
              <DataTable
                columns={kolomPiutang}
                rows={barisTampil}
                rowKey={(r) => r.inv.invoiceId}
                empty={
                  tampilan === "perlu"
                    ? "Tidak ada faktur yang perlu diingatkan hari ini."
                    : "Belum ada piutang terbuka."
                }
              />
            )}
          </div>
        </>
      )}

      {tampilan === "riwayat" && (
        <div className="panel p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="px-1 text-sm font-bold text-brand">Riwayat Reminder</h2>
            {log.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Hapus seluruh riwayat reminder? Tindakan ini tidak bisa dibatalkan.")) hapusLog();
                }}
                className="btn-secondary"
              >
                Hapus Riwayat
              </button>
            )}
          </div>
          <DataTable
            columns={kolomRiwayat}
            rows={log}
            rowKey={(r) => r.id}
            empty="Belum ada reminder yang dikirim."
          />
        </div>
      )}
    </div>
  );
}
