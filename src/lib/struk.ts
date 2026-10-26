import type { ProfilToko } from "@/lib/api/types";
import { formatIDR } from "@/lib/format";

export type DataStruk = {
  nomor: string;
  waktu: string;
  kasir: string;
  shiftId: string;
  pelanggan?: string;
  items: Array<{ nama: string; qty: number; hargaJual: number; diskon: number }>;
  diskonTransaksi: number;
  pajak: number;
  total: number;
  kembalian: number;
  piutang: number;
  pembayaran?: Array<{ metode: string; nominal: number }>;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildStrukHtml(toko: ProfilToko, d: DataStruk): string {
  const barisItem = d.items
    .map(
      (i) => `<tr>
        <td>${esc(i.nama)}<br/><small>${i.qty} x ${formatIDR(i.hargaJual)}${i.diskon ? ` − ${formatIDR(i.diskon)}` : ""}</small></td>
        <td class="r">${formatIDR(Math.max(0, i.hargaJual * i.qty - i.diskon))}</td>
      </tr>`,
    )
    .join("");

  const barisBayar = (d.pembayaran ?? [])
    .map(
      (b) =>
        `<tr><td>${esc(b.metode === "tunai" ? "Tunai" : b.metode === "qris" ? "QRIS" : "Transfer")}</td><td class="r">${formatIDR(b.nominal)}</td></tr>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"/><title>Struk ${esc(d.nomor)}</title>
  <style>
    body { font-family: "Courier New", monospace; font-size: 12px; margin: 0; padding: 12px; width: 300px; color: #000; }
    h2 { margin: 0; font-size: 15px; text-align: center; }
    .sub { text-align: center; font-size: 11px; margin-bottom: 8px; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 1px 0; }
    td.r { text-align: right; white-space: nowrap; }
    small { font-size: 10px; color: #333; }
    .c { text-align: center; }
    .b { font-weight: bold; font-size: 14px; }
    @media print { body { padding: 0; } }
  </style></head><body>
  <h2>${esc(toko.nama)}</h2>
  <div class="sub">${esc(toko.alamat)}${toko.telepon ? `<br/>${esc(toko.telepon)}` : ""}</div>
  <hr/>
  <table>
    <tr><td>${esc(d.nomor)}</td><td class="r">${new Date(d.waktu).toLocaleString("id-ID")}</td></tr>
    <tr><td>kasir ${esc(d.kasir)} · shift ${esc(d.shiftId)}</td><td class="r">${d.pelanggan ? esc(d.pelanggan) : ""}</td></tr>
  </table>
  <hr/>
  <table>${barisItem}</table>
  <hr/>
  <table>
    <tr><td>Subtotal</td><td class="r">${formatIDR(d.items.reduce((s, i) => s + Math.max(0, i.hargaJual * i.qty - i.diskon), 0))}</td></tr>
    ${d.diskonTransaksi ? `<tr><td>Diskon transaksi</td><td class="r">− ${formatIDR(d.diskonTransaksi)}</td></tr>` : ""}
    ${d.pajak ? `<tr><td>Pajak</td><td class="r">${formatIDR(d.pajak)}</td></tr>` : ""}
    <tr><td class="b">TOTAL</td><td class="r b">${formatIDR(d.total)}</td></tr>
    ${barisBayar}
    ${d.kembalian ? `<tr><td>Kembalian</td><td class="r">${formatIDR(d.kembalian)}</td></tr>` : ""}
    ${d.piutang ? `<tr><td>Piutang (kredit)</td><td class="r">${formatIDR(d.piutang)}</td></tr>` : ""}
  </table>
  <hr/>
  <div class="c">${esc(toko.footerStruk)}</div>
  <div class="c" style="font-size:10px">— asli: toko · salinan: pelanggan —</div>
  </body></html>`;
}

export function cetakStruk(toko: ProfilToko, d: DataStruk): void {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(buildStrukHtml(toko, d));
  doc.close();
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  window.setTimeout(() => frame.remove(), 1000);
}
