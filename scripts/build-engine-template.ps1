# Membangun template database untuk installer tunggal (sidecar engine).
#
# Template berisi skema (migrasi), satu tenant + pemilik, akun kas, periode
# fiskal, dan chart of accounts standar. Installer menyalinnya ke folder data
# perangkat saat pertama kali dijalankan.
#
# Prasyarat: dotnet, python + bcrypt, engine sudah dipublish ke src-tauri/binaries.
# Jalankan dari root repo:  powershell -ExecutionPolicy Bypass -File scripts\build-engine-template.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$exe = Join-Path $root "src-tauri\binaries\accounting-engine-x86_64-pc-windows-msvc.exe"
if (-not (Test-Path $exe)) {
  throw "engine belum dipublish ke $exe. Jalankan: dotnet publish src/AccountingEngine.Api -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o src-tauri/binaries"
}

$tpl = Join-Path $env:TEMP "pos-sinaptex-template"
$db = Join-Path $tpl "accounting.db"
Remove-Item $tpl -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $tpl -Force | Out-Null

function Start-Engine($port) {
  $env:ASPNETCORE_ENVIRONMENT = "Production"
  $env:ASPNETCORE_URLS = "http://localhost:$port"
  $env:ConnectionStrings__DefaultConnection = "Data Source=$db"
  $env:Backup__Directory = (Join-Path $tpl "backups")
  $env:FileStorage__Directory = (Join-Path $tpl "wwwroot\uploads\logos")
  Start-Process -FilePath $exe -ArgumentList "--urls", "http://localhost:$port" -WorkingDirectory $tpl -PassThru -WindowStyle Hidden
}

function Wait-Up($port, $proc) {
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    if ($proc.HasExited) { throw "engine berhenti lebih awal" }
    try {
      Invoke-WebRequest "http://localhost:$port/api/auth/login" -Method POST -Body "{}" -ContentType "application/json" -TimeoutSec 3 -UseBasicParsing | Out-Null
      return
    } catch {
      if ($_.Exception.Response) { return }
    }
  }
  throw "engine tidak siap di port $port"
}

Write-Host "== migrasi skema =="
$p = Start-Engine 5125
Wait-Up 5125 $p
Stop-Process -Id $p.Id -Force
Start-Sleep -Seconds 2

Write-Host "== bootstrap tenant + pemilik =="
& python (Join-Path $root "tools\bootstrap-backend.py") --db $db --business-id toko-utama --username pemilik --password pemilik123 --full-name "Pemilik Toko"
if ($LASTEXITCODE -ne 0) { throw "bootstrap gagal" }

Write-Host "== seed chart of accounts =="
$p = Start-Engine 5126
Wait-Up 5126 $p
$login = Invoke-RestMethod "http://localhost:5126/api/auth/login" -Method POST -Body '{"username":"pemilik","password":"pemilik123"}' -ContentType "application/json" -Headers @{ "X-Business-Id" = "toko-utama" } -TimeoutSec 10
$token = if ($login.accessToken) { $login.accessToken } else { $login.AccessToken }
if (-not $token) { throw "login tidak mengembalikan access token" }
Invoke-RestMethod "http://localhost:5126/api/accounts/seed" -Method POST -Headers @{ "Authorization" = "Bearer $token"; "X-Business-Id" = "toko-utama" } -TimeoutSec 30 | Out-Null
Stop-Process -Id $p.Id -Force
Start-Sleep -Seconds 2

Write-Host "== checkpoint WAL + simpan template =="
& python -c "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute('PRAGMA wal_checkpoint(TRUNCATE)'); c.close()" $db
$destDir = Join-Path $root "src-tauri\resources"
New-Item -ItemType Directory -Path $destDir -Force | Out-Null
Copy-Item $db (Join-Path $destDir "accounting.db") -Force
Write-Host ("template siap: " + (Join-Path $destDir "accounting.db"))
