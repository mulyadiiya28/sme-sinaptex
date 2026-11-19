"use client";

import { useState } from "react";

const PASAL = [
  {
    judul: "1. Penggunaan",
    isi: "POS-Sinaptex dipakai untuk operasional toko (kasir, persediaan, dan akuntansi). Dengan menyetujui, Anda bertanggung jawab atas akun, data transaksi, dan cadangan yang dibuat di perangkat ini.",
  },
  {
    judul: "2. Hak cipta",
    isi: "Perangkat lunak, nama, dan tampilan POS-Sinaptex adalah milik penerbitnya. Pengguna mendapat hak pakai, bukan hak memperbanyak, menjual kembali, atau membongkar aplikasi.",
  },
  {
    judul: "3. Lisensi perangkat",
    isi: "Key aktivasi mengikat satu perangkat. Memindahkan instalasi ke komputer lain membutuhkan key baru atau pencabutan lisensi oleh pemilik.",
  },
  {
    judul: "4. Data",
    isi: "Data toko disimpan di engine akuntansi yang Anda operasikan. Penerbit tidak menerima data penjualan kecuali Anda sendiri mengirimkannya (misalnya lewat layanan pembayaran yang Anda daftarkan).",
  },
  {
    judul: "5. Batasan",
    isi: "Aplikasi disediakan apa adanya. Kerugian akibat kesalahan input, gangguan jaringan lokal, atau kegagalan perangkat keras di luar cakupan jaminan perangkat lunak.",
  },
];

export function TermsDialog({ onAccept }: { onAccept: () => void }) {
  const [setuju, setSetuju] = useState(false);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4">
      <div className="panel flex max-h-[85vh] w-full max-w-lg flex-col p-6">
        <h2 className="text-lg font-black text-brand">Syarat &amp; Ketentuan</h2>
        <p className="mt-1 text-sm text-muted">Baca sekali. Persetujuan disimpan di perangkat ini.</p>
        <div className="mt-4 space-y-4 overflow-y-auto pr-1 text-sm text-ink">
          {PASAL.map((p) => (
            <section key={p.judul}>
              <h3 className="font-bold">{p.judul}</h3>
              <p className="mt-1 leading-relaxed text-muted">{p.isi}</p>
            </section>
          ))}
          <p className="text-xs text-muted">© 2026 Sinaptex. Hak cipta dilindungi.</p>
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={setuju}
            onChange={(e) => setSetuju(e.target.checked)}
          />
          <span>Saya telah membaca dan menyetujui syarat &amp; ketentuan di atas.</span>
        </label>
        <button type="button" className="btn-primary mt-4 w-full disabled:opacity-40" disabled={!setuju} onClick={onAccept}>
          Saya Setuju
        </button>
      </div>
    </div>
  );
}
