# ============================================
# Script: Install POS-Sinaptex Backend Service
# ============================================
# Deskripsi: Install backend Accounting Engine sebagai Windows Service
# Cara pakai: powershell -ExecutionPolicy Bypass -File install-backend-service.ps1
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "POS-Sinaptex Backend Service Installer" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Cek apakah script dijalankan sebagai Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: Script harus dijalankan sebagai Administrator!" -ForegroundColor Red
    Write-Host "   Klik kanan PowerShell → 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Script dihentikan." -ForegroundColor Red
    exit 1
}

# Konfigurasi
$serviceName = "POS-Sinaptex Engine"
$serviceDisplayName = "POS-Sinaptex Accounting Engine"
$backendPath = "e:\IYA MULYADI\MYAPP\sme-sinaptex\backend"
$installPath = "C:\POS-Sinaptex\Engine"
$publishFolder = Join-Path $backendPath "publish\engine"

Write-Host "📍 Konfigurasi:" -ForegroundColor White
Write-Host "   Backend Path: $backendPath" -ForegroundColor Gray
Write-Host "   Install Path: $installPath" -ForegroundColor Gray
Write-Host "   Service Name: $serviceName" -ForegroundColor Gray
Write-Host ""

# Step 1: Check if backend exists
Write-Host "[1/5] Checking backend files..." -ForegroundColor Yellow
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ ERROR: Backend path tidak ditemukan: $backendPath" -ForegroundColor Red
    Write-Host "   Pastikan folder backend ada di lokasi yang benar" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $publishFolder)) {
    Write-Host "⚠️  WARNING: Publish folder tidak ditemukan!" -ForegroundColor Yellow
    Write-Host "   Memulai build backend..." -ForegroundColor Yellow
    
    Write-Host "   - Restoring dependencies..." -ForegroundColor Gray
    dotnet restore "$backendPath\AccountingEngine.slnx"
    
    Write-Host "   - Building backend..." -ForegroundColor Gray
    dotnet build "$backendPath\AccountingEngine.slnx" -c Release
    
    Write-Host "   - Publishing backend..." -ForegroundColor Gray
    dotnet publish "$backendPath\src\AccountingEngine.Api\AccountingEngine.Api.csproj" `
        -c Release -r win-x64 --self-contained true -o "$publishFolder"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR: Build/publish backend gagal!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "   ✅ Backend files found" -ForegroundColor Green
Write-Host ""

# Step 2: Copy files to install location
Write-Host "[2/5] Installing to $installPath..." -ForegroundColor Yellow

# Create install directory if not exists
if (-not (Test-Path $installPath)) {
    New-Item -ItemType Directory -Path $installPath | Out-Null
}

# Copy all files
Copy-Item -Path "$publishFolder\*" -Destination $installPath -Recurse -Force

Write-Host "   ✅ Files copied" -ForegroundColor Green
Write-Host ""

# Step 3: Check if service already exists
Write-Host "[3/5] Checking service status..." -ForegroundColor Yellow

$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($existingService) {
    Write-Host "   Service '$serviceName' sudah ada!" -ForegroundColor Yellow
    
    $choice = Read-Host "Apakah ingin menghentikan dan menghapus service lama? (Y/N)"
    if ($choice -eq "Y" -or $choice -eq "y") {
        Write-Host "   - Menghentikan service..." -ForegroundColor Gray
        Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
        
        Write-Host "   - Menghapus service..." -ForegroundColor Gray
        sc.exe delete $serviceName
        
        Start-Sleep -Seconds 2
    } else {
        Write-Host "   Service tidak diubah. Keluar." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "   ✅ Service ready to install" -ForegroundColor Green
Write-Host ""

# Step 4: Install Windows Service
Write-Host "[4/5] Installing Windows Service..." -ForegroundColor Yellow

$exePath = Join-Path $installPath "AccountingEngine.Api.exe"
$escapedExePath = $exePath -replace '\\', '\\'

# Install service
sc.exe create $serviceName `
    binPath="$escapedExePath" `
    start=auto `
    displayName="$serviceDisplayName"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Gagal install service!" -ForegroundColor Red
    Write-Host "   Kode error: $LASTEXITCODE" -ForegroundColor Gray
    exit 1
}

Write-Host "   ✅ Service installed successfully" -ForegroundColor Green
Write-Host ""

# Step 5: Start service
Write-Host "[5/5] Starting service..." -ForegroundColor Yellow

Start-Sleep -Seconds 2

Start-Service -Name $serviceName

Start-Sleep -Seconds 2

# Check service status
$service = Get-Service -Name $serviceName
if ($service.Status -eq "Running") {
    Write-Host "   ✅ Service started successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: Service status: $($service.Status)" -ForegroundColor Yellow
    Write-Host "   Coba restart: net stop $serviceName && net start $serviceName" -ForegroundColor Gray
}

Write-Host ""

# ============================================
# Verifikasi
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "VERIFIKASI" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check service status
$service = Get-Service -Name $serviceName
Write-Host "Service: $serviceName" -ForegroundColor White
Write-Host "Status: $($service.Status)" -ForegroundColor $(if ($service.Status -eq "Running") { "Green" } else { "Yellow" })
Write-Host "Startup Type: Automatic" -ForegroundColor White
Write-Host ""

# Check if port is listening
Write-Host "Checking port 5121..." -ForegroundColor Yellow
$connection = Get-NetTCPConnection -LocalPort 5121 -ErrorAction SilentlyContinue
if ($connection) {
    Write-Host "   ✅ Port 5121 is listening" -ForegroundColor Green
    Write-Host "   State: $($connection.State)" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Port 5121 tidak terdeteksi (service mungkin butuh waktu)" -ForegroundColor Yellow
    Write-Host "   Tunggu 10 detik dan coba lagi" -ForegroundColor Gray
}

Write-Host ""

# Test API (if port is open)
if ($connection) {
    Write-Host "Testing API endpoint..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5121/api/auth/login" `
            -Method POST -ContentType "application/json" `
            -Body '{"username":"pemilik","password":"pemilik123"}' `
            -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        
        if ($response.accessToken) {
            Write-Host "   ✅ API is working!" -ForegroundColor Green
            Write-Host "   Token received: $($response.accessToken.Substring(0, 50))..." -ForegroundColor Gray
        } else {
            Write-Host "   ⚠️  API response tidak mengandung token" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ⚠️  Gagal test API: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================
# Ringkasan
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "RINGKASAN" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend Accounting Engine sudah di-install sebagai Windows Service!" -ForegroundColor Green
Write-Host ""
Write-Host "Informasi Service:" -ForegroundColor White
Write-Host "   Nama: $serviceName" -ForegroundColor Gray
Write-Host "   Display Name: $serviceDisplayName" -ForegroundColor Gray
Write-Host "   Status: $($service.Status)" -ForegroundColor Gray
Write-Host "   Startup: Automatic" -ForegroundColor Gray
Write-Host "   Path: $exePath" -ForegroundColor Gray
Write-Host ""
Write-Host "Konfigurasi Backend:" -ForegroundColor White
Write-Host "   Location: $installPath" -ForegroundColor Gray
Write-Host "   API Port: 5121" -ForegroundColor Gray
Write-Host "   Database: $installPath\accounting.db" -ForegroundColor Gray
Write-Host ""
Write-Host "Untuk Client (POS):" -ForegroundColor White
Write-Host "   Install: POS-Sinaptex_0.1.0_x64-setup.exe" -ForegroundColor Gray
Write-Host "   Config: .env.local dengan API_BASE_URL=http://localhost:5121" -ForegroundColor Gray
Write-Host ""
Write-Host "Perintah Useful:" -ForegroundColor White
Write-Host "   Start service: net start $serviceName" -ForegroundColor Gray
Write-Host "   Stop service: net stop $serviceName" -ForegroundColor Gray
Write-Host "   Restart service: net stop $serviceName && net start $serviceName" -ForegroundColor Gray
Write-Host "   Check status: Get-Service $serviceName" -ForegroundColor Gray
Write-Host "   View logs: Get-EventLog -LogName Application -Source $serviceName -Newest 10" -ForegroundColor Gray
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "INSTALLASI SELESAI!" -ForegroundColor Green
Write-Host "Backend akan otomatis jalan saat komputer dinyalakan." -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
