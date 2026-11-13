# Panduan Deployment Production — POS-Sinaptex

**Versi:** 1.0  
**Tanggal:** 2026-11-12

---

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Persiapan](#persiapan)
3. [Install Backend (Server)](#install-backend-server)
4. [Install POS (Client)](#install-pos-client)
5. [Verifikasi](#verifikasi)
6. [Troubleshooting](#troubleshooting)

---

## Overview

POS-Sinaptex memiliki 2 komponen utama:

```
┌────────────────────────────────────────────────────────────┐
│ SERVER (Accounting Engine)                                 │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ • Windows Service (auto-startup)                    │  │
│ │ • Port: 5121                                        │  │
│ │ • Database: SQLite                                  │  │
│ │ • Endpoint: REST API (JWT)                          │  │
│ └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
                          ↑ HTTP
                          │
┌────────────────────────────────────────────────────────────┐
│ CLIENT (POS-Sinaptex App)                                  │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ • Windows Desktop App (Tauri)                       │  │
│ │ • Config: .env.local (API URL)                      │  │
│ │ • Mode: Live (connect ke server)                    │  │
│ └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## Persiapan

### Yang Dibutuhkan:

**Server:**
- Windows 10/11 (64-bit)
- .NET 10 Runtime (jika tidak pakai self-contained)
- 4 GB RAM minimum
- 5 GB disk space

**Client:**
- Windows 10/11 (64-bit)
- 2 GB RAM minimum
- 1 GB disk space
- Akses ke server via network

**Admin:**
- Hak Administrator di server
- Hak Administrator di client (untuk install)

---

## Install Backend (Server)

### Opsi 1: Windows Service (RECOMMENDED) ⭐

Cara paling robust — backend otomatis jalan saat komputer dinyalakan.

#### Langkah 1: Jalankan Script Installation

```powershell
# Buka PowerShell sebagai Administrator
cd "e:\IYA MULYADI\MYAPP\sme-sinaptex"
.\scripts\install-backend-service.ps1
```

Script akan:
1. ✅ Build backend (jika belum)
2. ✅ Copy ke `C:\POS-Sinaptex\Engine\`
3. ✅ Install Windows Service: "POS-Sinaptex Engine"
4. ✅ Start service
5. ✅ Test endpoint API

#### Langkah 2: Verifikasi Service

```powershell
# Cek status service
Get-Service "POS-Sinaptex Engine"

# Atau via Services.msc
# Start → ketik "services.msc" → cari "POS-Sinaptex Engine"
```

**Expected:** Status = **Running**, Startup Type = **Automatic**

#### Langkah 3: Test API

```powershell
# Test login API
$body = '{"username":"pemilik","password":"pemilik123"}'
Invoke-RestMethod -Uri "http://localhost:5121/api/auth/login" `
  -Method POST -ContentType "application/json" -Body $body
```

**Expected:** Response dengan `accessToken`

---

### Opsi 2: Manual (Testing/Development)

Jalankan manual via terminal (tidak auto-startup).

#### Langkah 1: Build Backend

```powershell
cd "e:\IYA MULYADI\MYAPP\sme-sinaptex\backend"

# Restore dependencies
dotnet restore

# Build
dotnet build -c Release

# Publish
dotnet publish src/AccountingEngine.Api/AccountingEngine.Api.csproj `
  -c Release -r win-x64 --self-contained true -o ../publish/engine
```

#### Langkah 2: Jalankan Manual

```powershell
cd "e:\IYA MULYADI\MYAPP\sme-sinaptex\backend\publish\engine"

# Jalankan
.\AccountingEngine.Api.exe
```

**Note:** Terminal harus tetap terbuka saat backend jalan.

---

## Install POS (Client)

### Langkah 1: Copy Installer

Copy file ini ke client (komputer kasir):
```
src-tauri/target/release/bundle/nsis/POS-Sinaptex_0.1.0_x64-setup.exe
```

### Langkah 2: Jalankan Installer

1. Klik 2x `POS-Sinaptex_0.1.0_x64-setup.exe`
2. Wizard akan muncul → klik **Next**
3. Pilih lokasi install (default: `C:\Program Files\POS-Sinaptex`)
4. Klik **Install**
5. Tunggu proses selesai
6. Klik **Finish**

### Langkah 3: Konfigurasi .env.local

**Lokasi file:**
```
C:\Users\<username>\AppData\Roaming\pos-sinaptex-ui\.env.local
```

**Isi file:**
```env
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_API_BASE_URL=http://<IP-SERVER>:5121
NEXT_PUBLIC_BUSINESS_ID=toko-utama
NEXT_PUBLIC_ENGINE_APPROVER=pemilik
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

**⚠️ PENTING:**
- Ganti `<IP-SERVER>` dengan **IP address server** (misal: `192.168.1.100`)
- Jika server & client di PC yang sama, gunakan `localhost`

### Langkah 4: Jalankan POS

1. Klik **Start Menu** → cari "POS-Sinaptex"
2. Atau klik 2x desktop icon (jika ada)
3. Aplikasi akan terbuka

---

## Verifikasi

### 1. Test Koneksi

**Client → Server:**
```powershell
# Di client
Test-NetConnection -ComputerName <IP-SERVER> -Port 5121
```

**Expected:** TcpTestSucceeded = **True**

### 2. Test Login

1. Buka POS-Sinaptex
2. Login: `pemilik` / `pemilik123`
3. **Expected:** Dashboard muncul

### 3. Test Transaksi

1. **Buka Shift**
   - Menu Shift → Buka Shift
   - Kas awal: `500000`

2. **Transaksi**
   - Menu Kasir
   - Cari produk → tambah ke keranjang
   - Klik Bayar → Pilih metode (tunai/transfer)
   - Input nominal bayar
   - Klik Proses

3. **Cek Struk**
   - Struk harus tercetak (via browser print)

4. **Tutup Shift**
   - Menu Shift → Tutup Shift
   - Input uang fisik laci
   - Klik Tutup Shift

### 4. Test Laporan

1. **Laba-Rugi**
   - Menu Akuntansi → Laba-Rugi
   - Periode: Bulan ini
   - **Expected:** Data muncul (dari engine)

2. **Neraca Saldo**
   - Menu Akuntansi → Neraca Saldo
   - **Expected:** Saldo semua akun muncul

---

## Troubleshooting

### Error: "Gagal terhubung ke server"

**Penyebab:** Backend tidak jalan atau URL salah

**Solusi:**
```powershell
# 1. Cek backend running
netstat -an | findstr :5121

# 2. Cek service (jika pakai Windows Service)
Get-Service "POS-Sinaptex Engine"

# 3. Restart service
net stop "POS-Sinaptex Engine"
net start "POS-Sinaptex Engine"

# 4. Test API
Invoke-RestMethod -Uri "http://localhost:5121/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"pemilik","password":"pemilik123"}'
```

### Error: "Username atau password salah"

**Penyebab:** Backend belum di-bootstrap atau data tidak ada

**Solusi:**
```powershell
# Bootstrap ulang
cd "e:\IYA MULYADI\MYAPP\sme-sinaptex\backend"
python ../tools/bootstrap-backend.py

# Restart backend
net stop "POS-Sinaptex Engine"
net start "POS-Sinaptex Engine"
```

### Error: "Token expired"

**Penyebab:** Backend restart → token refresh

**Solusi:**
- Login ulang dari aplikasi

### Error: "Stok tidak cukup"

**Penyebab:** Produk stok 0

**Solusi:**
- Menu Produk → Edit produk → tambah stok awal
- Atau buat pembelian untuk tambah stok

### Struk Tidak Keluar

**Penyebab:** Printer tidak terdeteksi

**Solusi:**
- Install printer driver
- Cek printer connected (USB/LAN)
- Atau pakai printer default Windows

---

## Maintenance

### Backup Database

**Manual:**
```powershell
# Copy file database
Copy-Item "C:\POS-Sinaptex\Engine\accounting.db" `
  -Destination "C:\Backup\accounting_$(Get-Date -Format 'yyyyMMdd').db"
```

**Otomatis:**
- Setup Windows Task Scheduler (lihat `docs/DEPLOYMENT-CHECKLIST.md`)

### Log Backend

```powershell
# Event Log Windows
Get-EventLog -LogName Application -Source "POS-Sinaptex Engine" -Newest 20

# Atau check backend output (jika manual run)
```

### Update Backend

1. Stop service: `net stop "POS-Sinaptex Engine"`
2. Copy file baru ke `C:\POS-Sinaptex\Engine\`
3. Start service: `net start "POS-Sinaptex Engine"`

---

## FAQ

**Q: Apakah backend harus jalan di server yang sama dengan database?**  
A: Ya, database SQLite harus di server yang sama (atau di shared folder jika multi-cabang).

**Q: Bisa pakai SQL Server/MySQL?**  
A: Belum di MVP 1.0, cuma SQLite. Bisa request P2.

**Q: Client bisa akses via internet?**  
A: Bisa, tapi perlu VPN atau proxy (port forwarding berisiko).

**Q: Berapa maksimal concurrent client?**  
A: ~50 client (tergantung hardware server).

---

## Next Steps

Setelah MVP production:

1. **P1.1: Printer ESC/POS** (2 minggu) — direct thermal print
2. **P1.2: Gateway API** (2 minggu) — Midtrans/Xendit
3. **P1.3: Reminder Piutang** (1 minggu) — auto-notification
4. **P1.4: Voucher** (2 minggu) — kupon & promo
5. **P1.5: PPh** (1 minggu) — pajak penghasilan

---

**✅ Happy Selling! 🚀**
