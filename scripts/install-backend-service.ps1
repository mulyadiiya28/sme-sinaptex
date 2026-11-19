# ============================================
# Script: Install POS-Sinaptex Backend (auto-start)
# ============================================
# Deskripsi: Publish backend Accounting Engine lalu daftarkan Scheduled Task
#            yang jalan saat Windows startup. Engine adalah aplikasi ASP.NET Core
#            biasa, BUKAN Windows Service (tidak ada AddWindowsService).
# Cara pakai: powershell -ExecutionPolicy Bypass -File install-backend-service.ps1
# ============================================

param(
    [string]$BackendPath = (Join-Path $PSScriptRoot "..\backend"),
    [string]$InstallPath = "C:\POS-Sinaptex\Engine",
    [string]$Urls = "http://0.0.0.0:5121",
    [string]$TaskName = "POS-Sinaptex Engine"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "POS-Sinaptex Backend Installer (Scheduled Task)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: Script harus dijalankan sebagai Administrator!" -ForegroundColor Red
    Write-Host "   Klik kanan PowerShell → 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

$backendPath = [System.IO.Path]::GetFullPath($BackendPath)
$publishFolder = Join-Path $backendPath "publish\engine"

Write-Host "📍 Konfigurasi:" -ForegroundColor White
Write-Host "   Backend Path: $backendPath" -ForegroundColor Gray
Write-Host "   Install Path: $InstallPath" -ForegroundColor Gray
Write-Host "   Task Name:    $TaskName" -ForegroundColor Gray
Write-Host "   Listen URL:   $Urls" -ForegroundColor Gray
Write-Host ""

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ ERROR: Backend path tidak ditemukan: $backendPath" -ForegroundColor Red
    exit 1
}

Write-Host "[1/5] Checking backend files..." -ForegroundColor Yellow
if (-not (Test-Path (Join-Path $publishFolder "AccountingEngine.Api.exe"))) {
    Write-Host "   Publish folder belum ada, build backend..." -ForegroundColor Yellow

    dotnet restore (Join-Path $backendPath "AccountingEngine.slnx")
    dotnet build (Join-Path $backendPath "AccountingEngine.slnx") -c Release
    dotnet publish (Join-Path $backendPath "src\AccountingEngine.Api\AccountingEngine.Api.csproj") `
        -c Release -r win-x64 --self-contained true -o $publishFolder

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR: Build/publish backend gagal!" -ForegroundColor Red
        exit 1
    }
}
Write-Host "   ✅ Backend files found" -ForegroundColor Green
Write-Host ""

Write-Host "[2/5] Installing to $InstallPath..." -ForegroundColor Yellow
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath | Out-Null
}
Copy-Item -Path (Join-Path $publishFolder "*") -Destination $InstallPath -Recurse -Force

$appsettingsPath = Join-Path $InstallPath "appsettings.json"
if (Test-Path $appsettingsPath) {
    $settings = Get-Content $appsettingsPath -Raw | ConvertFrom-Json
    $berubah = $false
    if (-not $settings.ConnectionStrings -or -not $settings.ConnectionStrings.DefaultConnection) {
        $connectionStrings = [ordered]@{ DefaultConnection = "Data Source=accounting.db" }
        $settings | Add-Member -MemberType NoteProperty -Name "ConnectionStrings" -Value $connectionStrings -Force
        $berubah = $true
        Write-Host "   ✅ ConnectionStrings.DefaultConnection ditambahkan ke appsettings.json" -ForegroundColor Green
    }
    if (-not $settings.Backup -or -not $settings.Backup.RetentionCount) {
        $backup = [ordered]@{ RetentionCount = 30 }
        $settings | Add-Member -MemberType NoteProperty -Name "Backup" -Value $backup -Force
        $berubah = $true
        Write-Host "   ✅ Backup.RetentionCount = 30 ditambahkan ke appsettings.json" -ForegroundColor Green
    }
    if ($berubah) {
        $settings | ConvertTo-Json -Depth 10 | Set-Content $appsettingsPath -Encoding UTF8
    }
}
Write-Host "   ✅ Files copied" -ForegroundColor Green
Write-Host ""

Write-Host "[3/5] Membersihkan instalasi lama..." -ForegroundColor Yellow
$legacyService = Get-Service -Name $TaskName -ErrorAction SilentlyContinue
if ($legacyService) {
    Write-Host "   Menghapus Windows Service lama (tidak didukung engine)..." -ForegroundColor Gray
    Stop-Service -Name $TaskName -Force -ErrorAction SilentlyContinue
    sc.exe delete $TaskName | Out-Null
}
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Write-Host "   Menghapus Scheduled Task lama..." -ForegroundColor Gray
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}
Write-Host "   ✅ Bersih" -ForegroundColor Green
Write-Host ""

Write-Host "[4/5] Mendaftarkan Scheduled Task (auto-start saat boot)..." -ForegroundColor Yellow
$exePath = Join-Path $InstallPath "AccountingEngine.Api.exe"
$action = New-ScheduledTaskAction -Execute $exePath -Argument "--urls $Urls" -WorkingDirectory $InstallPath
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal `
    -Settings $settings -Description "POS-Sinaptex Accounting Engine (ASP.NET Core)" | Out-Null

Write-Host "   ✅ Scheduled Task terdaftar" -ForegroundColor Green
Write-Host ""

Write-Host "[5/5] Menjalankan backend..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 5
Write-Host "   ✅ Task dijalankan" -ForegroundColor Green
Write-Host ""

$port = if ($Urls -match ":(\d+)") { [int]$Matches[1] } else { 5121 }

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "VERIFIKASI" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($connection) {
    Write-Host "   ✅ Port $port listening" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Port $port belum listening (cek Task Scheduler → Last Run Result)" -ForegroundColor Yellow
}

try {
    $body = '{"username":"pemilik","password":"pemilik123"}'
    $response = Invoke-RestMethod -Uri "http://localhost:$port/api/auth/login" `
        -Method POST -ContentType "application/json" -Body $body -TimeoutSec 5
    if ($response.accessToken) {
        Write-Host "   ✅ API login OK" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  API merespons tanpa accessToken" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Gagal test API: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "RINGKASAN" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Task:      $TaskName (SYSTEM, AtStartup)" -ForegroundColor Gray
Write-Host "   Path:      $InstallPath" -ForegroundColor Gray
Write-Host "   Database:  $InstallPath\accounting.db" -ForegroundColor Gray
Write-Host "   Listen:    $Urls" -ForegroundColor Gray
Write-Host ""
Write-Host "Perintah berguna:" -ForegroundColor White
Write-Host "   Start:   Start-ScheduledTask -TaskName `"$TaskName`"" -ForegroundColor Gray
Write-Host "   Stop:    Stop-ScheduledTask -TaskName `"$TaskName`"" -ForegroundColor Gray
Write-Host "   Status:  Get-ScheduledTask -TaskName `"$TaskName`" | Get-ScheduledTaskInfo" -ForegroundColor Gray
Write-Host "   Log:     Event Viewer → Applications and Services Logs → Microsoft → Windows → TaskScheduler" -ForegroundColor Gray
Write-Host ""
Write-Host "Setelah backend jalan, bootstrap (sekali):" -ForegroundColor White
Write-Host "   python tools\bootstrap-backend.py" -ForegroundColor Gray
Write-Host "   POST http://localhost:$port/api/accounts/seed (dengan token login)" -ForegroundColor Gray
Write-Host ""
Write-Host "INSTALASI SELESAI!" -ForegroundColor Green
