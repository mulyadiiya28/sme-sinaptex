# 📋 Prioritas P1 (Operasional) - Detail Lengkap

**Tanggal:** 2026-11-12  
**Fase:** P1 - Operasional (Penyempurnaan Toko)

---

## 🎯 Apa itu P1?

**P1 = Fase Operasional (Penyempurnaan Toko)**

Fitur-fitur yang **meningkatkan efisiensi dan profesionalitas** operasional toko, tetapi **BUKAN blocker** untuk mulai operasional. Toko sudah bisa jalan tanpa P1, tapi P1 membuat operasional lebih smooth dan profesional.

---

## 📊 Definisi P1 (dari `docs/rencana-desain-ui-ux.md`)

> **P1 | Operasional (penyempurnaan toko)**  
> Integrasi QRIS/payment gateway, printer struk, piutang dan hutang lengkap, retur, diskon, pajak, stok opname, buku besar, neraca saldo, dan rekonsiliasi pembayaran

---

## ✅ Status P1: Sebagian Besar SUDAH SELESAI

| Fitur P1 (Rencana Awal) | Status | Keterangan |
|--------------------------|--------|------------|
| Integrasi QRIS/Payment Gateway | ⏭️ **80%** | QRIS manual ✅, API gateway ❌ |
| Printer Struk | ⏭️ **60%** | Browser print ✅, ESC/POS ❌ |
| Piutang & Hutang Lengkap | ✅ **90%** | Inti ✅, reminder ⏭️ |
| Retur | ✅ **100%** | Retur penjualan & pembelian ✅ |
| Diskon | ✅ **90%** | Diskon nominal ✅, voucher ⏭️ |
| Pajak | ✅ **90%** | PPN ✅, PPh ⏭️ |
| Stok Opname | ✅ **100%** | Draft/complete/cancel ✅ |
| Buku Besar | ✅ **100%** | Sudah ada ✅ |
| Neraca Saldo | ✅ **100%** | 4 kolom format ✅ |
| Rekonsiliasi Pembayaran | ✅ **100%** | AR/AP reconciliation ✅ |

### 📈 Progress P1: **87/100 poin selesai**

**Yang benar-benar belum:** 5 fitur enhancement (13 poin)

---

## 🔍 P1 Yang BELUM Selesai (Detail)

### 1️⃣ Integrasi Payment Gateway API

**Status:** ⏭️ **Belum** (QRIS manual sudah jalan)

#### Yang Sudah Ada:
- ✅ Alur QRIS manual:
  - Kasir pilih metode QRIS
  - Dana ditahan di akun gateway (1130)
  - Status: "Menunggu Konfirmasi"
  - Pemilik konfirmasi setelah cek notifikasi HP
  - Transfer gateway → bank otomatis
- ✅ Status tracking lengkap
- ✅ Audit trail konfirmasi

#### Yang Belum:
- ❌ Integrasi API provider (Midtrans/Xendit/Doku/dll)
- ❌ QR code generator otomatis
- ❌ Webhook callback (payment success/failed/expired)
- ❌ Auto-cancel timeout (misal: 15 menit)
- ❌ Refund otomatis via API

#### Estimasi:
- **Waktu:** 1-2 minggu
- **Kompleksitas:** Medium
- **Dependencies:** 
  - Daftar akun provider (Midtrans/Xendit)
  - API keys & webhook URL
  - Testing di sandbox

#### Prioritas:
⭐⭐⭐ **Medium-High**

Toko bisa operasional tanpa ini (QRIS manual sudah OK), tapi API gateway membuat:
- Kasir tidak perlu tunggu konfirmasi manual
- Customer experience lebih baik (real-time)
- Lebih sedikit human error

---

### 2️⃣ Printer Struk ESC/POS (Thermal)

**Status:** ⏭️ **Belum** (Browser print sudah jalan)

#### Yang Sudah Ada:
- ✅ Template struk HTML thermal-friendly (80mm)
- ✅ Logo toko
- ✅ Detail transaksi lengkap
- ✅ Cetak via `window.print()` → browser print dialog
- ✅ Support semua printer (termasuk thermal via driver)

#### Yang Belum:
- ❌ Print langsung ke thermal printer (bypass browser)
- ❌ Perintah ESC/POS native
- ❌ Auto-print setelah checkout (toggle setting)
- ❌ Konfigurasi printer di Pengaturan
- ❌ Print test page

#### Implementasi Options:

##### Opsi A: Electron Print API (Recommended untuk Desktop)
```typescript
// Tauri equivalent: tauri-plugin-printer
import { printer } from '@tauri-apps/api';

async function printStruk(html: string) {
  await printer.print({
    content: html,
    silent: true,  // No dialog
    deviceName: 'Thermal Printer Name'
  });
}
```

##### Opsi B: ESC/POS via USB/Serial
```typescript
// Library: escpos, escpos-usb
import escpos from 'escpos';

// Direct USB/Serial communication
const device = new escpos.USB();
const printer = new escpos.Printer(device);

device.open(() => {
  printer
    .align('ct')
    .text('TOKO ABC')
    .cut()
    .close();
});
```

##### Opsi C: Network Printer (IP)
```typescript
// Kirim raw ESC/POS ke IP printer
fetch('http://192.168.1.100:9100', {
  method: 'POST',
  body: escPosCommands
});
```

#### Estimasi:
- **Waktu:** 1-2 minggu
- **Kompleksitas:** Medium-High
- **Dependencies:**
  - Tauri plugin printer (atau Electron)
  - ESC/POS library
  - Physical thermal printer untuk testing

#### Prioritas:
⭐⭐⭐⭐ **High**

Browser print **berfungsi**, tapi:
- Kasir harus klik "Print" di dialog browser (tidak seamless)
- Tidak bisa auto-print
- Setting printer per transaksi (ribet)

Thermal printer langsung = UX jauh lebih baik.

---

### 3️⃣ Reminder Piutang Otomatis

**Status:** ⏭️ **Belum** (Pelunasan sudah lengkap)

#### Yang Sudah Ada:
- ✅ Penjualan kredit (piutang)
- ✅ Pelunasan piutang (dari 3 tempat: Kasir F6, Riwayat, Keuangan)
- ✅ Umur piutang (AR aging: Current, 30, 60, 90, 90+ days)
- ✅ Rekonsiliasi piutang vs ledger
- ✅ Status "Jatuh tempo" di list piutang

#### Yang Belum:
- ❌ Notifikasi piutang jatuh tempo (dashboard/popup)
- ❌ Kirim reminder via WA/SMS/Email otomatis
- ❌ Template pesan reminder (kustomisasi)
- ❌ Jadwal reminder (3 hari sebelum, H-1, H+3, H+7)
- ❌ History reminder per pelanggan

#### Implementasi:

```typescript
// Background job (cron/scheduler)
// Check setiap pagi jam 8

async function checkPiutangJatuhTempo() {
  const besok = tanggalLokal(addDays(new Date(), 1));
  const piutang = await api.piutang.list();
  
  const jatuhTempoBesok = piutang.filter(p => 
    p.jatuhTempo === besok && p.outstanding > 0
  );
  
  for (const p of jatuhTempoBesok) {
    await kirimReminder({
      pelanggan: p.pelangganNama,
      telepon: p.pelangganTelepon,
      nominal: p.outstanding,
      jatuhTempo: p.jatuhTempo,
      template: 'H-1'  // "Besok jatuh tempo"
    });
  }
}
```

#### Estimasi:
- **Waktu:** 1 minggu
- **Kompleksitas:** Medium
- **Dependencies:**
  - WhatsApp Business API / Twilio (SMS) / SMTP (Email)
  - Background scheduler (cron job / Windows Task Scheduler)

#### Prioritas:
⭐⭐⭐ **Medium**

Berguna tapi tidak urgent:
- Pemilik bisa cek manual di tab Piutang (sudah ada aging)
- Reminder manual via WA biasa juga bisa
- Otomasi membuat profesional, tapi bukan blocker

---

### 4️⃣ Voucher / Kupon / Member Discount

**Status:** ⏭️ **Belum** (Diskon nominal sudah ada)

#### Yang Sudah Ada:
- ✅ Diskon per item (nominal Rp)
- ✅ Diskon transaksi (nominal Rp)
- ✅ Diskon disebar proporsional ke baris

#### Yang Belum:
- ❌ Diskon persentase (misal: 10% off)
- ❌ Voucher code (misal: `LEBARAN50`)
- ❌ Member card / loyalty program
- ❌ Point reward
- ❌ Promo bundle (beli 2 gratis 1)
- ❌ Diskon otomatis (member auto-discount)

#### Implementasi:

```typescript
// Master voucher
type Voucher = {
  code: string;
  type: 'percentage' | 'nominal';
  value: number;
  minPurchase: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  usedCount: number;
};

// Apply voucher
function applyVoucher(cart: Cart, voucherCode: string) {
  const voucher = await api.voucher.validate(voucherCode);
  
  if (!voucher) throw new Error('Kode voucher tidak valid');
  if (voucher.usedCount >= voucher.usageLimit) {
    throw new Error('Voucher sudah habis');
  }
  
  const subtotal = cart.lines.reduce((s, l) => s + l.total, 0);
  
  if (subtotal < voucher.minPurchase) {
    throw new Error(`Min. belanja Rp ${voucher.minPurchase}`);
  }
  
  const diskon = voucher.type === 'percentage' 
    ? subtotal * (voucher.value / 100)
    : voucher.value;
  
  return { diskon, voucherCode };
}
```

#### Estimasi:
- **Waktu:** 1-2 minggu
- **Kompleksitas:** Medium
- **Dependencies:**
  - Master voucher (CRUD)
  - Validasi voucher di checkout
  - History penggunaan voucher
  - (Opsional) Member database

#### Prioritas:
⭐⭐ **Low-Medium**

Nice to have, tapi:
- Diskon nominal sudah cukup untuk toko kecil
- Promo bundle bisa manual (edit harga)
- Member bisa dicatat di "Pelanggan"

---

### 5️⃣ PPh (Pajak Penghasilan)

**Status:** ⏭️ **Belum** (PPN sudah ada)

#### Yang Sudah Ada:
- ✅ PPN 11% otomatis
- ✅ Jurnal pajak (Pajak Keluaran 2402, Pajak Masukan 1400)
- ✅ Konfigurasi rate pajak (Pengaturan)

#### Yang Belum:
- ❌ PPh 23 (2% jasa/sewa)
- ❌ PPh 4 ayat 2 (potong supplier)
- ❌ PPh 21 (gaji karyawan)
- ❌ Bukti potong PPh
- ❌ Laporan SPT (eSPT format)

#### Implementasi:

```typescript
// Engine sudah support PPh 23/4(2)
// POS tinggal pakai

// Pembelian dengan PPh
async function pembelianDenganPph(input: {
  items: PembelianItem[];
  supplierId: string;
  pphRate?: number;  // Default 2%
}) {
  const subtotal = calculateSubtotal(input.items);
  const ppn = subtotal * 0.11;
  const pph = subtotal * (input.pphRate ?? 0.02);
  
  const total = subtotal + ppn - pph;  // PPh dipotong
  
  // Jurnal:
  // Dr. Persediaan       subtotal
  // Dr. PPN Masukan      ppn
  //   Cr. Hutang           total
  //   Cr. Hutang PPh       pph
  
  return { subtotal, ppn, pph, total };
}
```

#### Estimasi:
- **Waktu:** 1 minggu
- **Kompleksitas:** Low-Medium
- **Dependencies:**
  - Engine sudah support (tinggal UI)
  - Form input PPh rate di pembelian
  - Laporan PPh (list transaksi + total)

#### Prioritas:
⭐ **Low**

Kebanyakan toko UMKM:
- Belum PKP (tidak perlu potong PPh)
- Gaji karyawan di bawah PTKP
- Lapor SPT manual ke konsultan pajak

PPh lebih relevan untuk:
- Toko menengah-besar
- Kerjasama B2B
- Jasa/sewa rutin

---

## 📊 Ringkasan P1

| No | Fitur P1 | Status Awal | Status Sekarang | Yang Belum | Prioritas | Estimasi |
|----|----------|-------------|-----------------|------------|-----------|----------|
| 1 | Payment Gateway API | ❌ | ⏭️ 80% | API integration | ⭐⭐⭐ | 1-2 minggu |
| 2 | Printer ESC/POS | ❌ | ⏭️ 60% | Direct print | ⭐⭐⭐⭐ | 1-2 minggu |
| 3 | Reminder Piutang | ❌ | ⏭️ 10% | Auto-notification | ⭐⭐⭐ | 1 minggu |
| 4 | Voucher/Kupon | ❌ | ⏭️ 0% | Voucher system | ⭐⭐ | 1-2 minggu |
| 5 | PPh | ❌ | ⏭️ 0% | UI & laporan | ⭐ | 1 minggu |
| 6 | Retur | ❌ | ✅ 100% | - | - | - |
| 7 | Diskon | ❌ | ✅ 90% | Voucher only | - | - |
| 8 | Pajak (PPN) | ❌ | ✅ 90% | PPh only | - | - |
| 9 | Stok Opname | ❌ | ✅ 100% | - | - | - |
| 10 | Buku Besar | ❌ | ✅ 100% | - | - | - |
| 11 | Neraca Saldo | ❌ | ✅ 100% | - | - | - |
| 12 | Rekonsiliasi | ❌ | ✅ 100% | - | - | - |

**Progress P1: 87/100 selesai**

---

## 🎯 Rekomendasi Urutan Implementasi P1

### Fase P1.1 (High Priority) — 2-3 minggu
1. **Printer ESC/POS** ⭐⭐⭐⭐
   - Direct print thermal
   - Auto-print toggle
   - Test page
   
2. **Payment Gateway API** ⭐⭐⭐
   - Integrasi Midtrans/Xendit
   - QR code generator
   - Webhook handler

### Fase P1.2 (Medium Priority) — 1-2 minggu
3. **Reminder Piutang** ⭐⭐⭐
   - Notifikasi dashboard
   - WA/SMS/Email (pilih 1-2)
   - Template + jadwal

### Fase P1.3 (Nice to Have) — 2-3 minggu
4. **Voucher/Kupon** ⭐⭐
   - Master voucher
   - Validate di checkout
   - History penggunaan

5. **PPh** ⭐
   - Form input PPh
   - Laporan PPh
   - Bukti potong

---

## 💡 Alternatif: Deploy Bertahap

### Opsi A: MVP Dulu, P1 Menyusul (Recommended)
```
✅ Deploy MVP sekarang
→ UAT 1-2 minggu
→ P1.1 development (parallel)
→ Deploy P1.1 (printer + gateway)
→ P1.2 & P1.3 sesuai kebutuhan user
```

**Keuntungan:**
- User dapat value lebih cepat (time-to-market)
- Feedback real dari UAT bisa shape P1
- Revenue bisa mulai lebih cepat

### Opsi B: Selesaikan P1 Dulu, Deploy Lengkap
```
⏭️ P1.1 (2-3 minggu)
⏭️ P1.2 (1-2 minggu)
⏭️ P1.3 (2-3 minggu)
→ Deploy full P1 (6-8 minggu)
```

**Keuntungan:**
- User dapat fitur lengkap langsung
- Tidak ada "coming soon" di production
- Branding lebih profesional

**Trade-off:** Delay 2 bulan.

---

## 🚀 Kesimpulan P1

### Yang Sudah Selesai (87%)
- ✅ Retur penjualan & pembelian
- ✅ Diskon nominal lengkap
- ✅ PPN otomatis
- ✅ Stok opname
- ✅ Buku besar
- ✅ Neraca saldo
- ✅ Rekonsiliasi AR/AP
- ✅ QRIS manual
- ✅ Browser print

### Yang Belum (13%)
1. ⏭️ Printer ESC/POS (2 minggu) ⭐⭐⭐⭐
2. ⏭️ Gateway API (2 minggu) ⭐⭐⭐
3. ⏭️ Reminder piutang (1 minggu) ⭐⭐⭐
4. ⏭️ Voucher (2 minggu) ⭐⭐
5. ⏭️ PPh (1 minggu) ⭐

**Total estimasi P1 lengkap: 6-8 minggu**

---

### 🎯 Rekomendasi Final

**Deploy MVP sekarang, implementasi P1 bertahap:**

- **Week 1-2:** UAT + feedback
- **Week 3-5:** P1.1 (printer + gateway) ⭐⭐⭐⭐
- **Week 6-7:** P1.2 (reminder) ⭐⭐⭐
- **Week 8-10:** P1.3 (voucher + PPh) ⭐⭐⭐

**Alasan:**
- MVP sudah production-ready (100%)
- Browser print + QRIS manual cukup untuk mulai
- User feedback bisa shape P1 priority
- Revenue tidak tertunda 2 bulan

---

**Pertanyaan terjawab:** ✅ **Ini detail lengkap P1 dan estimasi masing-masing fitur.**
