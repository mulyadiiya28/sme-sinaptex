# ============================================
# Script: Install Scheduled Task backup harian
# ============================================
# Deskripsi: Mendaftarkan Task Scheduler yang menjalankan backup-auto.ps1
#            setiap hari (default 23:00). Juga mendaftarkan sumber Event Log
#            untuk notifikasi kegagalan.
# Cara pakai (Administrator):
#   powershell -ExecutionPolicy Bypass -File install-backup-task.ps1
#   powershell -ExecutionPolicy Bypass -File install-backup-task.ps1 -RunAt "22:30" -KeepDays 30
# ============================================

param(
    [string]$BaseUrl = "http://localhost:5121",
    [string]$BusinessId = "toko-utama",
    [int]$KeepDays = 30,
    [string]$BackupDirectory = "C:\POS-Sinaptex\Engine\backups",
    [string]$LogDirectory = "C:\POS-Sinaptex\logs",
    [string]$EnginePath = "C:\POS-Sinaptex\Engine",
    [string]$WebhookUrl = "",
    [string]$RunAt = "23:00",
    [string]$TaskName = "POS-Sinaptex Backup",
    [switch]$RunNow
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "POS-Sinaptex Backup Installer (Scheduled Task)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: Script harus dijalankan sebagai Administrator!" -ForegroundColor Red
    Write-Host "   Klik kanan PowerShell → 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

if ($RunAt -notmatch '^([01]?\d|2[0-3]):[0-5]\d$') {
    Write-Host "❌ ERROR: -RunAt harus berformat HH:mm (contoh 23:00)." -ForegroundColor Red
    exit 1
}

$scriptPath = Join-Path $PSScriptRoot "backup-auto.ps1"
if (-not (Test-Path -LiteralPath $scriptPath)) {
    Write-Host "❌ ERROR: backup-auto.ps1 tidak ditemukan di $PSScriptRoot" -ForegroundColor Red
    exit 1
}

Write-Host "📍 Konfigurasi:" -ForegroundColor White
Write-Host "   Task Name:   $TaskName" -ForegroundColor Gray
Write-Host "   Jadwal:      setiap hari $RunAt" -ForegroundColor Gray
Write-Host "   Engine:      $BaseUrl" -ForegroundColor Gray
Write-Host "   Business:    $BusinessId" -ForegroundColor Gray
Write-Host "   Retensi:     $KeepDays hari" -ForegroundColor Gray
Write-Host "   Backup dir:  $BackupDirectory" -ForegroundColor Gray
Write-Host "   Log dir:     $LogDirectory" -ForegroundColor Gray
Write-Host ""

Write-Host "[1/4] Cek koneksi engine..." -ForegroundColor Yellow
$headers = @{ "X-Actor-Id" = "system-backup"; "X-Actor-Level" = "99" }
try {
    $daftar = Invoke-RestMethod -Uri "$BaseUrl/api/backup/list" -Headers $headers -TimeoutSec 10
    Write-Host "   ✅ Engine merespons ($(@($daftar).Count) backup ditemukan)" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Engine belum merespons: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "      Jalankan install-backend-service.ps1 lebih dulu, lalu ulangi." -ForegroundColor Yellow
}
Write-Host ""

Write-Host "[2/4] Mendaftarkan sumber Event Log..." -ForegroundColor Yellow
try {
    if (-not [System.Diagnostics.EventLog]::SourceExists("POS-Sinaptex Backup")) {
        New-EventLog -LogName Application -Source "POS-Sinaptex Backup"
        Write-Host "   ✅ Sumber 'POS-Sinaptex Backup' dibuat" -ForegroundColor Green
    } else {
        Write-Host "   ✅ Sumber Event Log sudah ada" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Gagal membuat sumber Event Log: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "[3/4] Memeriksa retensi engine di appsettings.json..." -ForegroundColor Yellow
$appsettingsPath = Join-Path $EnginePath "appsettings.json"
if (Test-Path -LiteralPath $appsettingsPath) {
    try {
        $settings = Get-Content -LiteralPath $appsettingsPath -Raw | ConvertFrom-Json
        $retensiEngine = $settings.Backup.RetentionCount
        if (-not $retensiEngine -or [int]$retensiEngine -lt $KeepDays) {
            Write-Host "   ⚠️  Backup:RetentionCount engine = $retensiEngine (lebih kecil dari $KeepDays)." -ForegroundColor Yellow
            Write-Host "      Tambahkan di appsettings.json:" -ForegroundColor Yellow
            Write-Host ('      "Backup": { "RetentionCount": ' + $KeepDays + ' }') -ForegroundColor Gray
            Write-Host "      lalu restart: Stop-ScheduledTask/Start-ScheduledTask -TaskName `"POS-Sinaptex Engine`"" -ForegroundColor Yellow
        } else {
            Write-Host "   ✅ RetentionCount engine = $retensiEngine" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ⚠️  Tidak bisa membaca appsettings.json: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  $appsettingsPath tidak ditemukan; lewati pemeriksaan." -ForegroundColor Yellow
}
Write-Host ""

Write-Host "[4/4] Mendaftarkan Scheduled Task..." -ForegroundColor Yellow
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$arguments = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$scriptPath`"",
    "-BaseUrl", "`"$BaseUrl`"",
    "-BusinessId", "`"$BusinessId`"",
    "-KeepDays", "$KeepDays",
    "-BackupDirectory", "`"$BackupDirectory`"",
    "-LogDirectory", "`"$LogDirectory`""
)
if ($WebhookUrl) {
    $arguments += @("-WebhookUrl", "`"$WebhookUrl`"")
}
$argumentString = $arguments -join " "

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argumentString
$trigger = New-ScheduledTaskTrigger -Daily -At $RunAt
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 5) `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal `
    -Settings $settings -Description "POS-Sinaptex backup database harian" | Out-Null

Write-Host "   ✅ Scheduled Task terdaftar" -ForegroundColor Green
Write-Host ""

if ($RunNow) {
    Write-Host "Menjalankan backup sekarang..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 8
    $info = Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo
    Write-Host "   LastRunTime: $($info.LastRunTime)" -ForegroundColor Gray
    Write-Host "   LastResult:  $($info.LastTaskResult)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "RINGKASAN" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Task:     $TaskName (SYSTEM, harian $RunAt)" -ForegroundColor Gray
Write-Host "   Log:      $LogDirectory" -ForegroundColor Gray
Write-Host "   Backup:   $BackupDirectory" -ForegroundColor Gray
Write-Host ""
Write-Host "Perintah berguna:" -ForegroundColor White
Write-Host "   Jalankan sekarang: Start-ScheduledTask -TaskName `"$TaskName`"" -ForegroundColor Gray
Write-Host "   Status:            Get-ScheduledTask -TaskName `"$TaskName`" | Get-ScheduledTaskInfo" -ForegroundColor Gray
Write-Host "   Hapus task:        Unregister-ScheduledTask -TaskName `"$TaskName`" -Confirm:`$false" -ForegroundColor Gray
Write-Host "   Uji restore:       powershell -ExecutionPolicy Bypass -File restore-backup.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "INSTALASI BACKUP SELESAI!" -ForegroundColor Green
