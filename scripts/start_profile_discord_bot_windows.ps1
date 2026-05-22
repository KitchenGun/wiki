$ErrorActionPreference = "Stop"

$root = "E:\Wiki"
$logDir = Join-Path $root "weekly-profile-update\logs"
$scriptMarker = "run_profile_discord_bot_forever.sh"
$scriptPath = "/mnt/e/Wiki/scripts/$scriptMarker"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$existing = Get-CimInstance Win32_Process |
    Where-Object { $_.Name -ieq "wsl.exe" -and $_.CommandLine -like "*$scriptMarker*" }

if ($existing) {
    $pids = ($existing | ForEach-Object { $_.ProcessId }) -join ","
    Write-Output "already running: $pids"
    exit 0
}

$stdout = Join-Path $logDir "discord-bot-windows.out.log"
$stderr = Join-Path $logDir "discord-bot-windows.err.log"

$process = Start-Process `
    -FilePath "wsl.exe" `
    -ArgumentList @("-d", "Ubuntu", "--", "bash", $scriptPath) `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -PassThru

Write-Output "started: $($process.Id)"
