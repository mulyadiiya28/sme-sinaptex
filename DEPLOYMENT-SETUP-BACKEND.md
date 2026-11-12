# Setup Backend Accounting Engine - Manual Guide

**Status:** Backend build dan migration berhasil, tapi server perlu direstart dengan konfigurasi yang benar.

---

## ✅ Yang Sudah Selesai:

1. **Frontend Build** ✅
   - `npm run build` → 20 static pages
   - Tauri build → `POS-Sinaptex_0.1.0_x64-setup.exe` (2.4 MB)

2. **Database Migration** ✅
   - `dotnet ef database update` → 2 migrations applied:
     - `20261112013529_AddSaleItemDiscount`
     - `20261112021939_AddPostingPlanPaymentLegs`

3. **Bootstrap** ✅
   - Tenant: `toko-utama`
   - Owner: `pemilik` / `pemilik123`
   - RBAC roles

---

## ⚠️ Backend Server - Manual Restart Required

Backend server belum responsif karena konfigurasi Kestrel.

### Langkah-langkah Restart Backend:

**1. Stop semua dotnet process:**
```powershell
Get-Process dotnet | Stop-Process -Force
```

**2. Jalankan dengan explicit URL:**
```powershell
cd "e:\IYA MULYADI\MYAPP\sme-sinaptex\backend"

# Option A: Gunakan ASPNETCORE_URLS environment variable
$env:ASPNETCORE_URLS="http://localhost:5121"
dotnet run --project src/AccountingEngine.Api/AccountingEngine.Api.csproj

# Option B: Gunakan --urls flag
dotnet run --project src/AccountingEngine.Api/AccountingEngine.Api.csproj `
  --urls "http://localhost:5121"
```

**3. Verifikasi backend running:**
```powershell
# Test endpoint login
curl.exe -s -X POST http://localhost:5121/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"username":"pemilik","password":"pemilik123"}'
```

**Expected response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refresh_token": "some-refresh-token...",
  "expires_in": 3600
}
```

**4. Seed chart of accounts:**
```powershell
# Set token dari step 3
$token = "<access_token_dari_step_3>"

# Seed chart of accounts
curl.exe -s -X POST http://localhost:5121/api/accounts/seed `
  -H "Content-Type: application/json" `
  -H "X-Business-Id: toko-utama" `
  -H "Authorization: Bearer $token"
```

**5. Seed chart of accounts (dengan token):**
```powershell
curl.exe -s -X POST http://localhost:5121/api/accounts/seed `
  -H "Content-Type: application/json" `
  -H "X-Business-Id: toko-utama" `
  -H "Authorization: Bearer $(if ($env:BACKEND_TOKEN) { $env:BACKEND_TOKEN } else { $token })"
```

---

## 🔧 Fix Kestrel Configuration

Jika backend masih tidak responsif, tambahkan Kestrel config ke `appsettings.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:5121"
      }
    }
  }
}
```

Atau edit `Properties/launchSettings.json`:
```json
{
  "$schema": "https://json.schemastore.org/launchsettings.json",
  "profiles": {
    "http": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": false,
      "applicationUrl": "http://localhost:5121",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

---

## 📋 Deployment Checklist - Backend

- [ ] Stop semua dotnet process
- [ ] Jalankan backend dengan `dotnet run --urls http://localhost:5121`
- [ ] Test endpoint `/api/auth/login` → dapat token
- [ ] Seed chart of accounts (`/api/accounts/seed`)
- [ ] Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:5121` di `.env.local`
- [ ] Test login frontend dengan mode live
- [ ] Test transaksi kasir (buka shift → checkout → tutup shift)
- [ ] Test laporan (laba-rugi, neraca saldo)

---

## 📞 Troubleshooting Backend

### Error: "Connection refused" / "Unable to connect"
- Cek port 5121 tidak dipakai aplikasi lain: `netstat -an | findstr :5121`
- Cek firewall tidak memblokir port 5121
- Cek appsettings.json punya connection string

### Error: "Connection string not configured"
- Pastikan `appsettings.json` punya:
  ```json
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=accounting.db"
  }
  ```

### Error: "No migrations found"
- Jalankan: `dotnet ef database update` dari folder `backend/`
- Atau: `dotnet ef migrations add -p src/AccountingEngine.Infrastructure -s src/AccountingEngine.Api`

---

## 🚀 Production Deployment

### Mode A: Standalone (1 PC, toko tunggal)

1. Copy folder `backend/publish/engine/` ke server toko
2. Jalankan: `dotnet AccountingEngine.Api.dll`
3. Copy `accounting.db` yang sudah di-migrate + bootstrap
4. Install POS app (NSIS installer)
5. Set `.env.local` → `API_BASE_URL=http://localhost:5121`

### Mode B: LAN (Server + N Kasir)

1. Install backend di server toko
2. Edit `appsettings.json` → bind `0.0.0.0:5121`
3. Buka firewall port 5121
4. Kasir → set `.env.local` → `API_BASE_URL=http://<IP-SERVER>:5121`

---

## ✅ Status Deployment

| Komponen | Status |
|----------|--------|
| Frontend Build | ✅ Complete |
| Tauri NSIS Installer | ✅ Complete (2.4 MB) |
| Database Migration | ✅ Complete |
| Bootstrap Tenant | ✅ Complete |
| Backend Build | ✅ Complete |
| Backend Server | ⚠️ Manual restart required |
| Chart of Accounts Seed | ⏳ Setelah backend running |

---

**Backend server perlu direstart dengan konfigurasi yang benar. Setelah itu, deployment production siap!** 🚀
