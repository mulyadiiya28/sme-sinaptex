# ============================================
# Script: Setup build-time .env.local for POS-Sinaptex
# ============================================
# Deskripsi: Menulis .env.local di root repo SEBELUM build. Variabel
#            NEXT_PUBLIC_* di-bake saat `npm run build`, jadi file .env di
#            folder AppData pada PC kasir TIDAK berpengaruh ke installer.
# Cara pakai: powershell -ExecutionPolicy Bypass -File setup-client-env.ps1
# ============================================

param(
    [string]$BackendUrl,
    [string]$BusinessId = "toko-utama",
    [string]$OutputPath = (Join-Path $PSScriptRoot "..\.env.local")
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "POS-Sinaptex Client Build Config" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (-not $BackendUrl) {
    $BackendUrl = Read-Host "Masukkan URL Backend Server (contoh: http://192.168.1.100:5121)"
}
if ([string]::IsNullOrWhiteSpace($BusinessId)) {
    $BusinessId = "toko-utama"
}

$outputPath = [System.IO.Path]::GetFullPath($OutputPath)
if (-not $BackendUrl -or $BackendUrl.Trim().Length -eq 0) {
    Write-Host "❌ ERROR: URL backend wajib diisi." -ForegroundColor Red
    exit 1
}

$envContent = @"
# Mode API: "mock" (data in-memory) atau "live" (HTTP ke engine C#)
NEXT_PUBLIC_API_MODE=live

# Base URL engine Accounting Engine (.NET 10)
NEXT_PUBLIC_API_BASE_URL=$($BackendUrl.TrimEnd('/'))

# Id tenant ("business") pada engine
NEXT_PUBLIC_BUSINESS_ID=$BusinessId

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

Write-Host "📍 Menulis: $outputPath" -ForegroundColor Yellow
Set-Content -Path $outputPath -Value $envContent -Encoding UTF8
Write-Host "   ✅ .env.local dibuat (nilai di-bake saat build berikutnya)" -ForegroundColor Green
Write-Host ""

Write-Host "🔧 Testing koneksi ke backend..." -ForegroundColor Yellow
try {
    $uri = [Uri]$BackendUrl
    $connection = Test-NetConnection -ComputerName $uri.Host -Port $uri.Port -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "   ✅ Port $($uri.Port) terbuka" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Port $($uri.Port) tidak bisa dijangkau" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Gagal test koneksi: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Langkah selanjutnya (WAJIB build ulang):" -ForegroundColor White
Write-Host "   1. npm run build" -ForegroundColor Gray
Write-Host "   2. npx tauri build" -ForegroundColor Gray
Write-Host "   3. Distribusikan installer hasil build ke PC kasir" -ForegroundColor Gray
Write-Host ""
Write-Host "Catatan: mengubah .env.local setelah installer dibangun tidak berefek." -ForegroundColor Yellow
Write-Host "         Build ulang installer bila IP server berubah." -ForegroundColor Yellow
