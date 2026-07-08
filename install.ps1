# SKYHAWK one-command installer (Windows PowerShell)
#   powershell -c "irm https://raw.githubusercontent.com/xGhst0/skyhawk/main/install.ps1 | iex"
# Installs, then leaves SKYHAWK RUNNING in the background on port 8462
# (auto-starts at logon via a Scheduled Task).
$ErrorActionPreference = "Stop"
$Repo = if ($env:SKYHAWK_REPO) { $env:SKYHAWK_REPO } else { "https://github.com/xGhst0/skyhawk" }  # <-- set to your repo
$Dir  = if ($env:SKYHAWK_DIR)  { $env:SKYHAWK_DIR }  else { "$env:USERPROFILE\skyhawk" }
$Port = if ($env:PORT) { $env:PORT } else { "8462" }

Write-Host "`n  ==============================" -ForegroundColor Cyan
Write-Host "   SKYHAWK - installer" -ForegroundColor Cyan
Write-Host "  ==============================`n" -ForegroundColor Cyan

function Test-Node { if (Get-Command node -ErrorAction SilentlyContinue) { if ([int](node -p "process.versions.node.split('.')[0]") -ge 18) { return $true } } return $false }

if (Test-Node) { Write-Host "-> Node.js $(node -v) found" }
else {
  Write-Host "-> Installing Node.js via winget..."
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
  if (-not (Test-Node)) { Write-Error "Node.js install failed. Install Node 18+ from https://nodejs.org and re-run."; exit 1 }
}
$Node = (Get-Command node).Source

$Self = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($Self -and (Test-Path "$Self\server.js")) {
  $Dir = $Self
  Write-Host "-> Using existing SKYHAWK files in $Dir (no download needed)"
} else {
Write-Host "-> Fetching SKYHAWK into $Dir"
if (Get-Command git -ErrorAction SilentlyContinue) {
  if (Test-Path "$Dir\.git") { git -C $Dir pull --ff-only } else { git clone --depth 1 $Repo $Dir }
} else {
  $zip = "$env:TEMP\skyhawk.zip"
  Invoke-WebRequest "$Repo/archive/refs/heads/main.zip" -OutFile $zip
  Expand-Archive $zip -DestinationPath $env:TEMP -Force
  if (Test-Path $Dir) { Remove-Item $Dir -Recurse -Force }
  Move-Item "$env:TEMP\skyhawk-main" $Dir
}

}

# stop any previous instance, then start detached + register a logon task
Get-CimInstance Win32_Process -Filter "name='node.exe'" 2>$null |
  Where-Object { $_.CommandLine -like "*skyhawk\server.js*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Write-Host "-> Registering auto-start (Scheduled Task at logon) and starting now"
$action  = New-ScheduledTaskAction -Execute $Node -Argument "server.js" -WorkingDirectory $Dir
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName "SKYHAWK" -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

# start it now, detached and hidden
Start-Process -FilePath $Node -ArgumentList "server.js" -WorkingDirectory $Dir -WindowStyle Hidden

Write-Host -NoNewline "-> Waiting for SKYHAWK to come up"
$up = $false
for ($i=0; $i -lt 20; $i++) {
  try { Invoke-WebRequest "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 2 | Out-Null; $up = $true; break } catch { Write-Host -NoNewline "."; Start-Sleep 1 }
}
Write-Host ""
if ($up) {
  Write-Host "`n  Running -> http://localhost:$Port" -ForegroundColor Green
  Write-Host "  It restarts automatically at logon."
  Write-Host "  Stop:  Stop-ScheduledTask -TaskName SKYHAWK ; Get-Process node | Stop-Process"
  Start-Process "http://localhost:$Port"
} else {
  Write-Error "SKYHAWK did not respond on port $Port."
}
