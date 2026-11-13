# ============================================
# Script: Setup Client .env.local for POS-Sinaptex
# ============================================
# Deskripsi: Membuat file .env.local di client untuk koneksi ke backend
# Cara pakai: powershell -ExecutionPolicy Bypass -File setup-client-env.ps1
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "POS-Sinaptex Client Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Input server information
$backendUrl = Read-Host "Masukkan URL Backend Server (contoh: http://localhost:5121 atau http://192.168.1.100:5121)"
$businessId = Read-Host "Masukkan Business ID (default: toko-utama)" -Default "toko-utama"

# Default values
if ([string]::IsNullOrWhiteSpace($businessId)) {
    $businessId = "toko-utama"
}

Write-Host ""
Write-Host "✅ Konfigurasi yang akan dibuat:" -ForegroundColor Green
Write-Host "   Backend URL: $backendUrl" -ForegroundColor White
Write-Host "   Business ID: $businessId" -ForegroundColor White
Write-Host ""

# Create .env.local content
$envContent = @"
# Mode API: "mock" (data in-memory) atau "live" (HTTP ke engine C#)
NEXT_PUBLIC_API_MODE=live

# Base URL engine Accounting Engine (.NET 10)
NEXT_PUBLIC_API_BASE_URL=$backendUrl

# Id tenant ("business") pada engine
NEXT_PUBLIC_BUSINESS_ID=$businessId

# Nama penyetuju untuk batch kasir (harus berbeda dari peminta)
NEXT_PUBLIC_ENGINE_APPROVER=pemilik

# Kode akun dari chart SAK EMKM
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
"@

# Save path
$appDataPath = [Environment]::GetFolderPath("ApplicationData")
$posPath = Join-Path $appDataPath "pos-sinaptex-ui"
$envFile = Join-Path $posPath ".env.local"

Write-Host "📍 Membuat file di: $envFile" -ForegroundColor Yellow

# Create directory if not exists
if (-not (Test-Path $posPath)) {
    Write-Host "   - Membuat direktori..." -ForegroundColor Gray
    New-Item -ItemType Directory -Path $posPath | Out-Null
}

# Write .env.local
Set-Content -Path $envFile -Value $envContent -Encoding UTF8

Write-Host "   ✅ File .env.local created!" -ForegroundColor Green
Write-Host ""

# Test connection
Write-Host "🔧 Testing connection ke backend..." -ForegroundColor Yellow
try {
    # Simple port check
    $connection = Test-NetConnection -ComputerName ($backendUrl -replace "http://", "" -replace "https://", "" -replace ":.*", "") -Port ($backendUrl -replace ".*:", "") -ErrorAction SilentlyContinue
    
    if ($connection.TcpTestSucceeded) {
        Write-Host "   ✅ Port terbuka (backend mungkin sudah running)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Port tidak bisa dijangkau" -ForegroundColor Yellow
        Write-Host "   Pastikan backend sudah running di server" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  Gagal test koneksi: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Ringkasan
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "CLIENT SETUP SELESAI" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "File konfigurasi telah dibuat:" -ForegroundColor White
Write-Host "   $envFile" -ForegroundColor Gray
Write-Host ""
Write-Host "Langkah selanjutnya:" -ForegroundColor White
Write-Host "   1. Install POS-Sinaptex: POS-Sinaptex_0.1.0_x64-setup.exe" -ForegroundColor Gray
Write-Host "   2. Setelah install, launch aplikasi" -ForegroundColor Gray
Write-Host "   3. Login dengan akun pemilik" -ForegroundColor Gray
Write-Host "   4. Buka shift dan transaksi test" -ForegroundColor Gray
Write-Host ""
Write-Host "Jika ada masalah:" -ForegroundColor Yellow
Write-Host "   - Pastikan backend sudah running di server" -ForegroundColor Gray
Write-Host "   - Cek firewall tidak memblokir port $(( $backendUrl -replace ".*:", "" ))" -ForegroundColor Gray
Write-Host "   - Verifikasi URL di .env.local benar" -ForegroundColor Gray
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
