# SKYHAWK one-command installer (Windows PowerShell)
#   powershell -c "irm https://raw.githubusercontent.com/YOURUSER/skyhawk/main/install.ps1 | iex"
$ErrorActionPreference = "Stop"
$Repo = if ($env:SKYHAWK_REPO) { $env:SKYHAWK_REPO } else { "https://github.com/YOURUSER/skyhawk" }  # <-- set to your repo
$Dir  = if ($env:SKYHAWK_DIR)  { $env:SKYHAWK_DIR }  else { "$env:USERPROFILE\skyhawk" }
$Port = if ($env:PORT) { $env:PORT } else { "8462" }

Write-Host ""
Write-Host "  ==============================" -ForegroundColor Cyan
Write-Host "   SKYHAWK - installer" -ForegroundColor Cyan
Write-Host "  ==============================" -ForegroundColor Cyan
Write-Host ""

function Test-Node {
  if (Get-Command node -ErrorAction SilentlyContinue) {
    $maj = (node -p "process.versions.node.split('.')[0]")
    if ([int]$maj -ge 18) { Write-Host "-> Node.js $(node -v) found"; return $true }
  }
  return $false
}

if (-not (Test-Node)) {
  Write-Host "-> Node.js not found; installing via winget..."
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  # refresh PATH for this session
  $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
  if (-not (Test-Node)) { Write-Error "Node.js install failed. Install Node 18+ from https://nodejs.org and re-run."; exit 1 }
}

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

Set-Location $Dir
Write-Host ""
Write-Host "  Installed. Starting on http://localhost:$Port" -ForegroundColor Green
Write-Host "  (Ctrl+C to stop; re-run later with:  cd $Dir; node server.js)"
Write-Host ""
Start-Process "http://localhost:$Port"
node server.js
