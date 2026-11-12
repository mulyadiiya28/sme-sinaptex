# Deployment Checklist — POS-Sinaptex MVP

**Status MVP:** 100% Complete (95/95 fitur) ✅  
**Tanggal:** 2026-11-12  
**Target:** Production-ready desktop app (Tauri 2 + Engine .NET 10)

---

## 📋 Pre-Deployment Checklist

### 1. Frontend (Next.js + Tauri)

- [x] **TypeScript clean** → `npx tsc --noEmit` (0 errors)
- [x] **Build sukses** → `npm run build` (20 static pages)
- [x] **Bug fixes complete** → 20 lokasi diperbaiki (console.error, array bounds)
- [ ] **Environment variables** → setup `.env.production`
- [ ] **Icon assets** → verifikasi `src-tauri/icons/` lengkap
- [ ] **Tauri build test** → `npx tauri build` sekali untuk test installer

### 2. Backend (Accounting Engine .NET 10)

- [x] **Tests passing** → `dotnet test` (1242 tests: 490 unit + 752 integration)
- [ ] **Database migration** → `dotnet ef database update`
- [ ] **Bootstrap tenant** → `python tools/bootstrap-backend.py`
- [ ] **Seed chart** → `POST /api/accounts/seed`
- [ ] **Production config** → `appsettings.Production.json` (connection string, JWT secret)
- [ ] **Windows Service setup** → (optional, bisa jalan biasa dulu via `dotnet run`)

### 3. Environment Configuration

**Buat file `.env.production` untuk mode live:**

```env
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_API_BASE_URL=http://localhost:5121
NEXT_PUBLIC_BUSINESS_ID=toko-utama
NEXT_PUBLIC_ENGINE_APPROVER=pemilik

# Chart accounts (sesuaikan setelah seed)
NEXT_PUBLIC_ENGINE_KAS=1121
NEXT_PUBLIC_ENGINE_BANK=1111
NEXT_PUBLIC_ENGINE_GATEWAY=1130
NEXT_PUBLIC_ENGINE_PIUTANG=1200
NEXT_PUBLIC_ENGINE_PERSEDIAAN=1300
NEXT_PUBLIC_ENGINE_HUTANG=2101
NEXT_PUBLIC_ENGINE_PENDAPATAN=4000
NEXT_PUBLIC_ENGINE_HPP=5000
NEXT_PUBLIC_ENGINE_PAJAK=2402
NEXT_PUBLIC_ENGINE_BIAYA=6900
```

### 4. Manual Testing Scenarios

**Test sebelum deploy ke production:**

#### Scenario 1: Shift Flow (Kasir)
- [ ] Login kasir (`kasir` / `kasir123`)
- [ ] Buka shift (kas awal sesuai kebijakan)
- [ ] Transaksi tunai lunas
- [ ] Transaksi pembayaran campuran (tunai + transfer)
- [ ] Transaksi QRIS (menunggu konfirmasi)
- [ ] Tutup shift (hitung selisih)

#### Scenario 2: Pembayaran & Piutang (Owner)
- [ ] Login owner (`pemilik` / `pemilik123`)
- [ ] Konfirmasi QRIS dari Riwayat
- [ ] Transaksi kredit penuh (piutang)
- [ ] Pelunasan piutang dari menu Kasir (F6)
- [ ] Cek laporan umur piutang

#### Scenario 3: Pembelian & Stok
- [ ] Pembelian tunai (tanpa supplier boleh)
- [ ] Pembelian hutang (wajib supplier)
- [ ] Retur pembelian (alokasi per baris)
- [ ] Cek kartu stok produk

#### Scenario 4: Akuntansi
- [ ] Cek jurnal otomatis (penjualan, pembelian, retur)
- [ ] Cek neraca saldo (opening/closing balance)
- [ ] Cek laba-rugi
- [ ] Catat biaya operasional

#### Scenario 5: Persediaan
- [ ] Penyesuaian stok (tambah/kurang)
- [ ] Transfer antar gudang
- [ ] Opname stok (buat → complete)
- [ ] Cek nilai persediaan

#### Scenario 6: Approval Workflow
- [ ] Buat aturan approval (nominal > X)
- [ ] Transaksi yang kena aturan → status SUBMITTED
- [ ] Approve dari menu Persetujuan
- [ ] Batch di-post → transaksi POSTED

### 5. Database Backup Strategy

**Sebelum production:**
- [ ] Setup backup otomatis (gunakan menu Pengaturan → Backup)
- [ ] Test restore dari backup
- [ ] Dokumentasikan lokasi backup (`backend/src/AccountingEngine.Api/backups/`)

### 6. User Accounts Setup

**Buat user production:**
- [ ] Owner utama (authority level 99)
- [ ] Kasir 1, 2, ... (authority level 2)
- [ ] Test login tiap user
- [ ] Verifikasi RBAC (kasir tidak bisa akses menu owner)

---

## 🚀 Deployment Steps

### Step 1: Build Desktop Installer

```powershell
# 1. Clean build
npm install
npm run build

# 2. Build Tauri (NSIS + MSI installer)
npx tauri build

# Output:
# - src-tauri\target\release\POS-Sinaptex.exe (app executable)
# - src-tauri\target\release\bundle\nsis\POS-Sinaptex_0.1.0_x64-setup.exe (installer)
# - src-tauri\target\release\bundle\msi\POS-Sinaptex_0.1.0_x64_id-ID.msi (MSI)
```

### Step 2: Deploy Backend Engine

**Option A: Standalone EXE (recommended untuk toko tunggal)**

```powershell
cd backend
dotnet publish src/AccountingEngine.Api/AccountingEngine.Api.csproj `
  -c Release `
  -r win-x64 `
  --self-contained true `
  -o ../publish/engine

# Output: publish/engine/AccountingEngine.Api.exe
```

**Option B: Windows Service (untuk server LAN multi-cabang)**

```powershell
# Install as service (requires admin)
sc create "POS-Sinaptex Engine" binPath="C:\path\to\AccountingEngine.Api.exe" start=auto
sc start "POS-Sinaptex Engine"
```

### Step 3: Setup Database

```powershell
cd backend

# 1. Migration (buat database)
dotnet ef database update `
  -p src/AccountingEngine.Infrastructure `
  -s src/AccountingEngine.Api `
  --configuration Release

# 2. Bootstrap (tenant + owner + RBAC)
python ../tools/bootstrap-backend.py

# 3. Seed chart of accounts
# Jalankan engine dulu:
dotnet run --project src/AccountingEngine.Api --configuration Release

# Lalu POST seed (via Postman/curl):
# POST http://localhost:5121/api/accounts/seed
# Authorization: Bearer <token dari login pemilik>
```

### Step 4: First Run Test

1. **Jalankan engine** (standalone atau service)
2. **Install POS app** dari `POS-Sinaptex_0.1.0_x64-setup.exe`
3. **Launch** → login owner → verifikasi dashboard
4. **Buka shift** → transaksi test → tutup shift
5. **Cek jurnal** → semua entry seimbang

---

## 📦 Distribusi ke Toko

### Topology Mode A: LAN Offline (1 server + N kasir)

**Setup:**
1. **Server toko** → install engine + database
2. **Kasir 1, 2, ...** → install POS app
3. **Config kasir** → `.env.local` tiap kasir:
   ```env
   NEXT_PUBLIC_API_MODE=live
   NEXT_PUBLIC_API_BASE_URL=http://<IP-SERVER>:5121
   ```

**Catatan:**
- Engine harus binding `0.0.0.0` (bukan `localhost`), edit `appsettings.json`:
  ```json
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://0.0.0.0:5121"
      }
    }
  }
  ```

### Topology Mode B: Standalone (1 toko, 1 PC)

**Setup:**
1. Install engine + POS di PC yang sama
2. Config `.env.local` → `API_BASE_URL=http://localhost:5121`
3. Jalankan engine otomatis saat startup (Windows Task Scheduler)

---

## 🔧 Post-Deployment Maintenance

### Daily
- [ ] Backup database (via menu Pengaturan)
- [ ] Cek audit log (error, void, approval)

### Weekly
- [ ] Review umur piutang/hutang
- [ ] Reconcile kas fisik vs sistem

### Monthly
- [ ] Tutup periode fiskal (bila aktifkan fitur periode)
- [ ] Export laba-rugi untuk akuntan

---

## ⚠️ Known Limitations (bukan bug, by design)

1. **Kembalian tidak tersimpan** di riwayat live (engine tidak mencatat, yang masuk laci hanya yang diterima)
2. **Satu shift aktif per tenant** (bukan per kasir) — nama kasir di struk = user login
3. **Master supplier** tidak bisa diubah kode/nama (engine init-only, jaga integritas faktur lama)
4. **Logo toko** mode mock tidak bisa upload (tidak ada file storage di browser)
5. **Diskon transaksi** disebar ke baris di live (engine hanya simpan diskon per baris)

---

## 📞 Support & Troubleshooting

### Error: "Failed to fetch" / "Network error"
→ Cek engine running (`netstat -an | findstr 5121`)  
→ Cek firewall allow port 5121  
→ Cek `.env.local` BASE_URL benar

### Error: "Token expired"
→ Refresh token auto-handle, tapi kalau engine restart → login ulang

### Error: "Approval required"
→ Pemilik harus approve dari menu Persetujuan (batch tertahan)

### Transaksi "Menunggu pembayaran" tidak bisa dikonfirmasi
→ Cek akun gateway (1130) sudah ada di engine  
→ Cek kaki pembayaran QRIS ada di `GET /api/sales/{id}/payments`

### Stok negatif setelah penjualan
→ Bukan bug: engine allow negative stock (kasir bisa jual dulu, restok belakangan)

---

## ✅ Production Go-Live Approval

**Sign-off sebelum production:**

- [ ] Owner toko sudah training (minimal 2 jam hands-on)
- [ ] Kasir sudah training shift flow
- [ ] Database backup strategy aktif
- [ ] Support contact ready (phone/WA)
- [ ] Fallback plan (bila engine down → mode mock sementara? catat manual?)

**Approved by:** _______________  
**Date:** _______________

---

## 🎯 Next: P1 Features (Post-Launch)

Setelah MVP production stabil (1-2 minggu), bisa mulai P1:

1. **Printer ESC/POS** (⭐⭐⭐⭐) — direct thermal, no browser print
2. **Payment Gateway API** (⭐⭐⭐) — Midtrans/Xendit integration
3. **Reminder Piutang** (⭐⭐⭐) — auto-notification via email/WA
4. **Voucher/Kupon** (⭐⭐) — voucher code redemption
5. **PPh** (⭐) — PPh 23/4(2) calculation

Estimasi: 6-8 minggu untuk semua P1.

---

**POS-Sinaptex MVP — Ready for Production** 🚀
