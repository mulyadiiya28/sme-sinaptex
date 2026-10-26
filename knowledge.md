# Rencana Desain UI/UX Lengkap — POS-Sinaptex

Product Design Blueprint · Desktop POS & Administrasi · UMKM · Akuntansi Otomatis

POS-Sinaptex dirancang sebagai satu aplikasi operasional toko UMKM yang mengintegrasikan kasir, persediaan, pembayaran, keuangan, dan akuntansi otomatis. Pemilik toko tidak perlu memahami jurnal debit-kredit untuk menjalankan transaksi sehari-hari, tetapi tetap dapat melihat laporan keuangan yang tersusun berdasarkan transaksi sebenarnya.

## Prinsip desain utama

- Kasir mengutamakan kecepatan. Produk mudah dicari, transaksi mudah diproses, dan pembayaran tidak berbelit.
- Administrasi mengutamakan kejelasan. Pemilik dapat memeriksa stok, kas, hutang, piutang, dan kinerja usaha.
- Akuntansi berjalan di belakang layar. Transaksi bisnis menjadi sumber fakta; engine akuntansi membentuk jurnal dan menghitung laporan.
- Satu sumber data. Pembayaran, pergerakan stok, dan jurnal terhubung agar tidak terjadi pencatatan ganda.
- Konfigurasi minimum. Pengguna baru dapat mulai dengan pengaturan sederhana, lalu mengaktifkan fitur lanjutan saat diperlukan.

## 1. Identitas visual dan design system

**POS-Sinaptex — Smart Retail Operations & Accounting**

Satu sistem untuk transaksi, kontrol usaha, dan laporan keuangan.

### Palet dan token warna

| Token | Warna | Pemakaian |
|---|---|---|
| Brand primary | `#0B2F6E` | Sidebar, heading H1, tombol utama |
| Brand hover | `#082657` | Hover tombol navy |
| Brand accent | `#FF6B00` | Aksen, promosi, penekanan tertentu |
| Background | `#F8FAFC` | Latar halaman |
| Panel | `#FFFFFFE6` | Panel putih semi-transparan |
| Border | `#E2E8F0` | Garis pembatas |
| Text primary | `#0F172A` | Teks utama |
| Text secondary | `#64748B` | Label dan keterangan |
| Statistik violet | `#7C3AED` | Metrik kategori tertentu |
| Statistik emerald | `#059669` | Metrik kategori tertentu |
| Statistik rose | `#E11D48` | Peringatan atau kategori tertentu |

Warna statistik violet, emerald, dan rose dipertahankan sebagai pembeda data, bukan diganti dengan warna brand.

### Standar komponen

- Heading utama: `font-black text-[#0B2F6E]`.
- Panel utama: `rounded-3xl border-slate-200/80 bg-white/90 backdrop-blur-xl`.
- Tombol utama: navy dengan teks putih, hover lebih gelap, dan focus state yang jelas.
- Tombol sekunder: putih atau slate dengan border tipis.
- Orange: digunakan selektif agar tetap menonjol, bukan pada setiap tombol.
- Tabel: header ringan, angka rata kanan, format Rupiah konsisten, dan aksi per baris.
- Status: badge teks dan warna; status penting tidak dibedakan hanya berdasarkan warna.
- Kepadatan layar: cukup padat untuk administrasi desktop, tetapi tetap mudah dibaca saat kasir melayani antrean.

## 2. Struktur aplikasi dan navigasi

Aplikasi menggunakan layout desktop dengan sidebar tetap di kiri, topbar untuk pencarian dan status sistem, serta area kerja utama di kanan.

Modul utama: Dashboard · Kasir · Produk & Stok · Keuangan · Akuntansi · Laporan · Pengaturan.

Contoh dashboard (data ilustrasi): Penjualan hari ini Rp 2.450.000 (24 transaksi), Saldo kas Rp 850.000, Stok menipis 5 produk, tombol aksi "Buka Kasir".

### Susunan navigasi

| Grup | Item |
|---|---|
| Operasional | Dashboard · Kasir · Riwayat transaksi · Shift kasir |
| Produk & Persediaan | Produk · Kategori · Satuan · Pembelian · Mutasi stok · Penyesuaian |
| Keuangan | Kas & bank · Biaya · Piutang · Hutang · Pembayaran |
| Akuntansi | Daftar akun · Jurnal · Buku besar · Neraca saldo · Laba-rugi · Neraca |
| Laporan | Penjualan · Margin · Persediaan · Arus kas · Kinerja usaha |
| Pengaturan | Profil toko · Pengguna · Hak akses · Pajak · Printer · Integrasi pembayaran |

Sidebar dapat diciutkan agar area kerja lebih luas. Kasir mendapatkan akses langsung ke layar transaksi tanpa harus melewati dashboard administrasi.

## 3. Rencana layout setiap halaman

### A. Dashboard pemilik toko

Tujuan: memberikan gambaran kesehatan usaha dalam satu layar.

Susunan dari atas ke bawah:

1. Topbar: nama toko, pemilih periode, pencarian, notifikasi, profil pengguna.
2. Kartu KPI: omzet, laba kotor, saldo kas dan bank, jumlah transaksi.
3. Grafik penjualan: tren harian, perbandingan periode, dan metode pembayaran.
4. Aktivitas terbaru: penjualan, pembelian, biaya, pembayaran masuk dan keluar.
5. Peringatan: stok menipis, piutang jatuh tempo, selisih kas, dan transaksi yang perlu ditinjau.

Fitur tambahan: filter tanggal, ekspor laporan, pintasan ke kasir, dan ringkasan per cabang bila kelak mendukung multi-outlet.

Aturan akuntansi: omzet, laba, dan saldo harus berasal dari data transaksi dan engine yang sesuai. Saldo kas tidak boleh disamakan dengan laba.

### B. Halaman kasir (POS)

Halaman ini merupakan layar paling penting untuk penggunaan sehari-hari.

Layout desktop yang direkomendasikan:

- Area kiri sekitar 60–65%: pencarian, barcode, kategori dan katalog produk.
- Area kanan sekitar 35–40%: keranjang, jumlah barang, diskon, subtotal, pajak bila berlaku, total dan tombol pembayaran.
- Header transaksi: nomor transaksi, kasir, shift, pelanggan opsional.
- Footer: pintasan keyboard, simpan draft bila didukung, dan status koneksi printer atau perangkat.

Fitur kasir:

- Scan barcode atau pencarian produk.
- Ubah kuantitas, hapus item, dan batalkan transaksi dengan kontrol hak akses.
- Diskon per item atau transaksi.
- Pelanggan opsional dan penjualan kredit bila diizinkan.
- Retur dengan referensi transaksi asli.
- Cetak atau kirim struk.
- Pencegahan klik pembayaran berulang dan duplikasi transaksi.
- Dukungan transaksi tunai, nontunai, dan pembayaran campuran.

### C. Halaman pembayaran

Aturan penting:

- Pembayaran campuran terdiri atas beberapa alokasi pembayaran yang totalnya harus sesuai dengan jumlah yang dibayar.
- Tunai dapat menghitung kembalian; pembayaran digital tidak boleh dianggap berhasil hanya karena tombol diklik.
- QRIS dan payment gateway membutuhkan integrasi penyedia yang sesuai, termasuk penanganan status pending, berhasil, gagal, dan refund.
- Jika pembayaran kurang dan penjualan kredit diperbolehkan, selisih menjadi piutang. Jika tidak, transaksi tidak boleh ditandai lunas.
- Setiap metode pembayaran dipetakan ke rekening kas, bank, atau akun penampung yang sesuai.

### D. Produk dan katalog

Layout: toolbar dengan pencarian dan filter, tombol tambah produk, tabel produk, panel detail, dan formulir tambah/edit.

Kolom tabel yang disarankan:

| Kolom | Kegunaan |
|---|---|
| SKU / barcode | Identitas produk |
| Nama produk | Nama yang tampil di kasir |
| Satuan | Pcs, dus, kg, gram, liter, dan lain-lain |
| Harga jual | Harga transaksi |
| Stok tersedia | Hasil perhitungan mutasi stok |
| Stok minimum | Dasar peringatan |
| Status | Aktif, nonaktif, stok menipis |

Fitur: kategori, varian, konversi satuan, harga beli, harga jual, impor massal, dan riwayat perubahan harga.

Harga jual tidak otomatis mengubah HPP. HPP ditentukan oleh metode biaya persediaan yang dipilih dan pergerakan persediaan yang sah.

### E. Pembelian dan persediaan

Halaman pembelian memiliki daftar faktur pembelian, pemasok, tanggal, nilai pembelian, status pembayaran, dan status penerimaan barang.

Alur pembelian:

1. Buat transaksi pembelian dan pilih pemasok.
2. Masukkan produk, kuantitas, satuan, harga, diskon, dan pajak bila berlaku.
3. Catat penerimaan barang.
4. Catat pembayaran langsung atau hutang kepada pemasok.
5. Perbarui stok melalui mutasi dan perbarui biaya persediaan sesuai kebijakan.
6. Bentuk jurnal yang sesuai dari transaksi yang telah diposting.

Fitur persediaan lainnya mencakup penyesuaian stok, stok opname, transfer antar lokasi bila didukung, retur pembelian, dan pelacakan alasan selisih.

### F. Keuangan dan pembayaran

Pisahkan halaman keuangan berdasarkan aktivitas bisnis, bukan hanya berdasarkan jenis laporan:

- Kas dan bank: saldo hasil transaksi, penerimaan, pengeluaran, dan rekonsiliasi.
- Biaya: kategori pengeluaran, bukti transaksi, metode pembayaran, dan persetujuan opsional.
- Piutang: faktur, uang muka, pembayaran sebagian, pelunasan, dan jatuh tempo.
- Hutang: tagihan pemasok, pembayaran sebagian, pelunasan, dan jatuh tempo.
- Pembayaran: referensi transaksi, metode, nominal, status, refund, dan rekonsiliasi.
- Mutasi internal: transfer kas ke bank atau antar rekening tanpa menghitungnya sebagai pendapatan atau biaya.

Setiap transaksi memiliki referensi yang dapat ditelusuri ke dokumen asal dan jurnalnya.

### G. Akuntansi otomatis

Contoh jurnal dari penjualan (simulasi penjualan Rp100.000 dengan HPP Rp65.000, dibayar tunai):

| Akun | Debit | Kredit |
|---|---|---|
| Kas | Rp 100.000 | — |
| Penjualan | — | Rp 100.000 |
| HPP | Rp 65.000 | — |
| Persediaan | — | Rp 65.000 |

Laba kotor transaksi: Rp 35.000.

UI akuntansi menyediakan:

- Daftar akun dan konfigurasi pemetaan akun.
- Jurnal otomatis dan detail asal transaksi.
- Buku besar dan neraca saldo.
- Laporan laba-rugi dan neraca.
- Periode akuntansi, status posting, dan audit trail.
- Penelusuran dari angka laporan ke jurnal dan transaksi sumber.
- Peringatan ketidakseimbangan atau transaksi yang belum lengkap.

Prinsip desain data: angka saldo dan total laporan merupakan hasil perhitungan engine berdasarkan transaksi yang sah, bukan nilai yang diedit langsung oleh pengguna. Jurnal yang sudah diposting tidak diubah diam-diam; koreksi dilakukan melalui pembatalan atau jurnal penyesuaian yang dapat diaudit.

### H. Laporan usaha

- Laporan penjualan: omzet per periode, jumlah transaksi, nilai rata-rata transaksi, produk terlaris, retur, diskon, dan metode pembayaran.
- Laporan persediaan: nilai persediaan, stok minimum, perputaran persediaan, HPP, dan selisih stok opname.
- Laporan keuangan: laba-rugi, neraca, neraca saldo, arus kas, piutang, hutang, dan ringkasan kinerja usaha.

Setiap laporan memiliki filter tanggal, opsi ekspor, serta kemampuan membuka rincian transaksi sumber. ROA dan ROE hanya ditampilkan ketika data aset dan ekuitas cukup memadai.

### I. Pengguna, shift kasir, dan pengaturan

Halaman pengaturan dibagi menjadi empat kelompok:

1. Profil toko: nama, alamat, mata uang, zona waktu, logo, dan informasi struk.
2. Operasional: satuan, kategori produk, printer, barcode, kebijakan stok, dan metode pembayaran.
3. Akuntansi: daftar akun, kebijakan HPP, pemetaan transaksi, periode, pajak, dan konfigurasi lanjutan.
4. Keamanan: pengguna, tingkat akses, persetujuan, audit log, dan sesi login.

Fitur shift kasir mencakup saldo awal, penerimaan tunai, pengeluaran kas, saldo yang dihitung sistem, uang fisik saat tutup shift, serta selisih kas. Selisih ditampilkan sebagai peringatan dan mengikuti kebijakan persetujuan yang ditentukan.

## 4. Alur pengguna dari awal hingga akhir

### Alur transaksi penjualan

1. Pilih produk — scan barcode atau cari produk.
2. Periksa keranjang — kuantitas, harga, diskon, pajak, dan total.
3. Pilih pembayaran — tunai, transfer, QRIS, gateway, atau campuran.
4. Validasi pembayaran — pastikan jumlah dan status pembayaran benar.
5. Selesaikan transaksi — simpan transaksi, terbitkan struk, dan perbarui stok.
6. Posting akuntansi — bentuk jurnal, HPP, dan dampak keuangan sesuai transaksi.

### Alur lain yang harus didukung

| Aktivitas | Alur sistem |
|---|---|
| Pembelian stok | Buat pembelian → terima barang → mutasi stok → catat hutang atau pembayaran → jurnal |
| Biaya operasional | Input biaya → pilih kategori dan sumber dana → posting → jurnal biaya |
| Penjualan kredit | Buat penjualan → catat piutang → terima pembayaran bertahap → pelunasan |
| Retur penjualan | Referensikan penjualan asli → validasi barang dan refund → koreksi stok, pendapatan, dan HPP sesuai kondisi |
| Transfer kas ke bank | Catat sumber dan tujuan → validasi → mutasi internal → jurnal transfer |
| Tutup kasir | Hitung uang fisik → bandingkan dengan sistem → tinjau selisih → tutup shift |

## 5. Aturan interaksi dan konsistensi akuntansi

Bagian ini penting agar desain tidak hanya bagus secara visual, tetapi juga mendukung perilaku sistem yang benar:

- Status transaksi jelas: draft, menunggu pembayaran, dibayar sebagian, lunas, gagal, dibatalkan, atau dikembalikan sesuai konteks.
- Pembayaran idempoten: klik berulang atau pengiriman ulang notifikasi gateway tidak boleh membuat transaksi pembayaran ganda.
- Stok terkontrol: transaksi yang berhasil diposting menghasilkan mutasi stok. Stok negatif mengikuti kebijakan yang eksplisit, dengan peringatan atau pembatasan sesuai pengaturan.
- Koreksi dapat dilacak: retur dan pembatalan memiliki referensi transaksi asal dan tidak menghapus riwayat.
- Jurnal seimbang: total debit dan kredit harus seimbang saat posting.
- Saldo bukan fakta input: saldo kas, hutang, piutang, persediaan, dan total laporan dihitung dari transaksi sumber.
- Pemisahan status pembayaran dan penjualan: penjualan dapat sudah tercatat tetapi pembayarannya masih menunggu atau baru dibayar sebagian.
- Keamanan: transaksi sensitif, perubahan harga, diskon khusus, dan penyesuaian stok dapat memerlukan otorisasi.

## 6. Prioritas pengembangan

| Prioritas | Fase | Cakupan |
|---|---|---|
| P0 | Fondasi (MVP — wajib tersedia) | Login dan hak akses dasar, profil toko, produk dan satuan, kasir, pembayaran tunai/transfer, pembayaran campuran dasar, persediaan, pembelian, kas dan biaya, jurnal otomatis, laba-rugi dasar, tutup shift, dan audit transaksi |
| P1 | Operasional (penyempurnaan toko) | Integrasi QRIS/payment gateway, printer struk, piutang dan hutang lengkap, retur, diskon, pajak, stok opname, buku besar, neraca saldo, dan rekonsiliasi pembayaran |
| P2 | Lanjutan (skalabilitas bisnis) | Multi-outlet, multi-gudang, transfer antar lokasi, persetujuan bertingkat, konfigurasi akuntansi lanjutan, analisis margin, perputaran stok, ROA/ROE, dan laporan komparatif |

## 7. Rekomendasi struktur implementasi frontend

Untuk menjaga konsistensi, desain dibangun menggunakan komponen bersama:

- AppShell — layout utama dan navigasi.
- Sidebar dan Topbar — navigasi serta kontrol global.
- PageHeader — judul, breadcrumb, dan aksi halaman.
- KpiCard — kartu metrik.
- DataTable — tabel dengan pencarian, filter, pagination, dan aksi.
- FormField — input, validasi, dan pesan kesalahan.
- StatusBadge — status transaksi dan pembayaran.
- MoneyDisplay — format Rupiah yang konsisten.
- ProductSearch dan CartPanel — komponen khusus kasir.
- PaymentMethodSelector dan PaymentAllocationForm — pembayaran tunggal dan campuran.
- ConfirmDialog dan AuditTimeline — konfirmasi serta penelusuran aktivitas.

Arsitektur tampilan sebaiknya memakai Tailwind CSS, Zod untuk validasi skema, React Query untuk pengelolaan data server, dan Zustand untuk state UI yang memang perlu dibagi. Logika akuntansi dan perhitungan saldo tetap berada di backend, bukan di komponen frontend.

## 8. Kriteria desain dianggap siap dikembangkan

- [ ] Kasir dapat memproses transaksi tanpa harus membuka halaman administrasi.
- [ ] Semua metode pembayaran mempunyai status yang jelas.
- [ ] Pembayaran campuran dapat dialokasikan tanpa selisih yang tidak terjelaskan.
- [ ] Penjualan, pembelian, retur, biaya, dan pelunasan memiliki alur jurnal yang terdefinisi.
- [ ] Saldo stok, kas, piutang, hutang, dan laporan dapat ditelusuri ke transaksi sumber.
- [ ] Hak akses dan konfirmasi tersedia untuk aksi berisiko.
- [ ] Seluruh halaman menggunakan standar warna dan komponen yang sama.
- [ ] Tampilan dapat diuji dengan data kosong, data banyak, loading, error, dan status transaksi tertunda.

## Kesimpulan

Desain POS-Sinaptex harus menempatkan layar kasir sebagai pusat operasional, dashboard sebagai pusat pemantauan, dan engine akuntansi sebagai lapisan otomatis di belakangnya. Dengan urutan MVP yang tepat, aplikasi bisa berguna untuk toko kecil terlebih dahulu tanpa mengorbankan fondasi untuk fitur akuntansi yang lebih kompleks di masa mendatang.

## Lampiran: Ringkasan diskusi rencana frontend (belum final)

Peta route yang diusulkan:

| Route | Konten |
|---|---|
| `/dashboard` | KPI (omzet, laba kotor, saldo kas, transaksi), grafik penjualan, aktivitas terbaru, peringatan |
| `/kasir` | Katalog + barcode (kiri ~60%), keranjang + total (kanan ~40%), pintasan keyboard, struk |
| `/kasir/pembayaran` | Tunai, transfer, QRIS, gateway, campuran dengan alokasi pembayaran |
| `/produk` | Tabel produk (SKU, nama, satuan, harga jual, stok, status) + form tambah/edit |
| `/pembelian` | Faktur pembelian: pemasok, penerimaan barang, hutang/pembayaran |
| `/keuangan` | Kas & Bank, Biaya, Piutang, Hutang, Pembayaran, Mutasi internal |
| `/akuntansi` | Daftar akun, Jurnal, Buku besar, Neraca saldo, Laba-rugi, Neraca |
| `/laporan` | Penjualan, Persediaan, Arus kas, Kinerja usaha |
| `/pengaturan` | Profil toko, Operasional, Akuntansi, Keamanan |
| `/shift` | Saldo awal, kas masuk/keluar, selisih, tutup shift |

Pertanyaan terbuka yang masih perlu diputuskan:

1. Kasir: halaman biasa di dalam shell, atau layar khusus tanpa sidebar?
2. Data: mulai dari mock data, atau langsung mengikuti contract API backend?
3. Prioritas MVP frontend: Kasir + Pembayaran + Produk saja dulu, atau Dashboard ikut dari awal?
4. Daftar komponen bagian 7 dikunci, atau perlu penambahan/perubahan?

## Keputusan arsitektur (final per 2026-10-26)

1. **Kasir** = layar khusus tanpa sidebar (fokus transaksi), tetap satu aplikasi yang sama.
2. **Data** = mock data lebih dulu; struktur client API siap disambungkan ke engine asli.
3. **MVP frontend** = Kasir + Pembayaran + Produk terlebih dulu; halaman lain placeholder; Dashboard menyusul.
4. **Komponen** = sesuai blueprint bagian 7, ditambah kecil bila perlu.
5. **Backend** = engine C# yang menyediakan REST API dengan autentikasi JWT (access + refresh token). Logika akuntansi/saldo/stok hanya di engine.
6. **Integrasi frontend–backend** = terpisah. Frontend Next.js memanggil engine via `Authorization: Bearer <JWT>`; akses token di memori, refresh token di cookie HttpOnly; middleware Next menjaga route privat.
7. **Topologi = Mode A (offline per toko, LAN)**:
   - Frontend dibangun statik (`output: "export"`) lalu dibungkus **Tauri** menjadi `POS-Sinaptex.exe` yang di-install di komputer kasir — tidak ada Node.js atau terminal di komputer toko.
   - Engine C# dipasang sebagai **Windows Service** di komputer server toko (auto-start saat boot, berjalan di background).
   - POS.exe mengambil data dari `http://<server-toko>:PORT/api`.
   - Kode tidak berubah bila kelak pindah Mode B (terpusat), hanya alamat API di config.
8. **Struktur client API**:
   ```
   src/lib/api/
     ├─ client.ts   → antarmuka endpoint + inject Bearer token
     ├─ real/       → implementasi memanggil API C#
     └─ mock/       → implementasi data dummy sesuai blueprint
   ```
   Toggle via `.env`: `NEXT_PUBLIC_API_MODE=mock|live`.
9. **Urutan kerja**:
   - Tahap 1 — design system: token warna, tombol, panel, FormField (Zod), StatusBadge, MoneyDisplay, PageHeader, KpiCard, DataTable, AppShell (sidebar + topbar).
   - Tahap 2 — MVP feature: Kasir → Pembayaran → Produk & Stok → Shift kasir → Dashboard.
   - Tahap 3 — P1: pembelian, keuangan lengkap, jurnal & laba-rugi, laporan, pengaturan.
   - Tahap 4 — kemasan Tauri + installer (setelah fitur MVP stabil).

## Status implementasi frontend (produksi lulus build statis)

### Peta file

```
src/
  app/
    layout.tsx                 → root layout + React Query provider
    globals.css                → token warna design system + kelas panel/btn/input/label
    kasir/page.tsx             → layar kasir (tanpa sidebar), interaktif; blok bila shift belum dibuka
    (app)/                     → grup route dengan AppShell (sidebar + topbar)
      page.tsx                 → Dashboard (KPI & aktivitas dari data mock nyata: omzet hari ini, kas shift, stok menipis, piutang)
      produk/page.tsx          → Produk & Stok (CRUD aktif: tabel, cari, filter, form)
      riwayat/page.tsx         → Riwayat transaksi (tabel + cari + dialog detail rinci)
      shift/page.tsx           → Shift kasir (buka shift, kas masuk/keluar, tutup shift + selisih, riwayat)
      pembelian/page.tsx        → Pembelian (tabel faktur + form: pemasok, item, metode tunai/bank/hutang; stok & hargaBeli ter-update otomatis)
      keuangan/page.tsx         → Keuangan (4 tab: Kas & Bank, Biaya + form catat, Piutang + bayar, Hutang + bayar)
      akuntansi/page.tsx        → Akuntansi (3 tab: Neraca saldo + badge keseimbangan, Jurnal otomatis expandable, Laba-Rugi KPI + rincian)
      laporan/page.tsx          → Laporan (KPI omzet/persediaan/rata-rata; penjualan per hari; nilai persediaan stok×hargaBeli)
      pengaturan/page.tsx       → placeholder
  components/
    app-shell.tsx, sidebar.tsx, app-topbar.tsx, page-header.tsx, kpi-card.tsx,
    status-badge.tsx, money-display.tsx, data-table.tsx, placeholder-page.tsx, form-field.tsx
    kasir/
      product-catalog.tsx      → pencarian/barcode/kategori/Enter=pilih
      cart-panel.tsx           → keranjang, diskon transaksi, pelanggan, total
      payment-dialog.tsx       → pembayaran tunggal & campuran + hasil transaksi
    produk/
      product-form-dialog.tsx  → form tambah/edit produk (validasi Zod, hargaBeli + hargaJual)
  hooks/queries.ts             → useProducts, useActiveShift, useShiftRiwayat, useShiftMutations,
                                  useProductMutations, useCheckout, useRiwayatTransaksi, usePembelian,
                                  usePembayaranMutations, useBiaya, useBiayaMutations, useJurnal,
                                  useAkun, useLabaRugi, usePembelianMutations
  lib/
    format.ts                  → formatIDR (Intl id-ID)
    nav.ts                     → konfigurasi grup navigasi sidebar
    utils.ts                   → cn helper
    store/cart.ts              → Zustand cart + alokasi pembayaran
    api/
      types.ts                 → kontrak data (Product, ShiftInfo, CheckoutPayload, Pembelian, Biaya,
                                  JurnalEntry, AkunSaldo, LabaRugi, ...) — acuan kontrak C#
      client.ts                → API_MODE=mock|live; master/shift/transaksi/pembelian/hutang/piutang/biaya/akuntansi
      mock/db.ts               → in-memory store + mini engine: produk, shift, riwayat, jurnal double-entry
                                  (modal awal, penjualan+HPP, pembelian, bayar hutang/piutang, biaya), akun saldo, laba-rugi
public/
  icon-192.png, icon-512.png, icon-maskable-512.png → ikon PWA placeholder (brand + huruf "S", diganti logo asli nanti)
  sw.js                        → service worker hasil bundel @serwist/next (regenerasi saat build)
```

### PWA (Serwist) — jalur distribusi kedua

- Paket: `@serwist/next@^9` + `serwist@^9` (`next.config.ts` dibungkus `withSerwistInit`; SW disabled di dev).
- `src/sw.ts`: precache semua aset build (`self.__SW_MANIFEST`), `navigateFallback: "/index.html"` (denylist `/api/`), runtime cache `NetworkFirst` untuk path yang mengandung `/api/` (timeout 10s, maks 100 entri, usia 24 jam).
- Registrasi otomatis di-inject Serwist ke chunk main (ditemukan di `out/_next/static/chunks/main-*.js`) — tidak perlu komponen register manual.
- `src/app/manifest.ts` → `/manifest.webmanifest` (`dynamic = "force-static"` wajib untuk output: export); metadata layout: manifest link + `themeColor: #0B2F6E` + apple-web-app meta.
- API v9 Serwist yang dipakai: `new Serwist({...})` + `serwist.addEventListeners()` (bukan `installSerwist`); `RuntimeCaching` memakai prop `matcher` (bukan `urlPattern`); `maxEntries` & `cacheableResponse` lewat plugin `ExpirationPlugin`/`CacheableResponsePlugin`.
- Batas yang dipegang: service worker hanya meng-cache GET (aset & read). Semua POST/checkout/mutasi tetap butuh engine C# hidup — PWA melindungi tampilan & data baca saat jaringan terputus, bukan pengganti offline-first tulis (queue mutasi = P2).
- Di dalam Tauri (WebView2, custom protocol) registrasi SW mungkin ditolak browser — tidak masalah; PWA ditargetkan untuk pemakaian via browser/serve statis, Tauri tetap jalur produksi utama.

### Kontrak API yang harus dipenuhi engine C# (versi mock → live)

| Fungsi frontend | Metode & endpoint usul C# | Catatan |
|---|---|---|
| `api.master.products()` | `GET /api/products` | daftar produk aktif+nonaktif |
| `api.master.createProduct()` | `POST /api/products` | tolak barcode duplikat |
| `api.master.updateProduct()` | `PUT /api/products/{id}` | harga tidak menyentuh HPP |
| `api.master.deleteProduct()` | `DELETE /api/products/{id}` | idealnya nonaktifkan, bukan hapus |
| `api.shift.aktif()` | `GET /api/shifts/active` | `null` bila belum ada shift; saldo awal & kas tunai sistem |
| `api.shift.riwayat()` | `GET /api/shifts` | shift ter-tutup + selisih |
| `api.shift.buka()` | `POST /api/shifts` | kasir + saldo awal; tolak bila ada shift aktif |
| `api.shift.mutasiKas()` | `POST /api/shifts/{id}/cash-movements` | masuk/keluar; tolak bila kas tidak cukup |
| `api.shift.tutup()` | `POST /api/shifts/{id}/close` | uang fisik → selisih tercatat (audit) |
| `api.transaksi.checkout()` | `POST /api/transactions` | campuran = alokasi; sisa → piutang bila kredit; QRIS → status menunggu; engine yang menghitung jurnal + mutasi stok; tunai terbayar diakumulasikan ke kas shift |
| `api.transaksi.riwayat()` | `GET /api/transactions` | arsip transaksi: item, diskon, kembalian, piutang, status, kasir, shift |
| `api.pembelian.list()` | `GET /api/purchases` | faktur pembelian + terbayar |
| `api.pembelian.buat()` | `POST /api/purchases` | tambah stok, perbarui hargaBeli, bentuk jurnal, kurangi kas/bank atau tambah hutang |
| `api.hutang.bayar()` | `POST /api/payables/{id}/payments` | kurangi hutang, bentuk jurnal, kurangi kas/bank |
| `api.piutang.bayar()` | `POST /api/receivables/{nomor}/payments` | kurangi piutang, update status transaksi, jurnal, tambah kas/bank |
| `api.biaya.catat()` | `POST /api/expenses` | jurnal biaya operasional; kurangi kas/bank |
| `api.biaya.list()` | `GET /api/expenses` | daftar biaya tercatat |
| `api.akuntansi.jurnal()` | `GET /api/journal` | semua jurnal otomatis (baris debit/kredit, keterangan, ref) |
| `api.akuntansi.akun()` | `GET /api/accounts` | saldo per akun (debit/kredit/saldo) — basis neraca saldo |
| `api.akuntansi.labaRugi()` | `GET /api/income-statement` | pendapatan, HPP, biaya, laba bersih |

Semua endpoint membawa `Authorization: Bearer <JWT>`; komputer toko memanggil `http://<server-toko>:<port>/api` (Mode A).

### Prinsip yang sudah dipegang di frontend

- Kasir **tidak bisa transaksi sebelum shift dibuka**; layar kasir mengarahkan ke halaman Shift.
- Kas tunai sistem = saldo awal + kas masuk − kas keluar + penjualan tunai (diakumulasi dari checkout); tidak termasuk transfer/QRIS.
- Stok pada keranjang menghitung dari mock; di live nantinya hasil mutasi engine (frontend tidak menghitung sendiri).
- Alokasi campuran divalidasi: digital tidak boleh melebihi sisa; tunai berlebih = kembalian.
- Sisa hanya boleh jadi piutang jika penjualan kredit diizinkan; tanpa itu konfirmasi terkunci.
- Status pembayaran ≠ status penjualan: hasil checkout punya status `lunas | menunggu_pembayaran | dibayar_sebagian`.
- Tutup shift mencatat selisih (uang fisik vs sistem) sebagai peringatan untuk kebijakan persetujuan.
- Dashboard & riwayat menghitung dari arsip transaksi nyata (bukan angka statis): omzet/jumlah transaksi hari ini, kas tunai dari shift aktif, piutang dari penjualan kredit, produk di bawah batas minimum.
- Setelah checkout, cache transaksi/produk/shift di-invalidate agar data konsisten antar halaman.

### Catatan mock (Tahap 2 — fungsional)

Alur utuh yang bisa diuji: buka shift → kasir (F2 cari / Enter tambah / F4 bayar) → pembayaran tunggal/campuran (kembalian, sisa→piutang, QRIS pending) → stok otomatis berkurang → riwayat + detail → dashboard ikut berubah → tutup shift dengan selisih. Semua data in-memory di `mock/db.ts` (reset saat refresh — disengaja untuk mock).

### Catatan mock (Tahap 3 — P1 fungsional)

- **Pembelian**: registerPembelian menambah stok, memperbarui hargaBeli produk, membentuk jurnal (Persediaan debit; Kas/Bank/Hutang kredit), mengurangi kas bila tunai/bank.
- **Hutang/Piutang**: bayarHutang & bayarPiutang memperbarui terbayar/piutang + status transaksi, membentuk jurnal, dan menggerakkan kas/bank.
- **Biaya**: catatBiaya membentuk jurnal Biaya operasional debit / Kas-Bank kredit.
- **Akuntansi**: jurnal double-entry dari modal awal (Kas 1.5jt, Bank 3jt, Persediaan, Modal), penjualan (Kas/Bank/Piutang debit; Penjualan kredit; HPP/Persediaan), neraca saldo dengan indikator keseimbangan debit=kredit, laba-rugi (pendapatan − HPP − biaya).

### Cara menjalankan

```
npm install
npm run dev        → http://localhost:3000 (Kasir di /kasir)
npm run build      → hasil statis di out/ (untuk Tauri, produksi via .exe)
```
