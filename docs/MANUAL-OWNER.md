# Manual Pengguna Owner — POS-Sinaptex

**Versi:** 1.0 MVP  
**Tanggal:** November 2026  
**Untuk:** Pemilik Toko / Manager / Admin

---

## 📖 Daftar Isi

1. [Pengenalan](#pengenalan)
2. [Login & Dashboard](#login--dashboard)
3. [Kelola Produk](#kelola-produk)
4. [Kelola Pelanggan](#kelola-pelanggan)
5. [Kelola Supplier](#kelola-supplier)
6. [Pembelian & Stok](#pembelian--stok)
7. [Persediaan (Gudang)](#persediaan-gudang)
8. [Transaksi & Approval](#transaksi--approval)
9. [Keuangan](#keuangan)
10. [Akuntansi](#akuntansi)
11. [Laporan](#laporan)
12. [Aset Tetap](#aset-tetap)
13. [Pengaturan](#pengaturan)
14. [Troubleshooting](#troubleshooting)

---

## Pengenalan

**POS-Sinaptex** adalah sistem Point-of-Sale lengkap dengan akuntansi otomatis untuk UMKM retail. Sebagai **Owner**, Anda memiliki akses penuh ke semua fitur:

### Akses Owner (Authority Level 99)

✅ **Operasional:**
- Kelola produk, pelanggan, supplier
- Buat pembelian, stok adjustment
- Void, retur penjualan
- Konfirmasi QRIS
- Approval workflow

✅ **Keuangan:**
- Catat biaya operasional
- Transfer antar rekening kas
- Pelunasan piutang/hutang
- Kelola aset tetap

✅ **Akuntansi:**
- Lihat jurnal otomatis (penjualan, pembelian, retur, biaya)
- Neraca saldo
- Laba-rugi
- Impor saldo awal akun

✅ **Laporan:**
- Umur piutang & hutang
- Rekonsiliasi AR/AP
- Analitik kesehatan usaha
- Audit log

✅ **Admin:**
- Kelola user (tambah/ubah/hapus kasir)
- Atur kebijakan operasional
- Backup/restore database
- Kelola cabang (multi-branch)

---

## Login & Dashboard

### Login

1. Buka aplikasi POS-Sinaptex
2. Masukkan username: `pemilik` (atau custom username)
3. Masukkan password
4. Klik **"Masuk"**

**Screenshot:** *(placeholder: login owner)*

### Dashboard

Setelah login, Anda masuk ke **Dashboard** dengan KPI real-time:

```
┌─────────────────────────────────────────────────────┐
│ KESEHATAN USAHA                                     │
│ Rasio Lancar: 2.5x    Modal Kerja: Rp 50.000.000  │
│ Rasio Kas: 1.8x       Kas & Setara: Rp 30.000.000 │
└─────────────────────────────────────────────────────┘

┌────────────────┬────────────────┬────────────────┐
│ Penjualan      │ Pembelian      │ Piutang        │
│ Hari Ini       │ Bulan Ini      │ Belum Lunas    │
│ Rp 5.000.000   │ Rp 20.000.000  │ Rp 2.500.000   │
└────────────────┴────────────────┴────────────────┘
```

**Screenshot:** *(placeholder: dashboard owner)*

---

## Kelola Produk

### Akses Menu

Dashboard → **Produk**

### Daftar Produk

Tampilan tabel dengan kolom:
- Kode (SKU)
- Nama
- Kategori
- Satuan
- Harga Jual
- Stok (total semua gudang)
- Status (Aktif/Nonaktif)

### Tambah Produk Baru

1. Klik **"+ Tambah Produk"**

2. **Isi form:**
   - **Kode:** SKU unik (misal: `BRG-001`)
   - **Nama:** Nama produk (misal: `Susu Ultra 1L`)
   - **Kategori:** Pilih dari dropdown (Makanan, Minuman, dll)
   - **Satuan:** `pcs`, `box`, `kg`, dll
   - **Harga Beli:** HPP (misal: Rp 10.000)
   - **Harga Jual:** Harga ke pelanggan (misal: Rp 15.000)
   - **Stok Awal:** (opsional, atau input via Penyesuaian Stok)
   - **Barcode:** (opsional, untuk scanner)

3. **Klik "Simpan"**

**Screenshot:** *(placeholder: form tambah produk)*

### Edit Produk

1. Cari produk di tabel
2. Klik **ikon pensil (✏️)** di kolom Aksi
3. Ubah data → **Simpan**

### Nonaktifkan Produk

**Kapan pakai?**
- Produk sudah tidak dijual lagi
- Tapi tetap perlu di sistem (untuk riwayat transaksi lama)

**Langkah:**
1. Klik **"Nonaktifkan"** di kolom Aksi
2. Konfirmasi → produk status jadi **Nonaktif**
3. Produk tidak muncul di katalog kasir

### Impor Produk dari Excel/CSV

**Format CSV:**
```csv
kode,nama,kategori,satuan,hargaBeli,hargaJual,barcode
BRG-001,Susu Ultra 1L,Minuman,pcs,10000,15000,8992761001234
BRG-002,Kopi Kapal Api,Minuman,pcs,12000,18000,8992753001234
```

**Langkah:**
1. Buka menu **Produk**
2. Klik **"Impor"**
3. Pilih file CSV
4. **Upload**
5. Sistem validasi:
   - Kode duplikat → ditolak
   - Harga beli > harga jual → warning
6. Jika valid → semua produk ditulis (all-or-nothing)

**Screenshot:** *(placeholder: impor produk)*

---

## Kelola Pelanggan

### Akses Menu

Dashboard → **Produk** → Tab **Pelanggan**

### Daftar Pelanggan

Tabel dengan kolom:
- Kode
- Nama
- Telepon
- Alamat
- Total Piutang

### Tambah Pelanggan

1. Klik **"+ Tambah Pelanggan"**
2. **Isi:**
   - Nama (wajib)
   - Telepon (opsional)
   - Alamat (opsional)
3. **Simpan**

**Kode otomatis di-generate** (misal: `CUST-00001`).

### Edit/Nonaktifkan

Sama seperti produk (ikon pensil/nonaktifkan).

### Impor Pelanggan

**Format CSV:**
```csv
nama,telepon,alamat
Toko Sumber Rejeki,08123456789,"Jl. Merdeka No. 10"
CV Maju Jaya,08129876543,"Jl. Pahlawan No. 5"
```

**Langkah:** Sama seperti impor produk.

---

## Kelola Supplier

### Akses Menu

Dashboard → **Supplier**

### Daftar Supplier

Tabel:
- Kode
- Nama
- Kontak
- Alamat
- Status

### Tambah Supplier

1. Klik **"+ Tambah Supplier"**
2. Isi nama, kontak, alamat
3. **Simpan** → kode auto-generated

### ⚠️ Penting: Edit Supplier

**Anda TIDAK BISA mengubah kode/nama supplier** setelah dibuat (by design engine).

**Alasan:** Menjaga integritas nama supplier pada faktur lama.

**Solusi jika salah input:**
- Nonaktifkan supplier lama
- Buat supplier baru dengan data yang benar

---

## Pembelian & Stok

### Buat Faktur Pembelian

**Akses:** Dashboard → **Pembelian**

**Langkah:**

1. Klik **"+ Buat Pembelian"**

2. **Isi header:**
   - **Tanggal:** Tanggal faktur (default: hari ini)
   - **Supplier:** Pilih dari dropdown (atau kosongkan jika pembelian pasar)
   - **Metode Bayar:** Tunai / Transfer / Hutang

3. **Tambah item:**
   - Klik **"+ Tambah Item"**
   - Pilih produk
   - Masukkan qty, harga beli
   - Ulangi untuk item lain

4. **Review total:**
   ```
   Subtotal: Rp 1.000.000
   Pajak:    Rp 0 (pembelian tidak kena PPN di sistem)
   Total:    Rp 1.000.000
   ```

5. **Klik "Simpan"**

6. Sistem:
   - Tulis jurnal pembelian (Debit: Persediaan, Kredit: Kas/Hutang)
   - Tambah stok produk
   - Buat dokumen nomor `PURCHASE-00001`

**Screenshot:** *(placeholder: form pembelian)*

### Metode Bayar Pembelian

#### Tunai
- Uang langsung keluar dari kas
- Jurnal: Debit Persediaan, Kredit Kas

#### Transfer
- Uang keluar dari bank
- Jurnal: Debit Persediaan, Kredit Bank

#### Hutang
- **Wajib isi Supplier** (untuk tracking hutang per supplier)
- Jurnal: Debit Persediaan, Kredit Hutang Usaha
- Bayar nanti via menu **Keuangan → Pelunasan Hutang**

#### DP (Down Payment)
- Bayar sebagian (misal: tunai Rp 500.000)
- Sisanya hutang (Rp 500.000)

### Retur Pembelian

**Kapan pakai?**
- Barang rusak/cacat
- Salah kirim
- Kelebihan qty

**Langkah:**

1. Buka **Riwayat Pembelian**
2. Cari faktur pembelian (misal: `PURCHASE-00045`)
3. Klik **"Retur"**

4. **Pilih item + qty retur:**
   - Misal: Susu 1L → retur 5 pcs (dari 10 pcs yang dibeli)

5. **Masukkan alasan:**
   - "Kemasan rusak"
   - "Kadaluarsa"

6. **Klik "Proses Retur"**

7. Sistem:
   - Kurangi stok (5 pcs dikembalikan)
   - Jurnal pembalik: Debit Kas/Hutang, Kredit Persediaan
   - Buat dokumen retur `PR-00001`

**Screenshot:** *(placeholder: retur pembelian)*

### Pelunasan Hutang Pembelian

**Akses:** Dashboard → **Keuangan** → **Pelunasan Hutang**

**Langkah:**

1. **Pilih supplier** dari dropdown
2. Muncul daftar faktur pembelian belum lunas:
   ```
   PURCHASE-00045
   Total: Rp 1.000.000
   Terbayar: Rp 500.000
   Sisa: Rp 500.000
   ```

3. **Klik "Bayar"**

4. Masukkan jumlah bayar:
   - Full: `500000` → hutang lunas ✅
   - Sebagian: `200000` → sisa hutang Rp 300.000

5. **Pilih metode:** Tunai / Transfer

6. **Proses**

7. Jurnal: Debit Hutang Usaha, Kredit Kas

---

## Persediaan (Gudang)

### Kelola Gudang

**Akses:** Dashboard → **Persediaan** → **Gudang**

**Default:** Sistem punya 1 gudang "Toko Utama" (tidak bisa dihapus).

#### Tambah Gudang Baru

1. Klik **"+ Tambah Gudang"**
2. Isi:
   - Nama (misal: "Gudang Cabang A")
   - Kode (misal: `GD-A`)
   - Lokasi (opsional)
3. **Simpan**

#### Nonaktifkan Gudang

- Gudang nonaktif tidak bisa dipakai transaksi baru
- Tapi data historis tetap ada

### Stok Per Gudang

**Akses:** Dashboard → **Persediaan** → **Stok**

**Tampilan:**
```
┌────────────────┬────────────┬────────────┐
│ Produk         │ Toko Utama │ Gudang A   │
├────────────────┼────────────┼────────────┤
│ Susu Ultra 1L  │ 50 pcs     │ 20 pcs     │
│ Kopi Kapal Api │ 100 pcs    │ 0 pcs      │
└────────────────┴────────────┴────────────┘
```

Filter: Pilih gudang → tampilkan stok gudang itu saja.

### Penyesuaian Stok

**Kapan pakai?**
- Stok fisik ≠ stok sistem (selisih opname)
- Barang rusak/hilang/kadaluarsa
- Koreksi input salah

**Langkah:**

1. **Akses:** Persediaan → **Penyesuaian**

2. Klik **"+ Buat Penyesuaian"**

3. **Isi:**
   - **Gudang:** Pilih gudang
   - **Produk:** Pilih produk
   - **Jenis:**
     - **Tambah** (+): Stok bertambah (misal: temuan barang)
     - **Kurang** (-): Stok berkurang (rusak/hilang)
   - **Qty:** Jumlah perubahan
   - **Alasan:** Wajib (misal: "Barang rusak saat bongkar")

4. **Simpan**

5. Jurnal:
   - Tambah stok: Debit Persediaan, Kredit Biaya/Koreksi
   - Kurang stok: Debit Biaya, Kredit Persediaan

**Screenshot:** *(placeholder: penyesuaian stok)*

### Transfer Antar Gudang

**Skenario:** Pindahkan barang dari Toko Utama ke Gudang A

**Langkah:**

1. **Akses:** Persediaan → **Transfer**

2. Klik **"+ Buat Transfer"**

3. **Isi:**
   - **Dari:** Toko Utama
   - **Ke:** Gudang A
   - **Produk:** Susu Ultra 1L
   - **Qty:** 20 pcs

4. **Simpan**

5. Sistem:
   - Kurangi stok Toko Utama: -20 pcs
   - Tambah stok Gudang A: +20 pcs
   - Jurnal: (tidak ada, karena tidak ubah nilai total persediaan)

### Opname Stok

**Kapan pakai?**
- Akhir bulan / akhir tahun (stock taking)
- Cek selisih stok fisik vs sistem untuk semua produk

**Langkah:**

1. **Akses:** Persediaan → **Opname**

2. Klik **"+ Buat Opname"**

3. **Pilih gudang** (misal: Toko Utama)

4. Sistem generate daftar **semua produk** dengan stok sistem saat ini:
   ```
   Susu Ultra 1L: Stok Sistem = 50 pcs
   Kopi Kapal Api: Stok Sistem = 100 pcs
   ```

5. **Hitung stok fisik** (manual, pakai kertas/Excel):
   - Susu: 48 pcs (fisik)
   - Kopi: 102 pcs (fisik)

6. **Input stok fisik** ke form opname

7. **Klik "Complete Opname"**

8. Sistem hitung selisih:
   - Susu: -2 pcs → buat penyesuaian otomatis (kurang)
   - Kopi: +2 pcs → buat penyesuaian otomatis (tambah)

9. Stok sistem = stok fisik ✅

**Screenshot:** *(placeholder: opname stok)*

### Kartu Stok (Stock Movements)

**Akses:** Persediaan → **Kartu Stok**

**Fungsi:** Lihat riwayat keluar-masuk stok produk tertentu.

**Langkah:**
1. Pilih **produk** (misal: Susu Ultra 1L)
2. Pilih **gudang** (atau semua gudang)
3. Pilih **periode** (dari tanggal - sampai tanggal)

**Tampilan:**
```
┌────────────┬──────────────┬────┬────────┬────────┬────────┐
│ Tanggal    │ Jenis        │ Qty│ Masuk  │ Keluar │ Saldo  │
├────────────┼──────────────┼────┼────────┼────────┼────────┤
│ 2026-11-01 │ Saldo Awal   │    │        │        │ 50     │
│ 2026-11-05 │ Pembelian    │ 20 │ 20     │        │ 70     │
│ 2026-11-07 │ Penjualan    │ 10 │        │ 10     │ 60     │
│ 2026-11-10 │ Penyesuaian  │ -2 │        │ 2      │ 58     │
└────────────┴──────────────┴────┴────────┴────────┴────────┘
```

**Screenshot:** *(placeholder: kartu stok)*

### Nilai Persediaan

**Akses:** Persediaan → **Nilai Persediaan**

**Fungsi:** Lihat nilai rupiah stok (qty × HPP rata-rata).

**Tampilan:**
```
Gudang: Toko Utama

┌────────────────┬──────┬─────────┬────────────────┐
│ Produk         │ Qty  │ HPP Avg │ Nilai Total    │
├────────────────┼──────┼─────────┼────────────────┤
│ Susu Ultra 1L  │ 58   │ 10.000  │ Rp 580.000     │
│ Kopi Kapal Api │ 102  │ 12.000  │ Rp 1.224.000   │
├────────────────┴──────┴─────────┼────────────────┤
│ TOTAL PERSEDIAAN                │ Rp 1.804.000   │
└─────────────────────────────────┴────────────────┘
```

**Gunakan untuk:**
- Laporan neraca (akun Persediaan)
- Analisis modal kerja

---

## Transaksi & Approval

### Void Transaksi

**Kapan pakai?**
- Transaksi salah input (item/harga/pelanggan)
- Transaksi palsu/test

**Langkah:**

1. **Akses:** Dashboard → **Riwayat**
2. Cari transaksi (misal: `SALE-00123`)
3. Klik **"Void"**
4. **Konfirmasi** → transaksi dibatalkan

**Aturan:**
- **Mode mock:** Void selalu berhasil
- **Mode live:** 
  - Transaksi status `DRAFT` / `SUBMITTED` → void langsung
  - Transaksi status `POSTED` → **tidak bisa di-void**, sistem otomatis fallback ke **Retur Penuh**

**Jurnal void:**
- Pembalik sempurna dari jurnal penjualan
- Stok dikembalikan
- Piutang dihapus (jika kredit)

### Retur Penjualan

**Kapan pakai?**
- Pelanggan komplain barang rusak
- Pelanggan tidak puas
- Salah kirim barang

**Langkah:**

1. **Akses:** Riwayat → cari transaksi → **"Retur"**

2. **Pilih item + qty retur:**
   - Bisa retur sebagian (misal: 2 dari 5 pcs)
   - Atau retur full (semua item)

3. **Masukkan alasan:**
   - "Barang rusak"
   - "Pelanggan tidak cocok"

4. **Klik "Proses Retur"**

5. Sistem:
   - Kembalikan stok
   - Jurnal pembalik proporsional
   - Hitung refund = neto + pajak yang dibayar pelanggan
   - Buat dokumen retur `SR-00001`

6. **Kembalikan uang** ke pelanggan (tunai atau transfer)

**Screenshot:** *(placeholder: retur penjualan)*

### Konfirmasi QRIS

**Kapan pakai?**
- Pelanggan bayar QRIS, tapi status masih "Menunggu Pembayaran"
- Anda sudah cek gateway (GoPay/OVO/Dana) → uang masuk ✅

**Langkah:**

1. **Akses:** Riwayat → Filter "Menunggu Pembayaran"

2. Cari transaksi QRIS (misal: `SALE-00089`)

3. **Verifikasi:**
   - Cek notifikasi gateway (WA/email dari Midtrans/OVO/dll)
   - Pastikan uang masuk ke akun QRIS toko

4. Klik **"Konfirmasi"**

5. Sistem (mode live):
   - Transfer dana dari akun gateway (kode 1130) ke bank (kode 1111)
   - Jurnal: Debit Bank, Kredit Akun Gateway
   - Status transaksi → **Lunas** ✅

**Screenshot:** *(placeholder: konfirmasi QRIS)*

### Approval Workflow

**Akses:** Dashboard → **Persetujuan**

**Fungsi:** Batch kasir yang tertahan aturan approval (misal: transaksi > Rp 500.000).

#### Setup Aturan Approval

1. **Akses:** Dashboard → **Approval Rules**

2. Klik **"+ Tambah Aturan"**

3. **Isi:**
   - **Jenis Transaksi:** Penjualan / Transfer Kas / Pembelian
   - **Nominal Minimum:** Misal Rp 500.000
   - **Approver Authority:** 99 (owner) / 50 (manager)

4. **Simpan**

**Contoh aturan:**
```
Penjualan > Rp 500.000 → butuh approval owner
Transfer Kas > Rp 1.000.000 → butuh approval owner
```

#### Approve Transaksi

1. **Akses:** Dashboard → **Persetujuan**

2. Tampil **antrean approval:**
   ```
   SALE-00090 | Rp 750.000 | kasir1 | 2026-11-12 10:30
   TRANSFER-00015 | Rp 2.000.000 | kasir2 | 2026-11-12 14:00
   ```

3. **Klik transaksi** → lihat detail

4. **Pilih aksi:**
   - **Approve** → transaksi di-post, status jadi `POSTED` ✅
   - **Reject** → transaksi dibatalkan (void)

5. Setelah approve:
   - Batch di-post
   - Kasir bisa lihat status "Lunas" di Riwayat

**Screenshot:** *(placeholder: approval queue)*

---

## Keuangan

### Akun Kas (Cash Accounts)

**Akses:** Dashboard → **Keuangan** → **Akun Kas**

**Daftar akun kas:**
- **Kas (1121)** — uang tunai laci
- **Bank (1111)** — rekening bank (BCA/Mandiri/dll)
- **Gateway QRIS (1130)** — akun penampung QRIS (sebelum dikonfirmasi ke bank)

**Tampilan:**
```
┌────────┬──────────────┬────────────────┐
│ Kode   │ Nama         │ Saldo          │
├────────┼──────────────┼────────────────┤
│ 1121   │ Kas          │ Rp 5.000.000   │
│ 1111   │ Bank BCA     │ Rp 20.000.000  │
│ 1130   │ Gateway QRIS │ Rp 500.000     │
└────────┴──────────────┴────────────────┘
```

### Transfer Antar Kas

**Skenario:** Setor tunai ke bank (dari laci ke rekening).

**Langkah:**

1. **Akses:** Keuangan → **Transfer Kas**

2. Klik **"+ Buat Transfer"**

3. **Isi:**
   - **Dari:** Kas (1121)
   - **Ke:** Bank BCA (1111)
   - **Jumlah:** Rp 2.000.000
   - **Tanggal:** Hari ini
   - **Deskripsi:** "Setor tunai ke bank"

4. **Simpan**

5. Jurnal:
   - Debit: Bank BCA (+Rp 2.000.000)
   - Kredit: Kas (-Rp 2.000.000)

**Screenshot:** *(placeholder: transfer kas)*

### Catat Biaya Operasional

**Akses:** Keuangan → **Biaya**

**Contoh biaya:**
- Listrik, air, telepon
- Gaji karyawan
- Sewa toko
- Transportasi

**Langkah:**

1. Klik **"+ Catat Biaya"**

2. **Isi:**
   - **Tanggal:** Tanggal bayar
   - **Jenis:** Pilih dari list (atau custom)
   - **Nominal:** Misal Rp 500.000
   - **Metode:** Tunai / Transfer
   - **Catatan:** "Bayar listrik bulan November"

3. **Simpan**

4. Jurnal:
   - Debit: Biaya Operasional (6900)
   - Kredit: Kas / Bank

**Screenshot:** *(placeholder: catat biaya)*

### Pelunasan Piutang

**Akses:** Keuangan → **Pelunasan Piutang**

*(Sudah dijelaskan di bagian Kasir manual, tapi owner juga bisa akses dari menu ini)*

**Langkah:**
1. Pilih pelanggan → muncul daftar piutang
2. Pilih dokumen → input jumlah bayar
3. Proses → jurnal: Debit Kas, Kredit Piutang

---

## Akuntansi

### Jurnal Otomatis

**Akses:** Dashboard → **Akuntansi** → **Jurnal**

**Fungsi:** Lihat semua entry jurnal yang ditulis otomatis oleh sistem.

**Tampilan:**
```
┌────────────┬────────────┬──────────────┬────────┬────────┐
│ Tanggal    │ No. Dok    │ Deskripsi    │ Debit  │ Kredit │
├────────────┼────────────┼──────────────┼────────┼────────┤
│ 2026-11-12 │ SALE-00123 │ Kas          │ 50.000 │        │
│            │            │ Pendapatan   │        │ 45.000 │
│            │            │ Pajak        │        │ 5.000  │
│            │            │ HPP          │ 30.000 │        │
│            │            │ Persediaan   │        │ 30.000 │
└────────────┴────────────┴──────────────┴────────┴────────┘
```

**Filter:**
- Tanggal (dari - sampai)
- Jenis transaksi (penjualan, pembelian, biaya, transfer)

**Screenshot:** *(placeholder: jurnal)*

### Neraca Saldo (Trial Balance)

**Akses:** Akuntansi → **Neraca Saldo**

**Fungsi:** Lihat saldo semua akun (aset, liabilitas, ekuitas, pendapatan, biaya).

**Tampilan:**
```
Periode: 2026-01-01 s/d 2026-11-12

┌──────┬────────────────┬─────────────┬─────────┬─────────┬──────────────┐
│ Kode │ Nama Akun      │ Saldo Awal  │ Debit   │ Kredit  │ Saldo Akhir  │
├──────┼────────────────┼─────────────┼─────────┼─────────┼──────────────┤
│ 1121 │ Kas            │ 1.000.000   │ 5.000K  │ 2.000K  │ 4.000.000    │
│ 1111 │ Bank           │ 10.000.000  │ 2.000K  │ 500K    │ 11.500.000   │
│ 1200 │ Piutang        │ 0           │ 1.000K  │ 500K    │ 500.000      │
│ 1300 │ Persediaan     │ 5.000.000   │ 3.000K  │ 2.500K  │ 5.500.000    │
│ ...  │                │             │         │         │              │
│ 4000 │ Pendapatan     │ 0           │         │ 10.000K │ -10.000.000  │
│ 5000 │ HPP            │ 0           │ 6.000K  │         │ 6.000.000    │
│ 6900 │ Biaya Operasi  │ 0           │ 1.000K  │         │ 1.000.000    │
└──────┴────────────────┴─────────────┴─────────┴─────────┴──────────────┘

TOTAL DEBIT:  Rp 18.000.000
TOTAL KREDIT: Rp 18.000.000  ✅ SEIMBANG
```

**Screenshot:** *(placeholder: neraca saldo)*

### Laba-Rugi (P&L)

**Akses:** Akuntansi → **Laba-Rugi**

**Fungsi:** Hitung profit bulan/tahun berjalan.

**Tampilan:**
```
Periode: November 2026

PENDAPATAN
  Penjualan                    Rp 10.000.000

HARGA POKOK PENJUALAN
  HPP                          Rp 6.000.000
                               ──────────────
Laba Kotor                     Rp 4.000.000

BIAYA OPERASIONAL
  Biaya Operasional            Rp 1.000.000
  Biaya Lain-lain              Rp 200.000
                               ──────────────
Total Biaya                    Rp 1.200.000
                               ──────────────
LABA BERSIH                    Rp 2.800.000  ✅
```

**Screenshot:** *(placeholder: laba-rugi)*

### Impor Saldo Awal

**Kapan pakai?**
- Awal pakai sistem (migrasi dari Excel/app lama)
- Isi saldo awal akun kas, bank, piutang, hutang, modal

**Format CSV:**
```csv
accountCode,openingBalance
1121,1000000
1111,10000000
1200,500000
2101,-2000000
3001,9500000
```

**Langkah:**
1. **Akses:** Akuntansi → **Impor Saldo Awal**
2. Upload CSV
3. Sistem validasi → tulis opening balance
4. Cek neraca saldo → saldo awal muncul ✅

---

## Laporan

### Umur Piutang (AR Aging)

**Akses:** Dashboard → **Laporan** → **Umur Piutang**

**Fungsi:** Lihat piutang pelanggan yang belum lunas, dikelompokkan berdasarkan umur.

**Tampilan:**
```
Per Tanggal: 2026-11-12

┌───────────────────┬────────────┬──────────┬──────────┬──────────┐
│ Pelanggan         │ < 30 hari  │ 31-60    │ > 60     │ Total    │
├───────────────────┼────────────┼──────────┼──────────┼──────────┤
│ Toko Sumber Rejeki│ 300.000    │ 200.000  │ 0        │ 500.000  │
│ CV Maju Jaya      │ 0          │ 0        │ 1.000.000│ 1.000.000│
└───────────────────┴────────────┴──────────┴──────────┴──────────┘
TOTAL PIUTANG:                                          1.500.000
```

**Gunakan untuk:**
- Follow-up pelanggan yang telat bayar (> 60 hari)
- Analisis cash flow

### Umur Hutang (AP Aging)

**Akses:** Laporan → **Umur Hutang**

*(Sama seperti AR Aging, tapi untuk hutang ke supplier)*

### Rekonsiliasi Piutang/Hutang

**Akses:** Laporan → **Rekonsiliasi AR/AP**

**Fungsi:** Cocokkan saldo piutang/hutang di neraca vs saldo per dokumen.

**Contoh output:**
```
Piutang per Neraca:        Rp 1.500.000
Piutang per Dokumen:       Rp 1.500.000
Selisih:                   Rp 0  ✅
```

Jika ada selisih → ada bug/kesalahan entry, perlu investigasi.

### Analitik Kesehatan Usaha

**Akses:** Dashboard (widget) atau Laporan → **Kesehatan Usaha**

**KPI:**

1. **Rasio Lancar** (Current Ratio)
   - Formula: Aset Lancar / Liabilitas Lancar
   - Sehat: > 1.5x
   - Contoh: 2.5x = Rp 25jt aset lancar / Rp 10jt liabilitas

2. **Rasio Kas** (Cash Ratio)
   - Formula: (Kas + Bank) / Liabilitas Lancar
   - Sehat: > 1.0x

3. **Modal Kerja** (Working Capital)
   - Formula: Aset Lancar - Liabilitas Lancar
   - Contoh: Rp 15jt

**Screenshot:** *(placeholder: kesehatan usaha)*

---

## Aset Tetap

**Akses:** Dashboard → **Aset Tetap**

### Daftar Aset

Tabel:
- Kode
- Nama
- Kategori (Kendaraan, Peralatan, Bangunan)
- Tanggal Perolehan
- Harga Perolehan
- Metode Penyusutan
- Nilai Buku (sisa)
- Status (Aktif/Nonaktif)

### Tambah Aset Tetap

1. Klik **"+ Tambah Aset"**

2. **Isi:**
   - **Nama:** Misal "Motor Antar Barang"
   - **Kategori:** Kendaraan
   - **Tanggal Perolehan:** 2026-01-15
   - **Harga Perolehan:** Rp 15.000.000
   - **Metode Penyusutan:**
     - **Garis Lurus** (Straight-Line)
     - **Saldo Menurun** (Declining Balance)
   - **Umur Ekonomis:** 5 tahun
   - **Nilai Residu:** Rp 3.000.000 (nilai jual setelah 5 tahun)

3. **Simpan**

**Screenshot:** *(placeholder: form aset tetap)*

### Hitung Penyusutan

**Manual (per aset, per periode):**

1. Klik aset → **"Hitung Penyusutan"**
2. Pilih periode (misal: November 2026)
3. Sistem hitung:
   - Garis lurus: `(15.000.000 - 3.000.000) / (5 × 12) = Rp 200.000/bulan`
4. **Preview** nilai buku baru

**Bulk (semua aset, periode bulanan):**

1. **Akses:** Aset Tetap → **Posting Penyusutan**
2. Pilih **bulan** (misal: November 2026)
3. Sistem hitung semua aset aktif
4. **Posting** → jurnal ditulis:
   - Debit: Biaya Penyusutan
   - Kredit: Akumulasi Penyusutan

**Screenshot:** *(placeholder: posting penyusutan)*

### Mutasi Aset

**Jenis mutasi:**
- **SALE** — jual aset (aset jadi nonaktif)
- **DISPOSAL** — buang/rusak (aset nonaktif)
- **TRANSFER** — pindah lokasi (aset tetap aktif)

**Langkah (contoh: Jual Motor):**

1. Klik aset → **"Mutasi"**
2. Pilih **SALE**
3. **Isi:**
   - Tanggal jual: 2026-11-12
   - Harga jual: Rp 10.000.000
   - Lokasi tujuan: (kosongkan untuk SALE/DISPOSAL)
4. **Simpan**
5. Status aset → **Nonaktif** ✅

**Catatan:** Mutasi **tidak** menulis jurnal otomatis (by design, karena modul ini tidak pernah jurnal perolehan). Owner catat manual via biaya/pendapatan lain-lain jika perlu.

### Laporan Register Aset

**Akses:** Aset Tetap → **Laporan Register**

**Filter:** Periode (misal: November 2026)

**Tampilan:**
```
┌────────┬──────────────┬────────────┬────────────┬──────────┐
│ Kode   │ Nama         │ Perolehan  │ Penyusutan │ Nilai Buku│
├────────┼──────────────┼────────────┼────────────┼──────────┤
│ FA-001 │ Motor Antar  │ 15.000.000 │ 2.000.000  │ 13.000.000│
│ FA-002 │ Etalase Toko │ 5.000.000  │ 500.000    │ 4.500.000 │
└────────┴──────────────┴────────────┴────────────┴──────────┘
TOTAL ASET TETAP:                                  17.500.000
```

---

## Pengaturan

**Akses:** Dashboard → **Pengaturan**

### Profil Toko

**Tab:** Profil Toko

**Isi:**
- **Nama Toko:** (misal: Toko Sumber Rejeki)
- **Alamat:** Jl. Merdeka No. 10
- **Telepon:** 021-12345678
- **Email:** (opsional)
- **NPWP:** (opsional)

**Logo:**
- Klik **"Upload Logo"**
- Pilih gambar (PNG/JPG, max 2MB)
- Logo muncul di struk + faktur PDF

**Screenshot:** *(placeholder: profil toko)*

### Operasional

**Tab:** Operasional

**Isi:**
- **Saldo Awal Shift:** Default kas awal saat buka shift (misal: Rp 500.000)
- **Izinkan Kredit:** Toggle ON/OFF
  - ON: Kasir bisa transaksi piutang
  - OFF: Semua transaksi wajib lunas
- **Pajak Default:** PPN 11% (bisa ubah jika pajak berubah)

**Screenshot:** *(placeholder: kebijakan operasional)*

### Kelola User

**Tab:** Kelola User

**Daftar user:**
```
┌──────────┬────────┬──────────────────┬────────┐
│ Username │ Nama   │ Email            │ Role   │
├──────────┼────────┼──────────────────┼────────┤
│ pemilik  │ Owner  │ owner@toko.com   │ Owner  │
│ kasir1   │ Budi   │ budi@toko.com    │ Kasir  │
│ kasir2   │ Siti   │ siti@toko.com    │ Kasir  │
└──────────┴────────┴──────────────────┴────────┘
```

#### Tambah User Kasir

1. Klik **"+ Tambah User"**
2. **Isi:**
   - Username: `kasir3`
   - Password: (password awal, kasir bisa ganti nanti)
   - Nama: `Andi`
   - Email: (opsional)
   - Role: **Kasir** (authority level 2)
3. **Simpan**

**Screenshot:** *(placeholder: tambah user)*

#### Edit User

- Klik **ikon pensil** → ubah nama/email/role
- **Reset Password:** Klik "Reset" → masukkan password baru

#### Hapus User

- Klik **ikon sampah** → konfirmasi → user dihapus
- **Hati-hati:** User yang sudah transaksi tidak bisa dihapus (untuk audit trail)

### Backup & Restore

**Tab:** Backup

#### Buat Backup

1. Klik **"Buat Backup"**
2. Sistem export database ke file `.db` atau `.bak`
3. File tersimpan di folder:
   - **Live mode:** `backend/src/AccountingEngine.Api/backups/`
   - **Mock mode:** (tidak ada backup, karena in-memory)

#### Daftar Backup

Tabel:
```
┌─────────────────────────┬────────────┬──────────┐
│ Nama File               │ Tanggal    │ Ukuran   │
├─────────────────────────┼────────────┼──────────┤
│ backup_20261112_080000  │ 2026-11-12 │ 5.2 MB   │
│ backup_20261111_200000  │ 2026-11-11 │ 5.0 MB   │
└─────────────────────────┴────────────┴──────────┘
```

#### Download Backup

- Klik **ikon download** → file di-download ke komputer

#### Restore Backup

1. Klik **"Restore"**
2. Pilih file backup dari list
3. **PERINGATAN:**
   ```
   ⚠️ Restore akan MENGGANTI database saat ini!
   Semua data setelah backup ini akan HILANG!
   Yakin melanjutkan?
   ```
4. Konfirmasi → database di-restore

**Screenshot:** *(placeholder: backup restore)*

### Kelola Cabang

**Tab:** Cabang

**Fungsi:** Multi-branch (jika toko punya cabang).

**Daftar cabang:**
```
┌─────────┬──────────────┬─────────────────────┬────────┐
│ Kode    │ Nama         │ Alamat              │ Status │
├─────────┼──────────────┼─────────────────────┼────────┤
│ MAIN    │ Toko Utama   │ Jl. Merdeka No. 10  │ Aktif  │
│ BRANCH-A│ Cabang A     │ Jl. Pahlawan No. 5  │ Aktif  │
└─────────┴──────────────┴─────────────────────┴────────┘
```

#### Tambah Cabang

1. Klik **"+ Tambah Cabang"**
2. Isi nama, kode, alamat
3. **Simpan**

**Catatan:** POS belum kirim `X-Branch-Id` ke engine, jadi stok masih terpusat (tidak per cabang). Gudang dipakai untuk pemisahan stok fisik.

### Audit Log

**Tab:** Audit

**Fungsi:** Jejak aktivitas user (siapa, kapan, aksi apa).

**Tampilan:**
```
┌─────────────────────┬──────────┬─────────────┬────────────────┐
│ Tanggal             │ User     │ Aksi        │ Detail         │
├─────────────────────┼──────────┼─────────────┼────────────────┤
│ 2026-11-12 10:30:15 │ kasir1   │ SALE_CREATE │ SALE-00123     │
│ 2026-11-12 10:35:20 │ pemilik  │ VOID        │ SALE-00120     │
│ 2026-11-12 14:00:00 │ pemilik  │ PRODUCT_EDIT│ BRG-001 (Susu) │
└─────────────────────┴──────────┴─────────────┴────────────────┘
```

**Filter:**
- User
- Aksi (SALE_CREATE, VOID, PRODUCT_EDIT, dll)
- Tanggal

**Screenshot:** *(placeholder: audit log)*

---

## Troubleshooting

### Error: "Pembayaran kurang" (padahal uang cukup)

**Penyebab:** Bug pembulatan (sudah diperbaiki di MVP 2026-11-12).

**Solusi:**
- Update ke versi terbaru
- Atau coba pembayaran campuran (pisah tunai + transfer)

---

### Transaksi Tidak Muncul di Riwayat

**Penyebab:**
1. Transaksi belum di-post (tertahan approval)
2. Shift belum ditutup (tapi seharusnya tetap muncul)

**Solusi:**
- Cek menu **Persetujuan** → approve
- Atau cek status transaksi (SUBMITTED vs POSTED)

---

### Jurnal Tidak Seimbang (Debit ≠ Kredit)

**Penyebab:** Bug serius (seharusnya tidak pernah terjadi di MVP 2026-11-12).

**Solusi:**
1. Cek di menu **Akuntansi → Jurnal** → filter transaksi bermasalah
2. Catat nomor dokumen
3. Hubungi support dengan screenshot jurnal
4. **Jangan void/retur** dulu (untuk investigasi)

---

### Stok Negatif

**Penyebab:** Bukan bug! Engine membolehkan stok negatif (kasir jual dulu, restok belakangan).

**Solusi:**
- Buat pembelian untuk tambah stok
- Atau penyesuaian stok (tambah)

---

### Database Corrupt / Error 500

**Penyebab:** Engine crash, disk penuh, atau bug serius.

**Solusi:**
1. Stop engine (`Ctrl+C` di terminal backend)
2. **Restore backup terakhir** (menu Pengaturan → Backup → Restore)
3. Restart engine
4. Jika gagal → hubungi support

---

### Mode Live Tidak Bisa Konek

**Penyebab:**
- Engine backend mati
- Firewall block port 5121
- Salah konfigurasi `.env.local`

**Solusi:**
1. Cek engine running:
   ```powershell
   netstat -an | findstr 5121
   ```
2. Cek firewall:
   - Windows Firewall → Allow port 5121
3. Cek `.env.local`:
   ```env
   NEXT_PUBLIC_API_MODE=live
   NEXT_PUBLIC_API_BASE_URL=http://localhost:5121
   ```
4. Restart engine:
   ```powershell
   cd backend
   dotnet run --project src/AccountingEngine.Api
   ```

---

### Lupa Password Owner

**Solusi:**
1. **Jika masih bisa login kasir:**
   - Tidak bisa reset (kasir tidak punya akses)
   - Hubungi support untuk reset manual

2. **Jika tidak ada akun lain:**
   - Stop engine
   - Edit database langsung (SQL):
     ```sql
     UPDATE Users SET PasswordHash = '<hash-baru>' WHERE Username = 'pemilik';
     ```
   - Atau bootstrap ulang (tapi data hilang!)

**Pencegahan:** Buat akun owner cadangan (username `admin2`, role owner).

---

## 📞 Support

**Jika masalah tidak ada di manual:**

- **Support Email:** support@sinaptex.id
- **WA Support:** +62-812-3456-7890
- **Remote Desktop:** (untuk troubleshooting langsung)

**Informasi yang perlu disiapkan saat hubungi support:**
1. Screenshot error (jika ada)
2. Nomor dokumen transaksi bermasalah
3. Langkah reproduksi error
4. Log engine (dari `backend/logs/` jika ada)

---

**Terima kasih telah menggunakan POS-Sinaptex!**  
**Semoga toko Anda semakin maju dan profitable!** 🚀💰
