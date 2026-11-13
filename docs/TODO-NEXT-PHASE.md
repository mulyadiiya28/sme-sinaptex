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

**Status:** Spec sudah dibuat, siap implement

**Tasks:**
- [ ] Install Tauri printer plugin: `@tauri-apps/plugin-printer`
- [ ] Create `lib/printer/printer.ts` - Printer detection & management
- [ ] Create `lib/printer/escpos.ts` - ESC/POS command builder
- [ ] Create `components/pengaturan/printer-settings.tsx` - Settings UI
- [ ] Update `components/kasir/checkout-dialog.tsx` - Auto-print toggle
- [ ] Update `src/lib/struk.ts` - Print service integration
- [ ] Testing: 7 test cases (TC-1 sampai TC-7)

**Expected:**
- Auto-print struk tanpa klik browser dialog
- Thermal printer langsung terhubung
- Cut paper & cash drawer support

---

### 2. Gateway Payment API (P1.2) ⭐⭐⭐
**Status:** QRIS manual sudah jalan, butuh integrasi API

**Tasks:**
- [ ] Pilih provider: Midtrans / Xendit / Doku
- [ ] Daftar akun provider & dapat API keys
- [ ] Sandbox testing
- [ ] Implement QR code generator
- [ ] Webhook handler untuk payment status
- [ ] Auto-cancel timeout (15 menit)
- [ ] Refund API integration

**Expected:**
- Kasir tidak perlu tunggu konfirmasi manual
- Customer experience lebih baik (real-time)
- Auto-refund jika timeout

---

### 3. Backup Database Otomatis (P1.3)
**Status:** Manual backup sudah ada, butuh auto-backup

**Tasks:**
- [ ] Setup Windows Task Scheduler
- [ ] Schedule backup harian (jam 23:00)
- [ ] Retention policy: 30 hari
- [ ] Notification jika backup gagal
- [ ] Test restore from backup

**Expected:**
- Backup otomatis setiap hari
- Restore bisa dilakukan dengan 1 klik

---

## 🟠 PRIORITY 2 - Medium Priority (2-3 minggu)

### 4. Splash Screen & Activation (P2) ⭐⭐⭐⭐
**File:** `docs/SPEC-SPLASH-ACTIVATION.md`

**Tasks:**
- [ ] Create splash screen component
- [ ] Implement copyright & Terms & Conditions dialog
- [ ] Activation key system (one-time use)
- [ ] License validation API
- [ ] Machine ID tracking

**Expected:**
- Professional branding saat startup
- Legal protection
- License enforcement

---

### 5. Reminder Piutang Otomatis (P1.4)
**Status:** Pelunasan sudah, reminder belum

**Tasks:**
- [ ] Background job / cron schedule
- [ ] Check piutang jatuh tempo (H-1, H+3, H+7)
- [ ] Template reminder (WA / SMS / Email)
- [ ] History reminder per pelanggan
- [ ] Dashboard notification

**Expected:**
- Reminder otomatis ke pelanggan
- Notifikasi di dashboard
- History tracking

---

### 6. Import/Export Laporan (P1.5)
**Status:** Laporan ada, tapi belum bisa export ke Excel/PDF

**Tasks:**
- [ ] Export Neraca Saldo ke Excel
- [ ] Export Laba-Rugi ke Excel
- [ ] Export AR Aging ke Excel
- [ ] Export AP Aging ke Excel
- [ ] Export Struk ke PDF

**Expected:**
- Laporan bisa di-print ke Excel
- Untuk report ke akuntan/owner

---

## 🟡 PRIORITY 3 - Low Priority (3-4 minggu)

### 7. Voucher/Kupon (P1.6)
**File:** `PRIORITAS-P1-DETAIL.md`

**Tasks:**
- [ ] Master voucher (CRUD)
- [ ] Type: nominal / percentage
- [ ] Validasi di checkout
- [ ] Usage limit & history
- [ ] Promo bundle

**Expected:**
- Diskon voucher code
- Loyalty program basic

---

### 8. PPh (Pajak Penghasilan) (P1.7)
**Status:** PPN sudah, PPh belum

**Tasks:**
- [ ] Form input PPh rate di pembelian
- [ ] PPh 23 (2% jasa/sewa)
- [ ] PPh 4 ayat 2 (potong supplier)
- [ ] Laporan PPh
- [ ] Bukti potong

**Expected:**
- Pajak penghasilan terhitung
- Laporan untuk SPT

---

### 9. Filter & Search Lanjutan (P1.8)
**Tasks:**
- [ ] Filter transaksi multi-kriteria
- [ ] Export filtered data
- [ ] Saved filter preset
- [ ] Quick filter (last 7 days, this month, etc.)

**Expected:**
- Search lebih powerful
- Save filter untuk penggunaan ulang

---

## 🟢 PRIORITY 4 - Nice to Have (Future)

### 10. Dashboard Analytics (P2.1)
**Tasks:**
- [ ] Sales trend chart (line chart)
- [ ] Top products chart (bar chart)
- [ ] Payment method breakdown (pie chart)
- [ ] Real-time sales counter

**Expected:**
- Dashboard lebih informatif
- Visual analytics

---

### 11. Multi-Branch Support (P2.2)
**Tasks:**
- [ ] Branch master (CRUD)
- [ ] Stock per branch
- [ ] Report per branch
- [ [Branch ID] header di API calls

**Expected:**
- Multi-cabang support
- Branch-level reporting

---

### 12. Member / Loyalty Program (P2.3)
**Tasks:**
- [ ] Member master
- [ ] Point system
- [ ] Reward redemption
- [ ] Tier membership

**Expected:**
- Loyalty program
- Member discount

---

### 13. WhatsApp Integration (P2.4)
**Tasks:**
- [ ] Send struk via WhatsApp
- [ ] Reminder piutang via WhatsApp
- [ ] Customer notification

**Expected:**
- Digital struk via WA
- Automated reminder

---

## 📊 Priority Matrix

| # | Task | Priority | Estimasi | Status |
|---|------|----------|----------|--------|
| 1 | Printer ESC/POS | ⭐⭐⭐⭐ | 2 minggu | Ready to implement |
| 2 | Gateway API | ⭐⭐⭐ | 2 minggu | Waiting for API keys |
| 3 | Auto Backup | ⭐⭐⭐ | 1 minggu | Simple implementation |
| 4 | Splash & Activation | ⭐⭐⭐⭐ | 2 minggu | Spec ready |
| 5 | Reminder Piutang | ⭐⭐⭐ | 1 minggu | Medium complexity |
| 6 | Export Laporan | ⭐⭐⭐ | 1 minggu | Simple implementation |
| 7 | Voucher | ⭐⭐ | 2 minggu | Medium complexity |
| 8 | PPh | ⭐ | 1 minggu | Low complexity |
| 9 | Filter Lanjutan | ⭐⭐ | 1 minggu | Medium complexity |
| 10-13 | P2+ Features | ⭐⭐ | 4 minggu | Nice to have |

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
| Export laporan ke Excel | Low | High | Ready |
| Auto backup harian | Low | High | Ready |
| Filter transaksi | Low | High | Ready |
| Quick filter presets | Low | Medium | Ready |

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

**Last Updated:** 2026-11-12  
**Next Review:** 2026-11-19 (setelah 1 minggu production)
