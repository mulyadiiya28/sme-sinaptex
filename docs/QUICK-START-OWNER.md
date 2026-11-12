# Quick Start Owner — POS-Sinaptex

**Cheat Sheet 2 Halaman** (Referensi cepat Owner/Manager)

---

## 🔐 LOGIN

```
Username: pemilik (atau custom)
Password: *******
```

---

## 📊 DASHBOARD

**KPI Real-time:**
- Kesehatan Usaha (Rasio Lancar, Modal Kerja, Rasio Kas)
- Penjualan Hari Ini
- Pembelian Bulan Ini
- Piutang Belum Lunas

---

## 📦 KELOLA PRODUK

### Tambah Produk
1. Menu **Produk** → **"+ Tambah Produk"**
2. Isi: Kode, Nama, Kategori, Satuan, Harga Beli, Harga Jual
3. **Simpan** ✅

### Impor Produk (CSV)
```csv
kode,nama,kategori,satuan,hargaBeli,hargaJual,barcode
BRG-001,Susu Ultra 1L,Minuman,pcs,10000,15000,8992761001234
```
1. Menu **Produk** → **"Impor"**
2. Upload CSV → Validasi → Semua ditulis (all-or-nothing)

### Edit/Nonaktifkan
- Klik **ikon pensil** (edit) atau **"Nonaktifkan"**

---

## 👥 KELOLA PELANGGAN & SUPPLIER

### Pelanggan
- Menu **Produk** → Tab **Pelanggan** → **"+ Tambah Pelanggan"**
- Isi: Nama (wajib), Telepon, Alamat
- Kode auto-generated (CUST-00001)

### Supplier
- Menu **Supplier** → **"+ Tambah Supplier"**
- **PENTING:** Kode/nama **tidak bisa diubah** setelah dibuat (by design)

---

## 🛍️ PEMBELIAN

### Buat Faktur Pembelian
1. Menu **Pembelian** → **"+ Buat Pembelian"**
2. Isi: Tanggal, Supplier (opsional untuk tunai), Metode Bayar
3. Tambah item (produk + qty + harga beli)
4. **Simpan** → Jurnal + stok bertambah ✅

### Metode Bayar:
- **Tunai:** Uang keluar dari kas
- **Transfer:** Uang keluar dari bank
- **Hutang:** (wajib isi supplier) → bayar nanti
- **DP:** Bayar sebagian, sisanya hutang

### Retur Pembelian
1. **Riwayat Pembelian** → cari faktur → **"Retur"**
2. Pilih item + qty retur + alasan
3. **Proses** → Stok berkurang, jurnal pembalik ✅

### Pelunasan Hutang
1. Menu **Keuangan** → **Pelunasan Hutang**
2. Pilih supplier → daftar faktur belum lunas
3. Bayar (full atau sebagian) → **Proses** ✅

---

## 📦 PERSEDIAAN

### Gudang
- Menu **Persediaan** → **Gudang** → **"+ Tambah Gudang"**
- Default: "Toko Utama" (tidak bisa dihapus)

### Penyesuaian Stok
1. **Persediaan** → **Penyesuaian** → **"+ Buat Penyesuaian"**
2. Pilih: Gudang, Produk, Jenis (Tambah/Kurang), Qty, Alasan
3. **Simpan** → Jurnal otomatis ✅

### Transfer Antar Gudang
1. **Persediaan** → **Transfer** → **"+ Buat Transfer"**
2. Dari → Ke → Produk → Qty
3. **Simpan** → Stok pindah (tidak ada jurnal) ✅

### Opname Stok
1. **Persediaan** → **Opname** → **"+ Buat Opname"**
2. Pilih gudang → sistem generate daftar produk + stok sistem
3. Hitung fisik → input stok fisik
4. **Complete** → Selisih otomatis disesuaikan ✅

### Kartu Stok
- **Persediaan** → **Kartu Stok** → Pilih produk + gudang + periode
- Tampilkan riwayat keluar-masuk (pembelian, penjualan, penyesuaian)

### Nilai Persediaan
- **Persediaan** → **Nilai Persediaan** → Pilih gudang
- Tampilkan: Qty × HPP rata-rata = Nilai Total

---

## ✅ TRANSAKSI & APPROVAL

### Void Transaksi
1. **Riwayat** → cari transaksi → **"Void"**
2. Mode mock: selalu berhasil
3. Mode live: `POSTED` tidak bisa void → fallback **Retur Penuh**

### Retur Penjualan
1. **Riwayat** → cari transaksi → **"Retur"**
2. Pilih item + qty + alasan → **Proses**
3. Stok kembali, jurnal pembalik, refund = neto + pajak ✅

### Konfirmasi QRIS
1. **Riwayat** → Filter "Menunggu Pembayaran"
2. Cari transaksi QRIS → verifikasi uang masuk gateway (GoPay/OVO/dll)
3. **"Konfirmasi"** → Dana pindah gateway → bank, status **Lunas** ✅

### Approval Workflow
1. **Setup Aturan:** Menu **Approval Rules** → **"+ Tambah Aturan"**
   - Jenis (Penjualan/Transfer/Pembelian), Nominal Min, Approver
2. **Approve:** Menu **Persetujuan** → daftar antrean
   - Klik transaksi → **Approve** (post) atau **Reject** (void)

---

## 💰 KEUANGAN

### Akun Kas
- Menu **Keuangan** → **Akun Kas**
- Daftar: Kas (1121), Bank (1111), Gateway QRIS (1130)

### Transfer Antar Kas
1. **Keuangan** → **Transfer Kas** → **"+ Buat Transfer"**
2. Dari (Kas) → Ke (Bank) → Jumlah → Deskripsi
3. **Simpan** → Jurnal: Debit Bank, Kredit Kas ✅

### Catat Biaya
1. **Keuangan** → **Biaya** → **"+ Catat Biaya"**
2. Tanggal, Jenis, Nominal, Metode (Tunai/Transfer), Catatan
3. **Simpan** → Jurnal: Debit Biaya, Kredit Kas ✅

---

## 📒 AKUNTANSI

### Jurnal Otomatis
- Menu **Akuntansi** → **Jurnal**
- Tampilkan semua entry (filter tanggal/jenis transaksi)
- **Wajib seimbang:** Total Debit = Total Kredit

### Neraca Saldo
- **Akuntansi** → **Neraca Saldo** → Pilih periode
- Tampilkan: Saldo Awal | Debit | Kredit | Saldo Akhir

### Laba-Rugi
- **Akuntansi** → **Laba-Rugi** → Pilih periode
- Rumus: `Pendapatan - HPP - Biaya = Laba Bersih`

### Impor Saldo Awal
```csv
accountCode,openingBalance
1121,1000000
1111,10000000
```
- **Akuntansi** → **Impor Saldo Awal** → Upload CSV

---

## 📈 LAPORAN

### Umur Piutang/Hutang
- Menu **Laporan** → **Umur Piutang** (AR Aging)
- Kelompok: < 30 hari | 31-60 | > 60
- Follow-up pelanggan telat bayar

### Rekonsiliasi
- **Laporan** → **Rekonsiliasi AR/AP**
- Cocokkan saldo neraca vs saldo per dokumen
- Selisih = ada bug/kesalahan entry

### Kesehatan Usaha
- Dashboard widget atau **Laporan** → **Kesehatan**
- KPI: Rasio Lancar, Rasio Kas, Modal Kerja

---

## 🏢 ASET TETAP

### Tambah Aset
1. Menu **Aset Tetap** → **"+ Tambah Aset"**
2. Isi: Nama, Kategori, Tanggal/Harga Perolehan, Metode Penyusutan, Umur, Residu
3. **Simpan** ✅

### Posting Penyusutan Bulanan
1. **Aset Tetap** → **Posting Penyusutan**
2. Pilih bulan → Sistem hitung semua aset
3. **Posting** → Jurnal: Debit Biaya Penyusutan, Kredit Akumulasi

### Mutasi Aset
- **SALE** (jual) / **DISPOSAL** (buang) → Aset jadi nonaktif
- **TRANSFER** (pindah lokasi) → Aset tetap aktif
- **TIDAK ada jurnal otomatis** (catat manual jika perlu)

---

## ⚙️ PENGATURAN

### Profil Toko
- Menu **Pengaturan** → Tab **Profil Toko**
- Isi: Nama, Alamat, Telepon, Email, NPWP
- **Upload Logo** (mode live saja, untuk faktur PDF)

### Operasional
- Tab **Operasional**
- Atur: Saldo Awal Shift, Izinkan Kredit (ON/OFF), Pajak Default

### Kelola User
- Tab **Kelola User** → **"+ Tambah User"**
- Isi: Username, Password, Nama, Role (Owner/Kasir)
- **Edit:** Ubah nama/email/role, Reset Password
- **Hapus:** (hati-hati, tidak bisa undo)

### Backup & Restore
1. **Tab Backup** → **"Buat Backup"**
2. File tersimpan: `backend/src/AccountingEngine.Api/backups/`
3. **Download** atau **Restore** dari list

### Audit Log
- Tab **Audit** → Jejak aktivitas user
- Filter: User, Aksi, Tanggal

---

## ⚠️ TROUBLESHOOTING OWNER

| Masalah | Solusi |
|---------|--------|
| Jurnal tidak seimbang | **Bug serius** → screenshot → hubungi support |
| Stok negatif | **Normal** (kasir jual dulu, restok belakangan) |
| Mode live tidak konek | Cek engine running (`netstat -an \| findstr 5121`), firewall, `.env.local` |
| Lupa password | Edit database SQL atau bootstrap ulang (data hilang) |
| Database corrupt | Stop engine → Restore backup terakhir |

---

## 🚀 DEPLOYMENT CHECKLIST

**Pre-Production:**
- [ ] `npm run build` sukses
- [ ] `npx tauri build` → installer NSIS/MSI
- [ ] Backend: `dotnet ef database update` + `bootstrap-backend.py` + seed chart
- [ ] Test manual: shift flow, pembayaran campuran, QRIS, approval, laporan

**Go-Live:**
- [ ] Install POS app di kasir
- [ ] Jalankan engine (standalone atau Windows Service)
- [ ] Config `.env.local` → `API_MODE=live`, `API_BASE_URL=http://...`
- [ ] Training owner (2 jam) + kasir (1 jam)
- [ ] Backup otomatis aktif

---

## 📞 SUPPORT

**Email:** support@sinaptex.id  
**WA:** +62-812-xxxx-xxxx  
**Remote Desktop:** (untuk troubleshooting langsung)

---

**🎉 POS-Sinaptex MVP — Production Ready!**  
**Semoga toko Anda semakin maju!** 💰🚀
