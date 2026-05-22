$ErrorActionPreference = "Stop"

$scriptMarker = "run_profile_discord_bot_forever.sh"
$matches = Get-CimInstance Win32_Process |
    Where-Object { $_.Name -ieq "wsl.exe" -and $_.CommandLine -like "*$scriptMarker*" }

if (-not $matches) {
    Write-Output "not running"
    exit 0
}

foreach ($process in $matches) {
    Invoke-CimMethod -InputObject $process -MethodName Terminate | Out-Null
    Write-Output "stopped: $($process.ProcessId)"
}
