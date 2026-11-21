"use client";

import { useMemo, useRef, useState } from "react";
import { BadgePercent, CheckCircle2, Clock3, Plus, QrCode, ReceiptText, XCircle } from "lucide-react";
import type { CheckoutResult, PaymentMethod, ProfilToko } from "@/lib/api/types";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import { pajakNominal, totalTransaksi, useCart } from "@/lib/store/cart";
import { useNotifikasi } from "@/lib/store/notifikasi";
import { kirimTelegram } from "@/lib/notifikasi/telegram";
import { totalParity } from "@/lib/uang";
import { useToko } from "@/lib/store/toko";
import { usePrinter } from "@/lib/store/printer";
import { useGateway } from "@/lib/store/gateway";
import { GatewayPanel } from "@/components/kasir/gateway-panel";
import { cetakStruk, cetakStrukOtomatis } from "@/lib/struk";
import { useCheckout, useMemberList } from "@/hooks/queries";
import { api } from "@/lib/api/client";
import { formatIDR } from "@/lib/format";
import { API_BASE_URL } from "@/lib/api/live";

const METODE: Array<{ id: PaymentMethod; label: string; digital: boolean }> = [
  { id: "tunai", label: "Tunai", digital: false },
  { id: "transfer", label: "Transfer bank", digital: true },
  { id: "qris", label: "QRIS", digital: true },
];

const STATUS_TONE = {
  lunas: "success",
  menunggu_pembayaran: "warning",
  menunggu_persetujuan: "warning",
  dibayar_sebagian: "warning",
} as const;

const STATUS_LABEL = {
  lunas: "Lunas",
  menunggu_pembayaran: "Menunggu pembayaran",
  menunggu_persetujuan: "Menunggu persetujuan",
  dibayar_sebagian: "Dibayar sebagian (piutang)",
} as const;

function hitungPajakEfektif(profil: ProfilToko): number {
  // Manual override > 0 dipakai dulu
  if (profil.pajakPersen && profil.pajakPersen > 0) return profil.pajakPersen;
  // Kalau tidak, pakai tarif otomatis berdasarkan PKP status
  return profil.pkpStatus === "PKP" ? 11 : 0.5;
}

export function PaymentDialog({
  kasir,
  shiftId,
  onClose,
}: {
  kasir: string;
  shiftId: string;
  onClose: (resetCart: boolean) => void;
}) {
  const cart = useCart();
  const profil = useToko((s) => s.profil);
  const pajakPersen = hitungPajakEfektif(profil);
  const izinkanKredit = useToko((s) => s.kebijakan.izinkanKredit);
  const gateway = useGateway((s) => s.config);
  const [sukses, setSukses] = useState<CheckoutResult | null>(null);
  const [midtransLoading, setMidtransLoading] = useState(false);
  const [midtransError, setMidtransError] = useState("");
  const [gatewayBuka, setGatewayBuka] = useState(false);
  const [nominalGateway, setNominalGateway] = useState(0);
  const [gatewayRef, setGatewayRef] = useState<string | null>(null);
  const [pesanGateway, setPesanGateway] = useState<string | null>(null);
  const [kodeVoucher, setKodeVoucher] = useState("");
  const [validasiPending, setValidasiPending] = useState(false);
  const [pesanVoucher, setPesanVoucher] = useState<string | null>(null);
  const [kodeMember, setKodeMember] = useState("");
  const [poinMember, setPoinMember] = useState(0);
  const [validasiMemberPending, setValidasiMemberPending] = useState(false);
  const [pesanMember, setPesanMember] = useState<string | null>(null);
  const daftarMember = useMemberList(true);
  const kunciIdempotensi = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `chk-${Date.now()}-${Math.random()}`,
  );

  const diskonVoucher = cart.voucher?.diskon ?? 0;
  const diskonLoyalty = cart.member?.diskon ?? 0;
  const pajak = pajakNominal(cart.lines, cart.diskonTransaksi, pajakPersen, diskonVoucher, diskonLoyalty);
  const total = totalTransaksi(cart.lines, cart.diskonTransaksi, pajak, diskonVoucher, diskonLoyalty);
  // Engine mengharga loyalty dari nilai invoice setelah voucher (dan diskon
  // baris), sebelum pajak — basisnya harus sama persis dengan layar kasir.
  const dasarLoyalty = useMemo(
    () => totalParity({ lines: cart.lines, diskonTransaksi: cart.diskonTransaksi, pajak: 0, diskonVoucher }).baseVoucher,
    [cart.lines, cart.diskonTransaksi, diskonVoucher],
  );

  const hitungan = useMemo(() => {
    let belum = total;
    let kembalian = 0;
    const baris = cart.allocations.map((a) => {
      const lebih = a.metode !== "tunai" && a.nominal > belum;
      const pakai = Math.min(a.nominal, belum);
      if (a.metode === "tunai" && a.nominal > belum) {
        kembalian += a.nominal - belum;
      }
      belum -= pakai;
      return { ...a, over: lebih };
    });
    return { baris, kembalian, sisa: Math.max(0, belum) };
  }, [total, cart.allocations]);

  const mutation = useCheckout((result) => {
    setSukses(result);
    const notif = useNotifikasi.getState().config;
    if (notif.aktif && notif.autoKirim && notif.provider === "telegram") {
      void kirimTelegram(
        notif.telegramBotToken,
        notif.telegramChatId,
        `Transaksi ${result.nomor} selesai. Total: ${result.total}. Kembalian: ${result.kembalian}.`,
      );
    }
    const pengaturan = usePrinter.getState();
    if (!pengaturan.aktif || !pengaturan.autoPrint) return;
    if (result.menungguPersetujuan || result.status === "menunggu_pembayaran") return;
    void cetakStrukOtomatis(
      useToko.getState().profil,
      susunStruk(result.nomor, result.total, result.kembalian, result.piutang),
    );
  });

  function susunStruk(nomor: string, total: number, kembalian: number, piutang: number) {
    return {
      nomor,
      waktu: new Date().toISOString(),
      kasir,
      shiftId,
      pelanggan: cart.pelanggan,
      items: cart.lines.map((l) => ({
        nama: l.product.nama,
        qty: l.qty,
        hargaJual: l.product.hargaJual,
        diskon: l.diskon,
      })),
      diskonTransaksi: cart.diskonTransaksi,
      pajak,
      total,
      kembalian,
      piutang,
      pembayaran: cart.allocations,
    };
  }

  // Penjualan kredit penuh (tidak ada satu rupiah pun yang dibayar) sah: sisa
  // seluruhnya menjadi piutang. Yang tidak sah hanya baris pembayaran yang
  // melebihi sisa (khusus digital) dan penjualan sisa yang tidak ditandai
  // sebagai piutang.
  const canConfirm =
    cart.lines.length > 0 &&
    !hitungan.baris.some((b) => b.over) &&
    (hitungan.sisa === 0
      ? cart.allocations.length > 0 && !hitungan.baris.some((b) => b.nominal <= 0)
      : cart.gunakanPiutang);

  function kirimCheckout(referensiGateway?: string) {
    mutation.mutate({
      lines: cart.lines,
      diskonTransaksi: cart.diskonTransaksi,
      pajak,
      allocations: cart.allocations,
      gunakanPiutang: cart.gunakanPiutang,
      pelanggan: cart.pelanggan,
      kasir,
      shiftId,
      idempotensiKunci: kunciIdempotensi.current,
      gatewayRef: referensiGateway,
      voucherCode: cart.voucher?.kode,
      diskonVoucher: diskonVoucher || undefined,
      memberCode: cart.member?.kode,
      poinDipakai: cart.member?.poinDipakai,
      diskonLoyalty: diskonLoyalty || undefined,
    });
  }

  function confirm() {
    kirimCheckout(gatewayRef ?? undefined);
  }

  function sisaTanpaGateway() {
    let belum = total;
    for (const a of cart.allocations) {
      if (a.metode === "qris") continue;
      belum = Math.max(0, belum - Math.min(a.nominal, belum));
    }
    return belum;
  }

  function mulaiGateway() {
    setPesanGateway(null);
    const nominal = sisaTanpaGateway();
    if (nominal <= 0) {
      setPesanGateway("Tidak ada sisa pembayaran yang perlu dibayar lewat gateway.");
      return;
    }
    const index = cart.allocations.findIndex((a) => a.metode === "qris");
    if (index >= 0) cart.updateAllocation(index, nominal);
    else cart.addAllocation("qris", nominal);
    setNominalGateway(nominal);
    setGatewayBuka(true);
  }

  function gatewayTerbayar(chargeId: string) {
    setGatewayBuka(false);
    setGatewayRef(chargeId);
    kirimCheckout(chargeId);
  }

  function gatewayManual() {
    setGatewayBuka(false);
    kirimCheckout(gatewayRef ?? undefined);
  }

  async function pakaiVoucher() {
    const kode = kodeVoucher.trim();
    if (!kode) return;
    setValidasiPending(true);
    setPesanVoucher(null);
    try {
      const hasil = await api.voucher.validate(
        kode,
        totalParity({ lines: cart.lines, diskonTransaksi: cart.diskonTransaksi, pajak: 0 }).base,
      );
      cart.setVoucher({ kode: hasil.kode, diskon: hasil.diskon });
      cart.clearMember();
      setPoinMember(0);
      setPesanMember(null);
      setPesanVoucher(`Voucher ${hasil.kode} dipakai: diskon ${formatIDR(hasil.diskon)}.`);
    } catch (err) {
      cart.clearVoucher();
      setPesanVoucher(err instanceof Error ? err.message : "Voucher tidak valid.");
    } finally {
      setValidasiPending(false);
    }
  }

  function hapusVoucher() {
    cart.clearVoucher();
    cart.clearMember();
    setKodeVoucher("");
    setPesanVoucher(null);
    setPesanMember(null);
  }

  async function pakaiMember() {
    const kode = kodeMember.trim().toUpperCase();
    if (!kode) return;
    setValidasiMemberPending(true);
    setPesanMember(null);
    try {
      const hasil = await api.member.harga(kode, poinMember, dasarLoyalty);
      const nama = daftarMember.data?.find((m) => m.kode === hasil.kode)?.nama ?? hasil.kode;
      cart.setMember({ ...hasil, nama });
      setPoinMember(hasil.poinDipakai);
      setPesanMember(
        `Member ${hasil.kode}: diskon ${formatIDR(hasil.diskon)}, ${hasil.poinDipakai} poin ditukar, ${hasil.poinDapat} poin diperoleh.`,
      );
    } catch (err) {
      cart.clearMember();
      setPesanMember(err instanceof Error ? err.message : "Member tidak valid.");
    } finally {
      setValidasiMemberPending(false);
    }
  }

  function hapusMember() {
    cart.clearMember();
    setKodeMember("");
    setPoinMember(0);
    setPesanMember(null);
  }

  if (sukses) {
    const toko = useToko.getState().profil;
    const dataStruk = susunStruk(sukses.nomor, sukses.total, sukses.kembalian, sukses.piutang);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
        <div className="panel w-full max-w-sm p-8 text-center">
          <span
            className={
              "mx-auto flex size-14 items-center justify-center rounded-2xl " +
              (sukses.menungguPersetujuan
                ? "bg-amber-50 text-amber-600"
                : "bg-emerald-50 text-emerald-600")
            }
          >
            {sukses.menungguPersetujuan ? (
              <Clock3 className="size-7" aria-hidden />
            ) : (
              <CheckCircle2 className="size-7" aria-hidden />
            )}
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted">
            {sukses.menungguPersetujuan ? "Menunggu persetujuan" : "Transaksi tercatat"}
          </p>
          <p className="text-2xl font-black text-brand">{sukses.nomor}</p>
          <div className="mt-2 flex justify-center">
            <StatusBadge label={STATUS_LABEL[sukses.status]} tone={STATUS_TONE[sukses.status]} />
          </div>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Total</dt>
              <dd className="font-semibold"><MoneyDisplay value={sukses.total} /></dd>
            </div>
            {sukses.kembalian > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Kembalian</dt>
                <dd className="font-bold text-emerald-600"><MoneyDisplay value={sukses.kembalian} /></dd>
              </div>
            )}
            {sukses.piutang > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Piutang pelanggan</dt>
                <dd className="font-bold text-amber-600"><MoneyDisplay value={sukses.piutang} /></dd>
              </div>
            )}
            {cart.member && !sukses.menungguPersetujuan && (
              <div className="flex justify-between">
                <dt className="text-muted">Poin member</dt>
                <dd className="font-bold text-brand tabular-nums">
                  +{cart.member.poinDapat} / -{cart.member.poinDipakai}
                </dd>
              </div>
            )}
          </dl>
          {sukses.menungguPersetujuan && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Dokumen tersimpan sebagai draf. Kas, stok, dan jurnal belum berubah sampai
              pemilik menyetujuinya di menu <strong>Persetujuan</strong>. Jangan serahkan
              barang sebelum disetujui.
            </p>
          )}
          {sukses.status === "menunggu_pembayaran" && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Pembayaran digital menunggu konfirmasi status. Transaksi belum lunas sampai engine memvalidasi.
            </p>
          )}
          {!sukses.menungguPersetujuan && (
            <button type="button" onClick={() => cetakStruk(toko, dataStruk)} className="btn-secondary mt-2 w-full">
              <ReceiptText className="size-4" aria-hidden /> Cetak Struk
            </button>
          )}
          <button type="button" onClick={() => onClose(true)} className="btn-primary mt-2 w-full">
            Transaksi Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="panel max-h-[90vh] w-full max-w-lg overflow-y-auto p-7">
        <h2 className="font-black text-brand">Penyelesaian pembayaran</h2>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-brand/5 px-3.5 py-2.5 text-sm">
          <span className="text-muted">Total belanja</span>
          <MoneyDisplay value={total} className="text-xl font-black text-brand" />
        </div>

        <div className="mt-4 space-y-2.5">
          {hitungan.baris.map((a, i) => {
            const info = METODE.find((m) => m.id === a.metode)!;
            return (
              <div key={`${a.metode}-${i}`} className="rounded-xl border border-line bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{info.label}</span>
                  <button
                    type="button"
                    aria-label="Hapus alokasi"
                    onClick={() => cart.removeAllocation(i)}
                    className="text-muted transition-colors hover:text-rose-600"
                  >
                    <XCircle className="size-4" aria-hidden />
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  value={a.nominal === 0 ? "" : a.nominal}
                  onChange={(e) => cart.updateAllocation(i, Number(e.target.value))}
                  className="input mt-2 text-right text-lg font-bold tabular-nums"
                />
                {a.over && (
                  <p className="mt-1 text-xs font-semibold text-rose-600">
                    Pembayaran digital tidak boleh melebihi sisa pembayaran.
                  </p>
                )}
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2">
            {METODE.filter((m) => !cart.allocations.some((a) => a.metode === m.id)).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  cart.addAllocation(m.id, m.digital ? hitungan.sisa : 0)
                }
                className="btn-secondary rounded-lg px-3 py-2 text-xs"
              >
                <Plus className="size-4" aria-hidden /> {m.label}
              </button>
            ))}
          </div>

          {cart.allocations.some((a) => a.metode === "qris") ? (
            <div className="mt-3">
              <button
                type="button"
                disabled={midtransLoading}
                onClick={async () => {
                  setMidtransLoading(true);
                  setMidtransError("");
                  try {
                    const orderId = `POS-${Date.now()}`;
                    const res = await fetch(`${API_BASE_URL}/api/midtrans/create-transaction`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        orderId,
                        grossAmount: total,
                        customerName: cart.pelanggan || "Customer",
                        customerEmail: undefined,
                        customerPhone: undefined,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.message ?? "Gagal membuat transaksi Midtrans");
                    if (data.redirectUrl) window.open(data.redirectUrl, "_blank");
                  } catch (e) {
                    setMidtransError(e instanceof Error ? e.message : "Gagal");
                  } finally {
                    setMidtransLoading(false);
                  }
                }}
                className="btn-primary w-full rounded-lg px-4 py-2 text-sm"
              >
                {midtransLoading ? "Memproses..." : "Bayar via Midtrans (QRIS)"}
              </button>
              {midtransError ? (
                <p className="mt-2 text-xs text-rose-600">{midtransError}</p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3 rounded-xl border border-line p-3">
            <p className="mb-2 text-xs font-semibold text-muted">Voucher diskon</p>
            {cart.voucher ? (
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold">{cart.voucher.kode}</span>
                <span className="text-sm font-semibold text-emerald-700">-{formatIDR(cart.voucher.diskon)}</span>
                <button type="button" className="btn-secondary rounded-lg px-2 py-1 text-xs" onClick={hapusVoucher}>
                  Hapus
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="input flex-1 font-mono uppercase"
                  placeholder="KODE-VOUCHER"
                  value={kodeVoucher}
                  onChange={(e) => setKodeVoucher(e.target.value.toUpperCase())}
                />
                <button type="button" className="btn-primary rounded-lg px-3 py-2 text-xs" disabled={validasiPending || !kodeVoucher} onClick={() => void pakaiVoucher()}>
                  {validasiPending ? "..." : "Pakai"}
                </button>
              </div>
            )}
            {pesanVoucher && <p className="mt-2 text-xs text-muted">{pesanVoucher}</p>}
          </div>

          <div className="mt-3 rounded-xl border border-line p-3">
            <p className="mb-2 text-xs font-semibold text-muted">Member & poin</p>
            <datalist id="daftar-kode-member">
              {(daftarMember.data ?? []).map((m) => (
                <option key={m.id} value={m.kode}>{m.nama}</option>
              ))}
            </datalist>
            {cart.member ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold">{cart.member.kode}</span>
                  <span className="text-xs text-muted">{cart.member.nama}</span>
                  <button type="button" className="btn-secondary rounded-lg px-2 py-1 text-xs" onClick={hapusMember}>
                    Lepas
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span>Diskon: <strong className="text-emerald-700">{formatIDR(cart.member.diskon)}</strong></span>
                  <span>Poin pakai: <strong className="tabular-nums">{cart.member.poinDipakai}</strong></span>
                  <span>Poin dapat: <strong className="tabular-nums">{cart.member.poinDapat}</strong></span>
                </div>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
                <input
                  className="input font-mono uppercase"
                  placeholder="KODE-MEMBER"
                  list="daftar-kode-member"
                  value={kodeMember}
                  onChange={(e) => setKodeMember(e.target.value.toUpperCase())}
                />
                <input
                  type="number"
                  min={0}
                  className="input text-right tabular-nums"
                  title="Jumlah poin yang ingin ditukar"
                  value={poinMember === 0 ? "" : poinMember}
                  onChange={(e) => setPoinMember(Math.max(0, Number(e.target.value)))}
                />
                <button
                  type="button"
                  className="btn-primary rounded-lg px-3 py-2 text-xs"
                  disabled={validasiMemberPending || !kodeMember}
                  onClick={() => void pakaiMember()}
                >
                  {validasiMemberPending ? "..." : "Pakai"}
                </button>
              </div>
            )}
            {pesanMember && <p className="mt-2 text-xs text-muted">{pesanMember}</p>}
          </div>

          {gateway.aktif && (
            <button
              type="button"
              onClick={mulaiGateway}
              disabled={hitungan.sisa <= 0}
              className="btn-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              <QrCode className="size-4" aria-hidden /> Bayar via Gateway
              {hitungan.sisa > 0 && <span className="tabular-nums">({hitungan.sisa.toLocaleString("id-ID")})</span>}
            </button>
          )}
          {pesanGateway && (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">{pesanGateway}</p>
          )}
        </div>

        {hitungan.kembalian > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm">
            <span className="font-semibold text-emerald-700">Kembalian tunai</span>
            <MoneyDisplay value={hitungan.kembalian} className="font-black text-emerald-700" />
          </div>
        )}

        {hitungan.sisa > 0 && (
          <div className="mt-3 space-y-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-rose-700">Sisa pembayaran</span>
              <MoneyDisplay value={hitungan.sisa} className="font-black text-rose-700" />
            </div>
            {izinkanKredit ? (
              <label className="flex items-center gap-2 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={cart.gunakanPiutang}
                  onChange={(e) => cart.setPiutang(e.target.checked)}
                />
                Sisa menjadi piutang penjualan (penjualan kredit)
              </label>
            ) : (
              <p className="text-xs font-semibold text-rose-700">
                Kebijakan toko menonaktifkan penjualan kredit — lunasi seluruh sisa.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button type="button" disabled={!canConfirm || mutation.isPending} onClick={confirm}
            className="btn-primary flex-1 py-3 text-base disabled:cursor-not-allowed disabled:opacity-40">
            <ReceiptText className="size-4" aria-hidden />
            {mutation.isPending ? "Memproses..." : "Konfirmasi Pembayaran"}
          </button>
          <button type="button" onClick={() => onClose(false)} className="btn-secondary py-3">
            Batal
          </button>
        </div>
        {mutation.isError && (
          <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {String(mutation.error)}
          </p>
        )}
      </div>

      {gatewayBuka && (
        <GatewayPanel
          nominal={nominalGateway}
          pelanggan={cart.pelanggan ? { nama: cart.pelanggan } : undefined}
          onTerbayar={gatewayTerbayar}
          onBatal={() => setGatewayBuka(false)}
          onManual={gatewayManual}
        />
      )}
    </div>
  );
}

export function PaymentIcon() {
  return <BadgePercent className="size-4" aria-hidden />;
}
