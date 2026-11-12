# Dokumentasi POS-Sinaptex — Panduan Lengkap

**Versi:** 1.0 MVP  
**Tanggal:** November 2026  
**Status:** Production-Ready ✅

---

## 📚 Struktur Dokumentasi

Dokumentasi POS-Sinaptex terdiri dari **6 dokumen utama:**

### 1. **Manual Pengguna Owner** (MANUAL-OWNER.md)

**Target:** Pemilik Toko / Manager / Admin  
**Halaman:** ~50 halaman  
**Format:** Tutorial detail step-by-step dengan screenshot placeholders

**Isi:**
- Login & Dashboard
- Kelola Produk, Pelanggan, Supplier
- Pembelian & Stok (faktur, retur, pelunasan hutang)
- Persediaan (gudang, penyesuaian, transfer, opname, kartu stok)
- Transaksi & Approval (void, retur, konfirmasi QRIS, approval workflow)
- Keuangan (akun kas, transfer, biaya, pelunasan piutang)
- Akuntansi (jurnal, neraca saldo, laba-rugi, impor saldo awal)
- Laporan (umur piutang/hutang, rekonsiliasi, kesehatan usaha)
- Aset Tetap (tambah, penyusutan, mutasi, laporan register)
- Pengaturan (profil toko, operasional, kelola user, backup, cabang, audit)
- Troubleshooting lengkap (error, solusi, workaround)

**Kapan pakai:** Referensi lengkap saat training owner atau troubleshooting mendalam.

---

### 2. **Manual Pengguna Kasir** (MANUAL-KASIR.md)

**Target:** Kasir / Operator Toko  
**Halaman:** ~20 halaman  
**Format:** Tutorial sederhana, fokus tugas harian kasir

**Isi:**
- Login
- Buka Shift (wajib sebelum transaksi)
- Transaksi Penjualan (tambah produk, ubah qty, hapus item, diskon)
- Pembayaran (tunai, transfer, QRIS, kredit, campuran)
- Riwayat Transaksi (cetak ulang struk, pelunasan piutang)
- Tutup Shift (hitung kas fisik, cek selisih)
- Tips & Trik (shortcut keyboard, handling komplain)
- Troubleshooting kasir (shift, stok, pembayaran, printer)

**Kapan pakai:** Training kasir baru (30-60 menit) atau referensi cepat saat lupa prosedur.

---

### 3. **Quick Start Owner** (QUICK-START-OWNER.md)

**Target:** Owner/Manager yang sudah mahir, butuh cheat sheet  
**Halaman:** 2 halaman (format ringkas)  
**Format:** Bullet points, tabel, command reference

**Isi:**
- Dashboard KPI
- Kelola Produk (tambah, impor CSV, edit, nonaktifkan)
- Pelanggan & Supplier (tambah, edit, batasan supplier)
- Pembelian (buat faktur, metode bayar, retur, pelunasan)
- Persediaan (gudang, penyesuaian, transfer, opname, kartu stok, nilai)
- Transaksi & Approval (void, retur, konfirmasi QRIS, approval workflow)
- Keuangan (akun kas, transfer, biaya)
- Akuntansi (jurnal, neraca, laba-rugi, impor saldo awal)
- Laporan (AR/AP aging, rekonsiliasi, kesehatan)
- Aset Tetap (tambah, penyusutan, mutasi)
- Pengaturan (profil, user, backup, audit)
- Troubleshooting tabel (masalah → solusi)
- Deployment checklist

**Kapan pakai:** Referensi cepat saat operasional harian, atau cetak & tempel di meja owner.

---

### 4. **Quick Start Kasir** (QUICK-START-KASIR.md)

**Target:** Kasir yang sudah mahir, butuh pengingat cepat  
**Halaman:** 1 halaman (muat kertas A4 satu sisi)  
**Format:** Cheat sheet ultra-ringkas

**Isi:**
- Login
- Buka Shift (3 langkah)
- Transaksi (tambah produk, ubah qty, hapus)
- Pembayaran (tunai, transfer, QRIS, kredit, campuran) — 1-2 baris per metode
- Pelunasan Piutang (F6)
- Tutup Shift (4 langkah)
- Shortcut Keyboard (tabel)
- Troubleshooting (tabel 1 baris per masalah)

**Kapan pakai:** Cetak & tempel di kasir untuk referensi sekilas saat lupa shortcut/prosedur.

---

### 5. **Deployment Checklist** (DEPLOYMENT-CHECKLIST.md)

**Target:** Owner/IT/Developer yang deploy aplikasi ke production  
**Halaman:** ~15 halaman  
**Format:** Checklist interaktif (checkbox) + command reference

**Isi:**
- Pre-Deployment Checklist (frontend, backend, environment, testing)
- Manual Testing Scenarios (6 scenario lengkap: shift, pembayaran, pembelian, akuntansi, persediaan, approval)
- Deployment Steps (build installer, deploy backend standalone/service, setup database)
- Distribusi Toko (Mode A: LAN, Mode B: Standalone)
- Post-Deployment Maintenance (daily/weekly/monthly)
- Known Limitations (by design, bukan bug)
- Support & Troubleshooting (error + solusi)
- Production Go-Live Approval (sign-off)
- P1 Roadmap (5 fitur enhancement post-launch)

**Kapan pakai:**
- Sebelum deploy MVP ke production (verifikasi siap)
- Saat setup toko baru (ikuti langkah deployment)
- Troubleshooting deployment error

---

### 6. **README Dokumentasi** (README-DOKUMENTASI.md — file ini)

**Target:** Siapa saja yang butuh navigasi dokumentasi  
**Halaman:** 3 halaman  
**Format:** Panduan navigasi + FAQ

**Isi:**
- Struktur dokumentasi (6 dokumen utama)
- Kapan pakai dokumen mana
- FAQ dokumentasi
- Konvensi screenshot
- Kontribusi dokumentasi

---

## 🗺️ Kapan Pakai Dokumen Mana?

| Situasi | Dokumen yang Dipakai |
|---------|---------------------|
| **Training owner baru** (belum pernah pakai POS) | `MANUAL-OWNER.md` (baca lengkap) |
| **Training kasir baru** | `MANUAL-KASIR.md` (baca + praktik) |
| **Owner lupa cara impor produk** | `QUICK-START-OWNER.md` (cari section "Impor Produk") |
| **Kasir lupa shortcut keyboard** | `QUICK-START-KASIR.md` (lihat tabel shortcut) |
| **Mau deploy ke production** | `DEPLOYMENT-CHECKLIST.md` (ikuti checklist) |
| **Error saat deployment** | `DEPLOYMENT-CHECKLIST.md` section "Troubleshooting" |
| **Troubleshooting operasional owner** | `MANUAL-OWNER.md` section "Troubleshooting" |
| **Troubleshooting kasir** | `MANUAL-KASIR.md` section "Troubleshooting" |
| **Lupa struktur dokumentasi** | `README-DOKUMENTASI.md` (file ini) |

---

## ❓ FAQ Dokumentasi

### Q: Apakah ada video tutorial?

**A:** Belum ada di MVP 1.0. Dokumentasi saat ini berbasis teks + screenshot placeholder. Video tutorial bisa dibuat post-launch (estimasi P2).

**Workaround:** Owner/IT bisa screen-record saat training kasir pertama kali, lalu pakai rekaman itu untuk training kasir berikutnya.

---

### Q: Screenshot placeholder itu apa?

**A:** Dokumentasi ditulis sebelum screenshot diambil. Placeholder ditandai:

```markdown
**Screenshot:** *(placeholder: login owner)*
```

**Kapan diganti screenshot asli?**
- Setelah deployment production (UI sudah final)
- Atau saat membuat versi PDF (cetak)

**Cara ambil screenshot:**
1. Jalankan aplikasi mode live (production-like)
2. Screenshot tiap form/dialog/halaman yang ada placeholder
3. Crop & resize → max width 800px
4. Ganti placeholder dengan path gambar: `![Login Owner](img/login-owner.png)`

---

### Q: Apakah manual ini cukup untuk training user tanpa support?

**A:** **Ya, untuk owner yang tech-savvy**. `MANUAL-OWNER.md` cukup lengkap untuk self-training (estimasi 2-4 jam baca + praktik).

**Untuk kasir:** Tetap butuh **live training** 30-60 menit oleh owner/IT, karena kasir biasanya kurang terbiasa baca manual panjang. Setelah training, `QUICK-START-KASIR.md` cukup sebagai pengingat.

---

### Q: Bagaimana cara update dokumentasi jika ada fitur baru (P1)?

**A:**
1. **Buat file baru** (misal: `MANUAL-PRINTER-ESC-POS.md`) untuk fitur besar (Printer ESC/POS, Payment Gateway)
2. **Tambah section** di manual existing untuk fitur kecil (misal: tambah section "Reminder Piutang" di `MANUAL-OWNER.md`)
3. **Update Quick Start** jika ada shortcut/workflow baru
4. **Update README-DOKUMENTASI.md** (file ini) dengan struktur baru

---

### Q: Apakah ada versi bahasa Inggris?

**A:** **Tidak ada** di MVP 1.0. POS-Sinaptex didesain untuk UMKM Indonesia, jadi dokumentasi hanya Bahasa Indonesia.

Jika butuh ekspor ke negara lain → translate manual ke English (estimasi P3 atau beyond).

---

### Q: Apakah ada dokumentasi teknis untuk developer?

**A:** **Ya**, di level repo:

**Frontend (POS):**
- `AGENTS.md` — Aturan development + arsitektur + konvensi
- `README.md` — Setup, fitur, commands, gotcha live
- `DESIGN.md` — Design system token Tailwind
- `docs/rencana-desain-ui-ux.md` — Historis: blueprint desain MVP

**Backend (Engine):**
- `backend/AGENTS.md` — Spesifikasi engine + aturan
- `backend/knowledge.md` — Detail implementasi domain logic
- `backend/README.md` — Setup .NET, EF migrations, tests

**P1 Development:**
- `PRIORITAS-P1-DETAIL.md` — Breakdown 5 fitur P1 + estimasi

---

### Q: Bagaimana cara cetak manual untuk dibagikan ke kasir/owner?

**A:** **Opsi 1: Print langsung dari Markdown viewer**
1. Buka file `.md` di VS Code / Typora / Obsidian
2. Export ke PDF (built-in feature)
3. Print PDF

**Opsi 2: Convert ke Word/PDF via Pandoc**
```powershell
# Install pandoc: choco install pandoc (Windows)
pandoc docs/MANUAL-KASIR.md -o MANUAL-KASIR.pdf
```

**Opsi 3: Copy-paste ke Google Docs**
1. Buka file `.md` di GitHub (atau VS Code preview)
2. Copy isi → Paste ke Google Docs
3. Format ulang (heading, tabel, spacing)
4. Export PDF dari Google Docs

**Rekomendasi:** Opsi 2 (Pandoc) paling cepat & rapi.

---

### Q: Apakah ada glosarium istilah teknis?

**A:** Belum ada file terpisah. Istilah teknis dijelaskan inline di manual. Contoh:

- **Shift:** Periode kerja kasir (buka → tutup shift, biasanya 1 hari)
- **Piutang (AR):** Tagihan ke pelanggan yang belum lunas
- **Hutang (AP):** Kewajiban bayar ke supplier yang belum lunas
- **Jurnal:** Entry akuntansi (Debit + Kredit) yang ditulis otomatis sistem
- **HPP:** Harga Pokok Penjualan (biaya beli produk yang dijual)
- **Approval Workflow:** Mekanisme persetujuan transaksi besar oleh owner
- **Void:** Batalkan transaksi (bukan retur, tapi dianggap tidak pernah terjadi)
- **Retur:** Pengembalian barang (transaksi tetap ada, tapi barang/uang kembali)

**Jika butuh glosarium lengkap:** Bisa buat `GLOSARIUM.md` terpisah (estimasi 1-2 halaman).

---

## 📸 Konvensi Screenshot

**Saat mengganti screenshot placeholder, ikuti aturan:**

### 1. Naming Convention

```
img/
  login-owner.png
  login-kasir.png
  dashboard-owner.png
  form-tambah-produk.png
  dialog-pembayaran-tunai.png
  dialog-pembayaran-campuran.png
  riwayat-transaksi.png
  tutup-shift.png
  ...
```

**Format:** `{page/dialog}-{deskripsi}.png` (lowercase, dash-separated)

### 2. Resolution & Quality

- **Max width:** 800px (agar tidak terlalu besar di PDF)
- **Format:** PNG (lossless, untuk text/UI yang jelas)
- **DPI:** 96-150 DPI (cukup untuk layar & print)

### 3. Sensitive Data

**Jangan screenshot data asli toko/pelanggan!** Gunakan data dummy:

- **Nama toko:** "Toko Contoh", "Warung Maju"
- **Produk:** "Susu Ultra 1L", "Kopi Kapal Api"
- **Pelanggan:** "Toko Sumber Rejeki", "CV Maju Jaya"
- **Nominal:** Rp 50.000, Rp 100.000 (angka bulat, mudah dibaca)
- **Tanggal:** 2026-11-12 (konsisten dengan dokumentasi)

### 4. Highlight Important Parts

Jika perlu highlight (misal: tombol "Bayar", field error):

- Gunakan **red rectangle** (border 2px) untuk fokus
- Atau **arrow** (red, thick) untuk pointer
- Tools: Snagit, Greenshot, Windows Snipping Tool + Paint

### 5. Markdown Embed

```markdown
![Deskripsi](img/nama-file.png)
*Gambar: Deskripsi lebih detail jika perlu*
```

**Contoh:**
```markdown
![Login Owner](img/login-owner.png)
*Gambar: Halaman login untuk owner dengan username "pemilik"*
```

---

## 🤝 Kontribusi Dokumentasi

**Jika menemukan:**
- Typo / kesalahan penulisan
- Langkah yang tidak jelas
- Screenshot yang salah
- Fitur baru yang belum terdokumentasi

**Cara kontribusi:**

### 1. Edit langsung (untuk developer/IT)

```powershell
# Clone repo
git clone <repo-url>
cd sme-sinaptex

# Buat branch
git checkout -b docs/update-manual-kasir

# Edit file
code docs/MANUAL-KASIR.md

# Commit
git add docs/MANUAL-KASIR.md
git commit -m "docs: perbaiki langkah pembayaran campuran"

# Push & PR
git push origin docs/update-manual-kasir
```

### 2. Lapor ke support (untuk owner/kasir)

Email ke **support@sinaptex.id** dengan format:

```
Subject: [Dokumentasi] Typo di MANUAL-KASIR.md

Halaman: Pembayaran QRIS (section 5.3)
Masalah: Tertulis "Pilih metode Tunai", seharusnya "Pilih metode QRIS"
Screenshot: (attach jika perlu)
```

---

## 📂 Struktur Folder Dokumentasi

```
docs/
  README-DOKUMENTASI.md        ← File ini (panduan navigasi)
  MANUAL-OWNER.md              ← Manual lengkap owner (50 hal)
  MANUAL-KASIR.md              ← Manual lengkap kasir (20 hal)
  QUICK-START-OWNER.md         ← Cheat sheet owner (2 hal)
  QUICK-START-KASIR.md         ← Cheat sheet kasir (1 hal)
  DEPLOYMENT-CHECKLIST.md      ← Checklist deployment (15 hal)
  rencana-desain-ui-ux.md      ← Arsip historis (blueprint MVP)
  img/                          ← Screenshot (belum ada di MVP 1.0)
    login-owner.png
    dashboard-owner.png
    ...
```

**Total:** ~90 halaman dokumentasi user (belum termasuk dokumentasi teknis developer).

---

## 📅 Roadmap Dokumentasi

### MVP 1.0 (November 2026) ✅
- [x] `MANUAL-OWNER.md` — 50 halaman
- [x] `MANUAL-KASIR.md` — 20 halaman
- [x] `QUICK-START-OWNER.md` — 2 halaman
- [x] `QUICK-START-KASIR.md` — 1 halaman
- [x] `DEPLOYMENT-CHECKLIST.md` — 15 halaman
- [x] `README-DOKUMENTASI.md` — 3 halaman (file ini)

### P1 (Post-Launch, estimasi Desember 2026 - Januari 2027)
- [ ] Screenshot semua placeholder (20-30 gambar)
- [ ] Video tutorial kasir (5-10 menit)
- [ ] `MANUAL-PRINTER-ESC-POS.md` (jika fitur Printer ESC/POS jadi)
- [ ] `MANUAL-PAYMENT-GATEWAY.md` (jika fitur Payment Gateway API jadi)

### P2 (Beyond)
- [ ] Glosarium (`GLOSARIUM.md`)
- [ ] FAQ teknis (`FAQ-TEKNIS.md`)
- [ ] Troubleshooting database (`TROUBLESHOOTING-DATABASE.md`)
- [ ] English translation (jika ekspor luar negeri)

---

## 📞 Support Dokumentasi

**Jika Anda:**
- Tidak menemukan jawaban di dokumentasi
- Bingung pakai dokumen yang mana
- Butuh training live (video call)

**Hubungi:**
- **Email:** support@sinaptex.id
- **WA:** +62-812-xxxx-xxxx (nomor support)
- **Remote Desktop:** (untuk troubleshooting langsung)

---

## ✅ Checklist: Apakah Dokumentasi Sudah Lengkap?

Verifikasi dokumentasi sebelum deploy production:

- [x] `MANUAL-OWNER.md` mencakup semua fitur owner (15 menu)
- [x] `MANUAL-KASIR.md` mencakup semua tugas harian kasir (login, shift, transaksi, pembayaran, tutup)
- [x] `QUICK-START-OWNER.md` bisa dicetak 2 halaman A4
- [x] `QUICK-START-KASIR.md` bisa dicetak 1 halaman A4
- [x] `DEPLOYMENT-CHECKLIST.md` mencakup pre-deployment, deployment steps, testing, troubleshooting
- [x] `README-DOKUMENTASI.md` (file ini) mencakup navigasi + FAQ
- [ ] Screenshot placeholder diganti screenshot asli (optional untuk MVP 1.0, wajib untuk cetak PDF)
- [ ] Video tutorial kasir (optional untuk MVP 1.0, recommended untuk P1)

**Status:** 6/8 ✅ (MVP 1.0 dokumentasi siap!)

---

**🎉 Dokumentasi POS-Sinaptex MVP — Complete!**  
**Total:** 90 halaman dokumentasi user + 15 halaman deployment checklist = **105 halaman** 📚

**Terima kasih telah menggunakan POS-Sinaptex!**  
**Semoga dokumentasi ini membantu Anda sukses operasional harian!** 🚀💰
