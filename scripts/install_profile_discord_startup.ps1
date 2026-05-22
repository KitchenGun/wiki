$ErrorActionPreference = "Stop"

$startup = [Environment]::GetFolderPath("Startup")
$target = Join-Path $startup "WeeklyProfileDiscordBot.vbs"
$launcher = "E:\Wiki\scripts\start_profile_discord_bot_windows.ps1"

$content = @"
Set shell = CreateObject("Wscript.Shell")
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$launcher""", 0, False
"@

Set-Content -Path $target -Value $content -Encoding ASCII
Write-Output $target
