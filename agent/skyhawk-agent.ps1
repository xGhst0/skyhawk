<#
  SKYHAWK collection agent  (read-only forensic triage)
  ---------------------------------------------------------------------------
  AUTHORISED INCIDENT-RESPONSE USE ONLY. Deploy this to hosts you own/administer
  (via GPO, a scheduled task, or an admin session). It:
    * enrols to YOUR SKYHAWK server with a shared enrolment token,
    * polls for collection tasks your analysts queue from the console,
    * runs a FIXED catalogue of READ-ONLY collectors (it never executes
      arbitrary commands the server sends, never modifies the host, and does
      nothing to hide itself), and
    * uploads the results for ingestion into the case.

  It is a collector, not a remote-control/C2 channel and not self-propagating.

  Usage (poll mode — recommended, run under a scheduled task):
    powershell -ExecutionPolicy Bypass -File skyhawk-agent.ps1 `
      -Server https://skyhawk.lan:8462 -EnrollToken <token>

  Usage (one-shot — collect once into a case and exit):
    powershell -ExecutionPolicy Bypass -File skyhawk-agent.ps1 `
      -Server http://skyhawk.lan:8462 -EnrollToken <token> `
      -Once -Collector triage -CaseId INC-2043
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Server,
  [Parameter(Mandatory=$true)][string]$EnrollToken,
  [string]$StateFile = "$env:ProgramData\SKYHAWK\agent.state.json",
  [switch]$Once,
  [ValidateSet("triage","chainsaw","eventlog")][string]$Collector = "triage",
  [string]$CaseId,
  [string]$ChainsawPath,     # optional: path to chainsaw.exe for the 'chainsaw' collector
  [string]$ChainsawRules,    # optional: sigma rules dir
  [string]$ChainsawMapping,  # optional: mapping yml
  [int]$MaxEvents = 500
)

$ErrorActionPreference = "Stop"
# Air-gapped LAN with a self-signed cert is the norm; trust it for this process only.
try { [Net.ServicePointManager]::ServerCertificateValidationCallback = { $true } } catch {}
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

function Save-State($s){ $d = Split-Path $StateFile; if(-not (Test-Path $d)){ New-Item -ItemType Directory -Force -Path $d | Out-Null }; $s | ConvertTo-Json | Set-Content -Path $StateFile -Encoding UTF8 }
function Load-State{ if(Test-Path $StateFile){ try { return Get-Content $StateFile -Raw | ConvertFrom-Json } catch {} }; return $null }

function Enroll {
  $body = @{ enrollToken = $EnrollToken; host = $env:COMPUTERNAME; os = (Get-CimInstance Win32_OperatingSystem).Caption } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Post -Uri "$Server/api/agents/enroll" -ContentType "application/json" -Body $body
  $state = @{ agentId = $r.agentId; agentToken = $r.agentToken; pollSeconds = $r.pollSeconds }
  Save-State $state
  Write-Host "[SKYHAWK] enrolled as $($r.agentId) ($env:COMPUTERNAME)"
  return $state
}

# ---- READ-ONLY collectors (catalogue is fixed; nothing here changes the host) ----
function Collect-Triage {
  $procs = @(); $conns = @(); $logons = @(); $autoruns = @(); $services = @()
  try {
    $procs = Get-CimInstance Win32_Process | ForEach-Object {
      [pscustomobject]@{ pid=$_.ProcessId; name=$_.Name; path=$_.ExecutablePath; cmdline=$_.CommandLine }
    }
  } catch {}
  try {
    $conns = Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue | ForEach-Object {
      [pscustomobject]@{ proto="tcp"; localAddr=$_.LocalAddress; localPort=$_.LocalPort; remoteAddr=$_.RemoteAddress; remotePort=$_.RemotePort; state=$_.State.ToString(); pid=$_.OwningProcess }
    }
  } catch {}
  try {
    $logons = Get-WinEvent -FilterHashtable @{ LogName='Security'; Id=4624,4625 } -MaxEvents $MaxEvents -ErrorAction SilentlyContinue | ForEach-Object {
      $x=[xml]$_.ToXml(); $d=@{}; $x.Event.EventData.Data | ForEach-Object { $d[$_.Name]=$_.'#text' }
      [pscustomobject]@{ time=$_.TimeCreated.ToString("o"); eventId=$_.Id; user=$d['TargetUserName']; srcIp=$d['IpAddress']; logonType=$d['LogonType']; computer=$env:COMPUTERNAME }
    }
  } catch {}
  try {
    $runKeys = @("HKLM:\Software\Microsoft\Windows\CurrentVersion\Run","HKCU:\Software\Microsoft\Windows\CurrentVersion\Run")
    foreach($k in $runKeys){ if(Test-Path $k){ (Get-Item $k).Property | ForEach-Object { $autoruns += [pscustomobject]@{ location=$k; name=$_; command=(Get-ItemProperty $k).$_ } } } }
  } catch {}
  try {
    $services = Get-CimInstance Win32_Service | Where-Object { $_.PathName -and $_.PathName -notmatch 'C:\\Windows|Program Files' } | ForEach-Object {
      [pscustomobject]@{ name=$_.Name; displayName=$_.DisplayName; state=$_.State; path=$_.PathName; startMode=$_.StartMode }
    }
  } catch {}
  return [pscustomobject]@{
    skyhawkAgent = 1; host = $env:COMPUTERNAME; os = (Get-CimInstance Win32_OperatingSystem).Caption
    collectedAt = (Get-Date).ToString("o"); collector = "triage"
    processes = $procs; connections = $conns; logons = $logons; autoruns = $autoruns; services = $services
  }
}

# Read-only export of high-signal Windows event logs. No Chainsaw needed: the
# events are shipped to SKYHAWK, which does the detection server-side. Reading
# the Security log needs elevation (run as SYSTEM / admin) - other channels
# degrade gracefully. Returns an array of {channel,id,time,computer,data}.
function Collect-EventLog {
  $events = New-Object System.Collections.ArrayList
  $queries = @(
    @{ LogName='Security'; Id=@(4624,4625,4688,4720,4728,4732,4756,4698,1102) },
    @{ LogName='System'; Id=@(7045,104) },
    @{ LogName='Microsoft-Windows-Sysmon/Operational'; Id=@(1,3,10) },
    @{ LogName='Microsoft-Windows-PowerShell/Operational'; Id=@(4104) },
    @{ LogName='Microsoft-Windows-Windows Defender/Operational'; Id=@(1116,1117,5001,5010) }
  )
  foreach($q in $queries){
    try {
      Get-WinEvent -FilterHashtable $q -MaxEvents $MaxEvents -ErrorAction SilentlyContinue | ForEach-Object {
        $d = @{}
        try { $x=[xml]$_.ToXml(); foreach($n in $x.Event.EventData.Data){ if($n.Name){ $d[$n.Name] = [string]$n.'#text' } } } catch {}
        [void]$events.Add([pscustomobject]@{ channel=$_.LogName; id=$_.Id; time=$_.TimeCreated.ToString('o'); computer=$env:COMPUTERNAME; data=$d })
      }
    } catch {}
  }
  return ,$events.ToArray()
}

# Optional: run a bundled Chainsaw over local event logs and return its JSON.
function Collect-Chainsaw {
  $exe = if($ChainsawPath){ $ChainsawPath } else { Join-Path $PSScriptRoot "chainsaw\chainsaw.exe" }
  $rules = if($ChainsawRules){ $ChainsawRules } else { Join-Path $PSScriptRoot "chainsaw\sigma" }
  $map = if($ChainsawMapping){ $ChainsawMapping } else { Join-Path $PSScriptRoot "chainsaw\mappings\sigma-event-logs-all.yml" }
  if(-not (Test-Path $exe)){ Write-Warning "chainsaw.exe not found at $exe - falling back to triage"; return $null }
  $out = Join-Path $env:TEMP ("chainsaw-" + [guid]::NewGuid().ToString("N") + ".json")
  & $exe hunt "$env:SystemRoot\System32\winevt\Logs" -s $rules --mapping $map --json --output $out 2>$null | Out-Null
  if(Test-Path $out){ $j = Get-Content $out -Raw; Remove-Item $out -Force -ErrorAction SilentlyContinue; return $j }
  return $null
}

function Run-Collector([string]$name){
  if($name -eq "chainsaw"){
    $j = Collect-Chainsaw
    if($j){ return @{ text = $j; filename = "$env:COMPUTERNAME-chainsaw.json"; profile = "chainsaw" } }
    # no chainsaw.exe present: export the event logs instead and let SKYHAWK hunt
  }
  $data = Collect-Triage
  # 'eventlog' (and chainsaw-without-the-binary) also ships the raw event logs
  if($name -eq "eventlog" -or $name -eq "chainsaw"){
    $data | Add-Member -NotePropertyName events -NotePropertyValue (Collect-EventLog) -Force
    $data.collector = $name
  }
  return @{ text = ($data | ConvertTo-Json -Depth 6 -Compress); filename = "$env:COMPUTERNAME-$name.json"; profile = "agent" }
}

function Submit($state, $taskId, $caseId, $collector){
  $pack = Run-Collector $collector
  for($attempt=0; $attempt -lt 2; $attempt++){
    $body = @{ id=$state.agentId; token=$state.agentToken; taskId=$taskId; invId=$caseId; collector=$collector; profile=$pack.profile; filename=$pack.filename; text=$pack.text } | ConvertTo-Json -Depth 8
    try {
      $r = Invoke-RestMethod -Method Post -Uri "$Server/api/agents/results" -ContentType "application/json" -Body $body
      Write-Host "[SKYHAWK] $collector -> case $caseId : findings=$($r.findings) events=$($r.timeline) iocs=$($r.iocs)"
      return $r
    } catch {
      $msg = $_.Exception.Message
      try { $rs = $_.Exception.Response.GetResponseStream(); $msg = (New-Object System.IO.StreamReader($rs)).ReadToEnd() } catch {}
      # a token that went stale (e.g. another process re-enrolled) — re-enrol once and retry
      if($attempt -eq 0 -and $msg -match 'auth'){
        Write-Warning "results auth failed - re-enrolling and retrying"
        $ns = Enroll; $state.agentId = $ns.agentId; $state.agentToken = $ns.agentToken
        continue
      }
      throw "server rejected results: $msg"
    }
  }
}

# ---- main ----
$state = Load-State
if(-not $state -or -not $state.agentId){ $state = Enroll }

if($Once){
  if(-not $CaseId){ throw "-Once needs -CaseId (the target investigation, e.g. INC-2043)" }
  Submit $state $null $CaseId $Collector | Out-Null
  return
}

$interval = if($state.pollSeconds){ [int]$state.pollSeconds } else { 15 }
Write-Host "[SKYHAWK] polling $Server every ${interval}s (Ctrl+C to stop)"
while($true){
  try {
    $body = @{ id=$state.agentId; token=$state.agentToken } | ConvertTo-Json
    $r = Invoke-RestMethod -Method Post -Uri "$Server/api/agents/poll" -ContentType "application/json" -Body $body
    foreach($t in @($r.tasks)){
      Write-Host "[SKYHAWK] task $($t.id): collect '$($t.collector)' -> $($t.invId)"
      try { Submit $state $t.id $t.invId $t.collector | Out-Null }
      catch { Write-Warning "collection failed: $($_.Exception.Message)" }
    }
  } catch {
    if($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 403){
      Write-Warning "agent auth rejected - re-enrolling"; $state = Enroll
    } else { Write-Warning "poll failed: $($_.Exception.Message)" }
  }
  Start-Sleep -Seconds $interval
}
