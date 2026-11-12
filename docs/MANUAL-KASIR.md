# Manual Pengguna Kasir — POS-Sinaptex

**Versi:** 1.0 MVP  
**Tanggal:** November 2026  
**Untuk:** Kasir / Operator Toko

---

## 📖 Daftar Isi

1. [Pengenalan](#pengenalan)
2. [Login](#login)
3. [Buka Shift](#buka-shift)
4. [Transaksi Penjualan](#transaksi-penjualan)
5. [Pembayaran](#pembayaran)
6. [Riwayat Transaksi](#riwayat-transaksi)
7. [Tutup Shift](#tutup-shift)
8. [Tips & Trik](#tips--trik)
9. [Troubleshooting](#troubleshooting)

---

## Pengenalan

**POS-Sinaptex** adalah aplikasi kasir untuk toko retail UMKM. Sebagai kasir, Anda bertanggung jawab untuk:

- ✅ Membuka dan menutup shift harian
- ✅ Melayani transaksi penjualan
- ✅ Menerima pembayaran (tunai, transfer, QRIS)
- ✅ Mencetak struk
- ✅ Menerima pelunasan piutang pelanggan

**Anda TIDAK bisa:**
- ❌ Membatalkan (void) transaksi
- ❌ Melakukan retur
- ❌ Mengubah harga produk
- ❌ Mengakses laporan keuangan

Untuk aksi tersebut, minta bantuan **Pemilik/Manager**.

---

## Login

### Langkah-langkah:

1. **Buka aplikasi** POS-Sinaptex dari desktop
2. **Masukkan username dan password:**
   - Username: `kasir` (atau username yang diberikan owner)
   - Password: (rahasia Anda)
3. **Klik tombol "Masuk"**

**Screenshot:** *(placeholder: halaman login)*

### ⚠️ Troubleshooting Login

| Masalah | Solusi |
|---------|--------|
| "Username atau password salah" | Cek CAPS LOCK, pastikan password benar |
| "Gagal terhubung ke server" | Hubungi IT/Owner, engine mungkin mati |
| Lupa password | Minta owner reset via menu Pengaturan → Kelola User |

---

## Buka Shift

**PENTING:** Anda **TIDAK BISA** melayani transaksi sebelum shift dibuka!

### Kapan Membuka Shift?

- Pagi hari sebelum toko buka (misal: 08:00)
- Setelah shift sebelumnya ditutup
- Hanya **1 shift aktif** per waktu

### Langkah-langkah:

1. Setelah login, sistem akan menampilkan notifikasi:
   ```
   ⚠️ Tidak ada shift aktif. Silakan buka shift terlebih dahulu.
   ```

2. **Klik tombol "Buka Shift"** atau masuk ke menu **Shift**

3. **Isi form:**
   - **Nama Kasir:** (otomatis terisi dari akun login Anda)
   - **Kas Awal:** Hitung uang fisik di laci, masukkan jumlahnya
     - Contoh: Rp 500.000
     - Kas awal ini akan dibandingkan saat tutup shift

4. **Klik "Buka Shift"**

5. Sistem akan menampilkan:
   ```
   ✅ Shift berhasil dibuka!
   Shift ID: SHIFT-20261112-001
   ```

**Screenshot:** *(placeholder: dialog buka shift)*

### 💡 Tips Kas Awal

- **Hitung pasti** uang fisik: pecahan Rp 100.000, Rp 50.000, dst.
- Kas awal biasanya sama setiap hari (misal: selalu Rp 500.000)
- Jangan termasuk uang owner/pribadi
- Jika kemarin tutup shift dengan uang Rp 1.200.000, ambil Rp 700.000 untuk disetor ke owner, sisakan Rp 500.000 untuk kas awal hari ini

---

## Transaksi Penjualan

### Layar Kasir

Setelah shift terbuka, Anda bisa akses **Layar Kasir** (full-screen):

- **Dari dashboard:** Klik menu "Kasir"
- **Atau:** Tekan **F2** (shortcut)

**Screenshot:** *(placeholder: layar kasir)*

### Bagian-bagian Layar Kasir:

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Cari produk...              [F1 Produk] [F6 Piutang] │
├─────────────────────────────────────────────────────────┤
│ KATALOG PRODUK                                          │
│ ┌────────┬────────┬────────┐                          │
│ │ Susu   │ Kopi   │ Roti   │  ← Klik untuk tambah     │
│ └────────┴────────┴────────┘                          │
├─────────────────────────────────────────────────────────┤
│ KERANJANG                                               │
│ Susu Ultra 1L       x2    Rp 30.000                    │
│ Kopi Kapal Api      x1    Rp 15.000                    │
│                                                         │
│ Subtotal:                 Rp 45.000                    │
│ Diskon:                   Rp 0                         │
│ Pajak (11%):              Rp 4.950                     │
│ ───────────────────────────────────────                │
│ TOTAL:                    Rp 49.950                    │
└─────────────────────────────────────────────────────────┘
```

### Cara Tambah Produk:

#### Metode 1: Klik Katalog
1. Cari produk di grid katalog
2. Klik card produk → otomatis masuk keranjang (qty: 1)
3. Klik lagi untuk tambah qty

#### Metode 2: Cari dengan Keyboard
1. Klik kotak "🔍 Cari produk..." atau tekan **Tab**
2. Ketik nama/barcode (misal: `susu`)
3. Hasil muncul di bawah → **Enter** untuk pilih
4. Produk masuk keranjang

#### Metode 3: Scan Barcode
1. Gunakan barcode scanner
2. Scan barcode produk
3. Otomatis masuk keranjang

### Ubah Quantity

**Cara 1: Klik produk di keranjang**
- Klik jumlah (qty) → muncul dialog
- Ubah angka → **Simpan**

**Cara 2: Ketik di kotak qty**
- Klik angka qty → langsung ketik (misal: `5` → Enter)

### Hapus Item

- Klik tombol **🗑️ (sampah)** di sebelah item
- Atau ubah qty menjadi `0`

### Beri Diskon

#### Diskon Per Item
1. Klik item di keranjang
2. Klik "Diskon"
3. Masukkan nominal (misal: `5000`) atau persen (misal: `10%`)
4. **Simpan**

#### Diskon Transaksi (keseluruhan)
1. Di bawah keranjang, klik "Diskon Transaksi"
2. Masukkan nominal (misal: `10000`)
3. Diskon akan disebar proporsional ke semua item

---

## Pembayaran

### Jenis Pembayaran

POS-Sinaptex mendukung **4 metode pembayaran:**

1. **💵 Tunai** — uang cash fisik
2. **🏦 Transfer** — transfer bank (BCA, Mandiri, dll)
3. **📱 QRIS** — scan QRIS pelanggan
4. **📋 Kredit** — piutang (bayar nanti)

### Checkout Lunas (1 Metode)

**Contoh: Pembayaran Tunai**

1. Setelah semua produk di keranjang, klik **"Bayar"** (atau **F9**)

2. Muncul dialog pembayaran:
   ```
   Total: Rp 49.950
   ```

3. **Pilih metode: Tunai**

4. **Masukkan jumlah uang yang diterima:**
   - Pelanggan kasih Rp 50.000 → ketik `50000`
   - Sistem otomatis hitung kembalian: **Rp 50**

5. **Klik "Proses"**

6. Struk otomatis muncul → **Print** (atau Ctrl+P)

7. **Serahkan struk + kembalian** ke pelanggan

**Screenshot:** *(placeholder: dialog pembayaran tunai)*

### Checkout Campuran (2+ Metode)

**Contoh: Tunai + Transfer**

Total: Rp 150.000  
Pelanggan bayar:
- Tunai: Rp 100.000
- Transfer: Rp 50.000

**Langkah-langkah:**

1. Klik **"Bayar"**

2. **Pilih Tunai**
   - Masukkan: `100000`
   - Sisa: Rp 50.000

3. **Klik "+ Tambah Metode"**

4. **Pilih Transfer**
   - Masukkan: `50000`
   - Sisa: **Rp 0** ✅

5. **Klik "Proses"**

6. Print struk → selesai

**Screenshot:** *(placeholder: pembayaran campuran)*

### Pembayaran QRIS

**Langkah-langkah:**

1. Klik **"Bayar"** → Pilih **QRIS**

2. Masukkan nominal (harus **tepat**, tidak boleh lebih)
   - Contoh: Total Rp 49.950 → masukkan `49950`

3. **Klik "Proses"**

4. **Minta pelanggan scan QRIS toko** (sticker/display QRIS)

5. Tunggu notifikasi pembayaran dari gateway (misal: GoPay/OVO/Dana)

6. Transaksi akan berstatus **"Menunggu Pembayaran"**

7. **Owner** akan mengonfirmasi dari menu Riwayat (biasanya end-of-day)

**Screenshot:** *(placeholder: pembayaran QRIS)*

### Kredit (Piutang)

**Kapan pakai kredit?**
- Pelanggan langganan / trusted
- Pelanggan tidak bawa uang cukup
- Owner sudah izinkan

**Langkah-langkah:**

1. Klik **"Bayar"** → Pilih **Kredit**

2. **Pilih pelanggan** (wajib, untuk tracking piutang):
   - Cari nama pelanggan di dropdown
   - Jika belum ada, klik "Tambah Pelanggan Baru"

3. **Bisa full kredit (Rp 0 dibayar) atau DP dulu:**
   - Full kredit: kosongkan nominal → langsung "Proses"
   - DP: masukkan sebagian (misal: tunai Rp 50.000), sisanya jadi piutang

4. **Klik "Proses"**

5. Print struk → serahkan ke pelanggan dengan catatan **"BELUM LUNAS"**

**Screenshot:** *(placeholder: pembayaran kredit)*

### Overpayment (Uang Lebih)

**Aturan:**

- **Tunai:** Boleh lebih → sistem hitung kembalian
  - Contoh: Total Rp 49.950, pelanggan kasih Rp 100.000 → kembalian Rp 50.050 ✅

- **Transfer/QRIS:** TIDAK boleh lebih dari total
  - Contoh: Total Rp 50.000, transfer Rp 60.000 → **DITOLAK** ❌
  - Solusi: masukkan tepat Rp 50.000

---

## Riwayat Transaksi

### Akses Riwayat

- **Dari menu:** Dashboard → **Riwayat**
- **Shortcut:** Tidak ada (harus via menu)

### Apa yang Bisa Dilihat?

- Semua transaksi hari ini (atau filter tanggal)
- Status: Lunas / Menunggu Pembayaran / Dibayar Sebagian / Dibatalkan
- Detail: nomor transaksi, pelanggan, total, metode pembayaran

### Cetak Ulang Struk

1. Buka **Riwayat**
2. Cari transaksi (misal: SALE-00123)
3. Klik **"Cetak Struk"** (ikon printer)
4. Struk muncul → Print

**Screenshot:** *(placeholder: halaman riwayat)*

### Terima Pelunasan Piutang

**Dari Layar Kasir:**

1. Tekan **F6** (tombol "Terima Piutang")

2. Muncul dialog:
   ```
   Masukkan nomor dokumen atau pilih pelanggan
   ```

3. **Pilih cara:**
   - **Cara 1:** Masukkan nomor transaksi (misal: `SALE-00045`)
   - **Cara 2:** Pilih pelanggan dari dropdown → muncul daftar piutang belum lunas

4. Sistem tampilkan detail:
   ```
   Nomor: SALE-00045
   Pelanggan: Toko Sumber Rejeki
   Total: Rp 500.000
   Terbayar: Rp 200.000
   Sisa Piutang: Rp 300.000
   ```

5. **Masukkan jumlah yang diterima:**
   - Full: `300000` → piutang lunas ✅
   - Sebagian: `100000` → sisa piutang jadi Rp 200.000

6. **Pilih metode:** Tunai / Transfer

7. **Klik "Proses"**

8. Print bukti pelunasan

**Screenshot:** *(placeholder: terima piutang)*

---

## Tutup Shift

### Kapan Tutup Shift?

- Akhir hari (misal: jam 20:00 setelah toko tutup)
- Sebelum shift berikutnya buka (jika shift bergantian siang/malam)

### Langkah-langkah:

1. **Pastikan semua transaksi selesai** (tidak ada yang pending)

2. **Buka menu Shift** → Klik **"Tutup Shift"**

3. **Hitung uang fisik di laci:**
   - Hitung semua pecahan
   - Masukkan jumlah total (misal: Rp 1.200.000)

4. Sistem akan menampilkan:
   ```
   Kas Awal:           Rp 500.000
   Penjualan Tunai:    Rp 750.000
   Kas Keluar:         Rp 0
   ────────────────────────────────
   Kas Sistem:         Rp 1.250.000
   Kas Fisik (input):  Rp 1.200.000
   ────────────────────────────────
   Selisih:            -Rp 50.000 ⚠️
   ```

5. **Jika ada selisih:**
   - Cek ulang hitungan uang fisik
   - Cek apakah ada transaksi yang lupa dicatat
   - Tulis catatan (misal: "Kembalian salah transaksi SALE-00032")

6. **Klik "Tutup Shift"**

7. Shift ditutup → tidak bisa transaksi lagi sampai shift baru dibuka

**Screenshot:** *(placeholder: tutup shift)*

### ⚠️ Apa Arti Selisih?

| Selisih | Artinya |
|---------|---------|
| Rp 0 | **Perfect!** Kas fisik = sistem ✅ |
| + (positif) | Kas fisik **lebih** → uang dari mana? 🤔 |
| - (negatif) | Kas fisik **kurang** → uang hilang? 😱 |

**Tips menghindari selisih:**
- Hati-hati menghitung kembalian
- Jangan ambil uang pribadi dari laci (dan sebaliknya)
- Jangan lupa catat transaksi

---

## Tips & Trik

### Shortcut Keyboard

| Tombol | Aksi |
|--------|------|
| **F1** | Daftar produk (dari layar kasir) |
| **F2** | Buka layar kasir |
| **F6** | Terima pelunasan piutang |
| **F9** | Proses pembayaran (saat di layar kasir) |
| **Tab** | Fokus ke kotak cari produk |
| **Esc** | Tutup dialog |
| **Ctrl+P** | Print struk |

### Pelanggan Komplain Struk Hilang

1. Tanya nomor transaksi atau tanggal + jam
2. Buka **Riwayat**
3. Filter tanggal
4. Cari transaksi → **Cetak Ulang**

### Produk Tidak Muncul di Katalog

1. Coba cari di kotak pencarian
2. Jika tetap tidak ada → produk mungkin stok 0 atau nonaktif
3. Hubungi **Owner** untuk tambah stok atau aktifkan produk

### Transaksi Salah Input (Belum Bayar)

1. **Jika belum klik "Proses":** Hapus item dari keranjang, atau klik "Batalkan"
2. **Jika sudah bayar:** TIDAK BISA BATAL sendiri → minta **Owner** untuk void/retur

### Shift Tidak Bisa Ditutup

**Penyebab:**
- Ada transaksi QRIS yang belum dikonfirmasi owner
- Ada batch yang tertahan approval

**Solusi:**
- Tunggu owner konfirmasi
- Atau tutup besok pagi (shift boleh dibiarkan terbuka overnight jika darurat)

---

## Troubleshooting

### Error: "Tidak ada shift aktif"

**Masalah:** Anda belum buka shift  
**Solusi:** Klik "Buka Shift" dari notifikasi atau menu Shift

---

### Error: "Stok tidak cukup"

**Masalah:** Produk stok 0 atau kurang dari qty yang diminta  
**Solusi:**
1. Kurangi qty
2. Atau minta owner tambah stok (menu Produk → Edit)

---

### Error: "Pembayaran kurang"

**Masalah:** Total pembayaran < total transaksi  
**Solusi:**
1. Cek ulang nominal yang dimasukkan
2. Atau gunakan metode **Kredit** untuk sisa yang belum dibayar

---

### Error: "Gagal terhubung ke server"

**Masalah:** Engine backend mati / jaringan bermasalah  
**Solusi:**
1. Cek kabel LAN (jika pakai Mode A: LAN)
2. Hubungi IT/Owner
3. **Darurat:** Owner bisa switch ke Mode Mock (data sementara di komputer, nanti sync manual)

---

### Struk Tidak Keluar (Printer)

**Masalah:** Printer tidak nyala / kertas habis  
**Solusi:**
1. Cek printer nyala dan ada kertas
2. Cek kabel USB/LAN printer
3. **Alternatif:** Print struk via browser (Ctrl+P) → pilih printer manual
4. Atau email struk ke pelanggan (fitur belum ada di MVP, catat manual)

---

### QRIS Pelanggan Sudah Bayar tapi Status "Menunggu"

**Masalah:** Konfirmasi manual oleh owner (bukan otomatis)  
**Solusi:**
1. Pastikan pelanggan sudah transfer (cek notifikasi gateway owner)
2. Bilang ke owner untuk konfirmasi dari menu **Riwayat** → **Konfirmasi**
3. Setelah dikonfirmasi, status jadi **Lunas**

---

### Lupa Password

**Solusi:**
1. Minta owner reset via menu **Pengaturan → Kelola User**
2. Owner pilih user Anda → **Reset Password**
3. Owner kasih password baru

---

## 📞 Bantuan Lebih Lanjut

Jika masalah tidak ada di manual ini:

- **Hubungi Owner/Manager toko**
- **Hubungi Support:** (nomor HP/WA support)
- **Email:** support@sinaptex.id *(jika ada)*

---

**Terima kasih telah menggunakan POS-Sinaptex!** 🎉  
**Selamat melayani pelanggan dengan cepat dan akurat!** 💪
