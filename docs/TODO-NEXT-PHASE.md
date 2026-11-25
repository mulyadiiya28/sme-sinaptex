# TODO - Phase Selanjutnya POS-Sinaptex

**Tanggal:** 2026-11-12  
**Status:** MVP 1.0 Production Ready  
**Next Phase:** P1 & P2 Development

---

## 📋 Ringkasan Status

| Kategori | Status |
|----------|--------|
| **MVP (P0)** | ✅ 100% Complete |
| **P1 (Operasional)** | ⏭️ 87% Complete |
| **P2 (Branding)** | ⏭️ Spec Ready |
| **P3+ (Beyond)** | ⏭️ Planned |

---

## 🔴 PRIORITY 1 - High Priority (1-2 minggu)

### 1. Printer ESC/POS (P1.1) ⭐⭐⭐⭐
**File:** `docs/SPEC-PRINTER-ESC-POS.md`

**Status:** ✅ Implemented (2026-11-13) — menunggu uji printer fisik

**Tasks:**
- [x] Command Tauri native `printers` + `print_raw` (`src-tauri/src/printer.rs`, windows-sys/spooler)
- [x] `@tauri-apps/api` untuk invoke (plugin `@tauri-apps/plugin-printer` tidak ada di npm)
- [x] `src/lib/printer/printer.ts` - Deteksi printer & raw print
- [x] `src/lib/printer/escpos.ts` - ESC/POS command builder (struk + kuitansi + test page)
- [x] `src/lib/store/printer.ts` - Pengaturan persist (`pos-sinaptex-printer`)
- [x] `src/components/pengaturan/printer-settings.tsx` - Tab Printer (pilih printer, lebar, salinan, auto-print, cut, drawer, tes)
- [x] `src/components/kasir/payment-dialog.tsx` - Auto-print setelah checkout sukses
- [x] `src/lib/struk.ts` - Cetak native + fallback dialog browser
- [ ] Testing hardware: 7 test case (TC-1 sampai TC-7)

**Expected:**
- Auto-print struk tanpa klik browser dialog
- Thermal printer langsung terhubung
- Cut paper & cash drawer support

---

### 2. Gateway Payment API (P1.2) ⭐⭐⭐
**Status:** ✅ Implementasi sisi POS selesai (2026-11-13) — kredensial & provider diatur di Pengaturan → Gateway, tidak hardcode

**Tasks:**
- [x] Pengaturan Gateway (provider Midtrans/Xendit/umum, base URL, API key, merchant, mode sandbox/produksi, jenis auth, polling, timeout, kode akun kas penampung)
- [x] Adapter Midtrans (QRIS `/v2/charge` + status `/v2/qr_code/{id}/status`)
- [x] Adapter Xendit (QRIS `/v2/qr_codes` + status)
- [x] Adapter REST umum (path buat/status bebas, `{id}` sebagai penanda)
- [x] QR code generator lokal (paket `qrcode`, QRIS string → gambar di perangkat, tanpa layanan pihak ketiga)
- [x] Polling status di layar kasir + tagihan otomatis tercatat ke engine sebagai pembayaran QRIS (menunggu konfirmasi pemilik)
- [x] Referensi id tagihan gateway ditulis pada deskripsi penjualan untuk rekonsiliasi
- [ ] Webhook handler untuk payment status (butuh endpoint publik di server)
- [x] Auto-cancel timeout (15 menit) — countdown di gateway-panel, polling berhenti saat kedaluwarsa, status jadi expired
- [x] Refund API integration — tab Uang Muka di /keuangan (advance & refund lewat /api/payments)

**Catatan:** Semua nilai gateway dibaca dari store lokal (`pos-sinaptex-gateway`), jadi tiap toko memakai akun
provider sendiri. Kode akun kas penampung dapat diubah di Pengaturan dan dipakai runtime oleh `live.ts`
(env `NEXT_PUBLIC_ENGINE_GATEWAY` hanya jadi fallback). Pengiriman dana ke bank tetap memakai alur konfirmasi
pemilik yang sudah ada.

---

### 3. Backup Database Otomatis (P1.3)
**Status:** ✅ Implemented (2026-11-13) — tinggal verifikasi restore di mesin produksi

**Tasks:**
- [x] Setup Windows Task Scheduler (`scripts/install-backup-task.ps1`, harian 23:00)
- [x] Script backup via API engine (`scripts/backup-auto.ps1`, SQLite backup API — bukan copy file)
- [x] Retention policy: 30 hari (`Backup:RetentionCount` + pemangkasan `accounting-*.db`; `pre-restore-*.db` dikecualikan)
- [x] Notification jika backup gagal (Event Log `POS-Sinaptex Backup` + log file + webhook opsional)
- [x] Script restore + test restore (`scripts/restore-backup.ps1`; interaktif, `-ListOnly`, pre-restore otomatis)
- [ ] Test restore from backup di data produksi

**Expected:**
- Backup otomatis setiap hari
- Restore bisa dilakukan dengan 1 klik

---

## 🟠 PRIORITY 2 - Medium Priority (2-3 minggu)

### 4. Splash Screen & Activation (P2) ⭐⭐⭐⭐
**File:** `docs/SPEC-SPLASH-ACTIVATION.md`

**Status:** ✅ Sisi POS selesai (2026-11-19) — tanpa API lisensi di engine

**Tasks:**
- [x] Create splash screen component
- [x] Implement copyright & Terms & Conditions dialog
- [x] Activation key system (checksum + ikat ke sidik perangkat lokal)
- [x] License validation API (engine endpoint `/api/licenses` + wiring POS)
- [x] Machine ID tracking (`machine_id` di Tauri; UUID localStorage di browser)

**Expected:**
- Professional branding saat startup
- Legal protection
- License enforcement

---

### 5. Reminder Piutang Otomatis (P1.4)
**Status:** ✅ Selesai versi manual (2026-11-13) — kirim via WhatsApp `wa.me`, template + riwayat lokal

**Tasks:**
- [x] Check piutang jatuh tempo (H-1, H+3, H+7) dari data aging AR (`api.aging.ar`)
- [x] Template reminder (WA / SMS / Email) — 4 template (jatuh tempo, H-1, H+3, H+7), placeholder `{nama}`, `{nomor}`, `{nominal}`, `{jatuhTempo}`, `{toko}`, disimpan di store `useReminder`
- [x] History reminder per pelanggan (maks. 500 entri, lokal per mesin)
- [x] Dashboard notification (peringatan "Reminder piutang" + link ke `/piutang`)
- [x] Kirim manual: tombol WA membuka `https://wa.me/<no>?text=<pesan>`, tombol salin, tombol tandai sudah remind
- [ ] Background job / cron schedule (butuh provider API + service di server; belum)
- [ ] Provider otomatis (WhatsApp Business API / Twilio / SMTP) — butuh kredensial & biaya

**Catatan:** Tidak ada kredensial WA/SMS/Email yang disimpan di POS. Riwayat reminder lokal per mesin
(tidak ikut sinkron engine). Faktur tanpa `dueDate` dianggap jatuh tempo pada tanggal invoice (sesuai
semantik engine).

**Expected:**
- Reminder ke pelanggan via WhatsApp (link manual)
- Notifikasi di dashboard
- History tracking

---

### 6. Import/Export Laporan (P1.5)
**Status:** ✅ Sebagian besar selesai (2026-11-13) — ekspor CSV client-side, tanpa library baru

**Tasks:**
- [x] Export Neraca Saldo ke Excel (CSV BOM dari engine `/api/reports/trial-balance/export`)
- [x] Export Laba-Rugi ke Excel (CSV `Komponen, Nominal` dari tab Laba Rugi)
- [x] Laporan arus kas & perubahan modal di /akuntansi (tab baru, dihitung POS dari trial balance + jurnal)
- [x] Ekspor PDF neraca saldo & gerakan harian dari engine (format=pdf di /api/reports/.../export) — diperbaiki: QuestPDF butuh ColumnsDefinition (commit 6d1a7b6)
- [x] Tombol "Cetak PDF" (window.print) dihapus dari /laporan & /akuntansi — pakai Ekspor PDF (engine) berbasis data (commit da0ee99)
- [x] Export AR Aging ke Excel (CSV rincian faktur + bucket dari tab Umur Piutang & Hutang)
- [x] Export AP Aging ke Excel (CSV rincian faktur + bucket dari tab Umur Piutang & Hutang)
- [x] Export Struk ke PDF (tombol Cetak → dialog browser → "Save as PDF" saat printer native nonaktif; faktur penjualan live sudah punya PDF engine)
- [x] Tab **Umur Piutang & Hutang** menampilkan ringkasan bucket (Lancar/1-30/31-60/61-90/>90) + tabel per faktur

**Catatan:** CSV dibuka Excel dengan BOM UTF-8; angka ditulis tanpa format mata uang agar tetap numerik. Belum ada endpoint export P&L/aging di engine, jadi ekspor dilakukan di sisi POS dari data `api.akuntansi.labaRugi` dan `api.aging.ar/ap`.

**Expected:**
- Laporan bisa di-print ke Excel
- Untuk report ke akuntan/owner

---

## 🟡 PRIORITY 3 - Low Priority (3-4 minggu)

### 7. Voucher/Kupon (P1.6)
**File:** `PRIORITAS-P1-DETAIL.md`

**Status:** ✅ Selesai (2026-11-20) — master voucher + validasi di checkout + batas pemakaian di engine

**Tasks:**
- [x] Master voucher (CRUD) — halaman `/voucher` (list/create/update/deactivate)
- [x] Type: nominal / percentage
- [x] Validasi di checkout (kode voucher di payment-dialog, diskon dihitung engine, voucherCode + diskonVoucher dikirim)
- [x] Usage limit & history — engine menyimpan `UsageLimit`/`UsedCount`, POS menampilkan jumlah terpakai
- [ ] Promo bundle — butuh endpoint & model di engine (di luar scope POS; voucher saat ini hanya persen/nominal)

**Expected:**
- Diskon voucher code
- Loyalty program basic

---

### 8. PPh (Pajak Penghasilan) (P1.7)
**Status:** ✅ Selesai — PPh per faktur disimpan engine + laporan dari snapshot (2026-11-20)

**Tasks:**
- [x] Form input PPh rate di pembelian — centang PPh, pilih jenis (PPh 23 / PPh 4 ayat 2), isi rate
- [x] PPh 23 (2% jasa/sewa) — dihitung engine dari DPP, disimpan di faktur
- [x] PPh 4 ayat 2 (potong supplier) — dihitung engine dari DPP, disimpan di faktur
- [x] Laporan PPh — halaman `/pph` membaca snapshot engine + ekspor CSV
- [x] Bukti potong — cetak per faktur dari halaman `/pph` (dialog cetak browser)
- [x] Endpoint engine `GET /api/reports/pph` (rekap per jenis)

**Expected:**
- Pajak penghasilan terhitung
- Laporan untuk SPT

---

### 9. Filter & Search Lanjutan (P1.8)
**Status:** ✅ Sebagian besar selesai (2026-11-13)

**Tasks:**
- [x] Filter transaksi multi-kriteria (keyword, rentang tanggal, status, metode pembayaran)
- [x] Export filtered data (ekspor CSV mengikuti filter aktif)
- [x] Quick filter (hari ini, 7 hari terakhir, bulan ini, belum lunas)
- [x] Saved filter preset — disimpan lokal per perangkat (`pos-sinaptex-filter-preset`); tombol "Simpan preset" + chip terapkan/hapus di tab Transaksi

**Expected:**
- Search lebih powerful
- Save filter untuk penggunaan ulang

---

## 🟢 PRIORITY 4 - Nice to Have (Future)

### 10. Dashboard Analytics (P2.1)
**Tasks:**
- [x] Sales trend chart (line chart) — SVG harian, filter 7/30/90 hari
- [x] Top products chart (bar chart) — dari performa produk engine, mode mock dihitung dari transaksi
- [x] Payment method breakdown (donut chart)
- [x] Real-time sales counter — penjualan hari ini diperbarui otomatis tiap 60 detik
- [x] Panel kesehatan usaha (sudah ada, dari `GET /api/analytics/health-summary`)

**Expected:**
- Dashboard lebih informatif
- Visual analytics
- Data tren/top produk dari engine, komposisi pembayaran dari transaksi tercatat

---

### 11. Multi-Branch Support (P2.2)
**Tasks:**
- [x] Branch master (CRUD) — halaman `/cabang` (owner)
- [x] Stock per branch — filter gudang di halaman Persediaan
- [x] Report per branch — laporan akuntansi (jurnal, neraca, laba-rugi, gerakan harian, ekspor) menghormati cabang aktif
- [x] `[Branch ID]` header di API calls — topbar selector mengirim `X-Branch-Id`
- [x] Transfer antar cabang — tab **Transfer Antar Cabang** di `/cabang` (`GET/POST /api/inter-branch-transfers`; satu dokumen + dua jurnal)

**Expected:**
- Multi-cabang support
- Branch-level reporting

---

### 12. Member / Loyalty Program (P2.3)
**Status:** ✅ Selesai (2026-11-20) — engine menghitung diskon & poin, POS hanya mengirim kode member dan jumlah poin

**Tasks:**
- [x] Member master — halaman `/member` (list/create/update/deactivate, kode unik per tenant)
- [x] Tier membership — master tier (min poin, diskon, pengali poin) + auto-tier dari poin seumur hidup
- [x] Kebijakan poin per tenant (aktif, poin per Rp1.000, nilai rupiah per poin, auto-tier)
- [x] Point system — buku poin append-only (EARN/REDEEM/ADJUST); poin baru bergerak saat penjualan benar-benar diposting
- [x] Reward redemption — kasir memilih member + jumlah poin; engine membatasi poin terpakai ke saldo & nilai invoice
- [x] Diskon tier + penukaran dipotong dari nilai invoice sebelum pajak, snapshot di `Sale` (aman untuk batch tertahan approval)
- [x] Endpoint engine `/api/members`, `/api/member-tiers`, `/api/loyalty/policy`, `/api/loyalty/price` + migrasi `AddLoyalty`
- [x] Mode mock mencerminkan aturan engine (master, harga, buku poin) lewat `api.member`

**Expected:**
- Loyalty program
- Member discount

---

### 13. WhatsApp Integration (P2.4)
**Tasks:**
- [x] Send struk via WhatsApp — tombol "Kirim via WA" di detail transaksi membuka `wa.me` dengan teks struk (tanpa API provider)
- [x] Reminder piutang via WhatsApp — sudah ada di halaman `/piutang` (tombol WA membuka `wa.me`)
- [x] Customer notification — notifikasi Telegram otomatis setelah checkout (opsional) + kirim struk via WA manual

**Expected:**
- Digital struk via WA
- Automated reminder

---

## 📊 Priority Matrix

| # | Task | Priority | Estimasi | Status |
|---|------|----------|----------|--------|
| 1 | Printer ESC/POS | ⭐⭐⭐⭐ | 2 minggu | ✅ Selesai |
| 2 | Gateway API | ⭐⭐⭐ | 2 minggu | Waiting for API keys |
| 3 | Auto Backup | ⭐⭐⭐ | 1 minggu | ✅ Selesai |
| 4 | Splash & Activation | ⭐⭐⭐⭐ | 2 minggu | ✅ POS (API server menyusul) |
| 5 | Reminder Piutang | ⭐⭐⭐ | 1 minggu | ✅ Manual (provider API menyusul) |
| 6 | Export Laporan | ⭐⭐⭐ | 1 minggu | ✅ Selesai |
| 7 | Voucher | ⭐⭐ | 2 minggu | Medium complexity |
| 8 | PPh | ⭐ | 1 minggu | Low complexity |
| 9 | Filter Lanjutan | ⭐⭐ | 1 minggu | Medium complexity |
| 10 | Dashboard Analytics | ⭐⭐ | — | ✅ Selesai |
| 11 | Multi-Branch | ⭐⭐ | — | ✅ Selesai |
| 12 | Member / Loyalty | ⭐⭐ | — | ✅ Selesai |
| 13 | WhatsApp Integration | ⭐⭐ | — | Belum |

---

## 🎯 Recommended Roadmap

### Week 1-2: P1.1 + P1.3
- Printer ESC/POS (2 minggu)
- Auto Backup (1 minggu)

### Week 3-4: P1.2 + P1.5
- Gateway API (2 minggu)
- Export Laporan (1 minggu)

### Week 5-6: P2 + P1.4
- Splash & Activation (2 minggu)
- Reminder Piutang (1 minggu)

### Week 7-8: P1.6 + P1.7
- Voucher (2 minggu)
- PPh (1 minggu)

**Total P1+P2: 8-10 minggu**

---

## 💡 Quick Wins (Mudah, Nilai Tinggi)

Implement dulu yang mudah & bermanfaat:

| Task | Effort | Impact | Status |
|------|--------|--------|--------|
| Export laporan ke Excel | Low | High | ✅ Done |
| Auto backup harian | Low | High | ✅ Done |
| Filter transaksi | Low | High | ✅ Done |
| Quick filter presets | Low | Medium | ✅ Done |

**Estimasi:** 2-3 minggu untuk 4 quick win

---

## 🔗 Link Dokumentasi

- [P1 Features Detail](PRIORITAS-P1-DETAIL.md)
- [Splash & Activation Spec](docs/SPEC-SPLASH-ACTIVATION.md)
- [Printer ESC/POS Spec](docs/SPEC-PRINTER-ESC-POS.md)
- [MVP Status](STATUS-MVP-2026-11-12.md)

---

## 📝 Catatan untuk Tim

1. **Printer ESC/POS** prioritas tertinggi setelah MVP
2. **Gateway API** butuh akun Midtrans/Xendit (owner yang daftar)
3. **Auto backup** sangat penting untuk data safety
4. **Splash & Activation** untuk branding & legal protection
5. **Reminder piutang** dapat kurangi tunggakan piutang

---

**Last Updated:** 2026-11-23  
**Next Review:** setelah transfer antar cabang diuji di mesin produksi
