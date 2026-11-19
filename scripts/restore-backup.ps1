# ============================================
# Script: Restore database dari backup
# ============================================
# Deskripsi: Menampilkan daftar backup lalu memulihkan database lewat API
#            engine (POST /api/backup/restore). Restore menimpa SELURUH
#            database; engine otomatis membuat pre-restore sebagai jalan balik.
# Cara pakai:
#   powershell -ExecutionPolicy Bypass -File restore-backup.ps1
#   powershell -ExecutionPolicy Bypass -File restore-backup.ps1 -FileName "accounting-20261113-160000Z.db"
# ============================================

param(
    [string]$BaseUrl = "http://localhost:5121",
    [string]$BusinessId = "toko-utama",
    [string]$ActorId = "system-backup",
    [string]$FileName = "",
    [string]$Reason = "Restore manual dari script restore-backup.ps1",
    [switch]$Force,
    [switch]$ListOnly
)

$ErrorActionPreference = "Stop"

$headers = @{
    "X-Business-Id" = $BusinessId
    "X-Actor-Id"    = $ActorId
    "X-Actor-Level" = "99"
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "POS-Sinaptex Restore Database" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

try {
    $daftar = @(Invoke-RestMethod -Uri "$BaseUrl/api/backup/list" -Headers $headers -TimeoutSec 30)
} catch {
    Write-Host "❌ Gagal mengambil daftar backup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

if ($daftar.Count -eq 0) {
    Write-Host "⚠️  Tidak ada backup di folder engine." -ForegroundColor Yellow
    exit 1
}

Write-Host "Daftar backup (terbaru lebih dulu):" -ForegroundColor White
for ($i = 0; $i -lt $daftar.Count; $i++) {
    $b = $daftar[$i]
    $ukuran = [math]::Round($b.sizeBytes / 1MB, 2)
    $tanda = if ($b.isPreRestore) { " [pre-restore]" } else { "" }
    Write-Host ("  [{0}] {1}  {2} MB  {3}{4}" -f $i, $b.fileName, $ukuran, $b.createdAt, $tanda) -ForegroundColor Gray
}
Write-Host ""

if ($ListOnly) {
    Write-Host "Mode daftar saja; tidak ada perubahan." -ForegroundColor Green
    exit 0
}

$pilihan = $null
if ($FileName) {
    $pilihan = $daftar | Where-Object { $_.fileName -eq $FileName } | Select-Object -First 1
    if (-not $pilihan) {
        Write-Host "❌ Backup '$FileName' tidak ditemukan." -ForegroundColor Red
        exit 1
    }
} else {
    $jawab = Read-Host "Pilih nomor backup (Enter = 0, x = batal)"
    if ($jawab -eq "x" -or $jawab -eq "X") { Write-Host "Dibatalkan." -ForegroundColor Yellow; exit 0 }
    $nomor = if ([string]::IsNullOrWhiteSpace($jawab)) { 0 } else { [int]$jawab }
    if ($nomor -lt 0 -or $nomor -ge $daftar.Count) {
        Write-Host "❌ Nomor tidak valid." -ForegroundColor Red
        exit 1
    }
    $pilihan = $daftar[$nomor]
}

Write-Host ""
Write-Host "⚠️  PERINGATAN: restore menimpa SELURUH database dengan:" -ForegroundColor Yellow
Write-Host "   $($pilihan.fileName) ($([math]::Round($pilihan.sizeBytes / 1MB, 2)) MB)" -ForegroundColor White
Write-Host "   Engine akan membuat pre-restore otomatis sebagai jalan balik." -ForegroundColor Yellow
Write-Host ""

if (-not $Force) {
    $konfirmasi = Read-Host "Ketik RESTORE untuk melanjutkan"
    if ($konfirmasi -ne "RESTORE") {
        Write-Host "Dibatalkan." -ForegroundColor Yellow
        exit 0
    }
}

$restoreHeaders = @{
    "X-Business-Id"   = $BusinessId
    "X-Actor-Id"      = $ActorId
    "X-Actor-Level"   = "99"
    "X-Reason"        = $Reason
    "Idempotency-Key" = [guid]::NewGuid().ToString()
}
$body = @{ fileName = $pilihan.fileName } | ConvertTo-Json

try {
    $hasil = Invoke-RestMethod -Uri "$BaseUrl/api/backup/restore" -Method POST `
        -Headers $restoreHeaders -ContentType "application/json" -Body $body -TimeoutSec 300
    Write-Host ""
    Write-Host "✅ Restore berhasil" -ForegroundColor Green
    Write-Host "   Dari:        $($hasil.restoredFrom)" -ForegroundColor Gray
    Write-Host "   Pre-restore: $($hasil.preRestoreBackup)" -ForegroundColor Gray
    Write-Host "   Waktu:       $($hasil.restoredAt)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Bila hasil restore salah, jalankan ulang script ini dan pilih berkas pre-restore di atas." -ForegroundColor Yellow
} catch {
    $pesan = $_.Exception.Message
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $pesan = "$pesan | $($_.ErrorDetails.Message)" }
    Write-Host ""
    Write-Host "❌ Restore GAGAL: $pesan" -ForegroundColor Red
    exit 1
}
