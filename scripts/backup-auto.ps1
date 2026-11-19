# ============================================
# Script: Backup database otomatis (dipanggil Task Scheduler)
# ============================================
# Deskripsi: Membuat snapshot database lewat API engine (POST /api/backup),
#            memangkas backup lama sesuai umur, dan mencatat kegagalan ke
#            Event Log + file log. Jalankan oleh Scheduled Task harian.
# Cara pakai:
#   powershell -ExecutionPolicy Bypass -File backup-auto.ps1
#   powershell -ExecutionPolicy Bypass -File backup-auto.ps1 -KeepDays 30 -BackupDirectory "C:\POS-Sinaptex\Engine\backups"
# ============================================

param(
    [string]$BaseUrl = "http://localhost:5121",
    [string]$BusinessId = "toko-utama",
    [string]$ActorId = "system-backup",
    [int]$KeepDays = 30,
    [string]$BackupDirectory = "C:\POS-Sinaptex\Engine\backups",
    [string]$LogDirectory = "C:\POS-Sinaptex\logs",
    [string]$WebhookUrl = ""
)

$ErrorActionPreference = "Stop"

if ($KeepDays -lt 1) { $KeepDays = 1 }

if (-not (Test-Path -LiteralPath $LogDirectory)) {
    New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
}

$logFile = Join-Path $LogDirectory ("backup-" + (Get-Date -Format "yyyyMMdd") + ".log")

function Tulis-Log {
    param([string]$Pesan, [string]$Warna = "Gray")
    $baris = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Pesan
    Write-Host $baris -ForegroundColor $Warna
    Add-Content -LiteralPath $logFile -Value $baris -Encoding UTF8
}

function Kirim-Notifikasi {
    param([string]$Pesan)
    try {
        Write-EventLog -LogName Application -Source "POS-Sinaptex Backup" `
            -EntryType Error -EventId 1001 -Message $Pesan
    } catch {
        # Sumber Event Log belum terdaftar; log file tetap mencatat.
    }
    if ($WebhookUrl) {
        try {
            $body = @{ content = $Pesan; text = $Pesan } | ConvertTo-Json
            Invoke-RestMethod -Uri $WebhookUrl -Method POST -ContentType "application/json" `
                -Body $body -TimeoutSec 15 | Out-Null
        } catch {
            # Notifikasi webhook bersifat best-effort.
        }
    }
}

Tulis-Log "Mulai backup database ke $BaseUrl" "Cyan"

$headers = @{
    "X-Business-Id" = $BusinessId
    "X-Actor-Id"    = $ActorId
    "X-Actor-Level" = "99"
}

try {
    $hasil = Invoke-RestMethod -Uri "$BaseUrl/api/backup" -Method POST -Headers $headers -TimeoutSec 180
    $nama = $hasil.fileName
    $ukuran = if ($hasil.sizeBytes) { [math]::Round($hasil.sizeBytes / 1MB, 2) } else { 0 }
    Tulis-Log "Backup berhasil: $nama ($ukuran MB)" "Green"
} catch {
    $pesan = "Backup database GAGAL: $($_.Exception.Message)"
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
        $pesan = "$pesan | $($_.ErrorDetails.Message)"
    }
    Tulis-Log $pesan "Red"
    Kirim-Notifikasi $pesan
    exit 1
}

if ($BackupDirectory -and (Test-Path -LiteralPath $BackupDirectory)) {
    $batas = (Get-Date).AddDays(-$KeepDays)
    $lama = @(Get-ChildItem -LiteralPath $BackupDirectory -Filter "accounting-*.db" -File |
        Where-Object { $_.LastWriteTime -lt $batas })

    foreach ($berkas in $lama) {
        try {
            Remove-Item -LiteralPath $berkas.FullName -Force
            Tulis-Log "Hapus backup lama: $($berkas.Name)" "Yellow"
        } catch {
            Tulis-Log "Gagal menghapus $($berkas.Name): $($_.Exception.Message)" "Red"
        }
    }
    Tulis-Log "Retensi selesai: simpan $KeepDays hari, $($lama.Count) berkas dihapus." "Gray"
} else {
    Tulis-Log "Folder backup tidak ditemukan ($BackupDirectory); retensi dilewati." "Yellow"
}

Tulis-Log "Selesai." "Cyan"
exit 0
