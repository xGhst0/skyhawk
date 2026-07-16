"use strict";
// Offline response advisor. Turns a finding (ATT&CK techniques + affected
// assets) and the case's IOCs into concrete, copy-pasteable containment /
// eradication / recovery / hardening actions, tailored to the actual hosts and
// indicators. 100% deterministic and local — no network, no LLM. A commercial
// SOC gets vendor playbooks behind a login; this ships the equivalent knowledge
// air-gapped, right next to the finding.
Object.defineProperty(exports, "__esModule", { value: true });
exports.advise = advise;

const attack = require("../attack.js");
const TNAME = {};
const TTACTIC = {};
attack.techniques.forEach((t) => { TNAME[t.id] = t.name; TTACTIC[t.id] = t.tactic; });
const TACTIC_NAME = {};
attack.tactics.forEach((t) => { TACTIC_NAME[t.id] = t.name; });

// platform → human label shown as a tag on each command
const PLATFORMS = {
  windows: "Windows · PowerShell",
  cmd: "Windows · cmd",
  linux: "Linux · bash",
  ad: "Active Directory · PowerShell",
  m365: "Microsoft 365 · PowerShell",
  network: "Network device",
  edr: "EDR console",
  manual: "Manual step",
};
const PHASES = [
  ["triage", "Preserve evidence first"],
  ["contain", "Contain now"],
  ["eradicate", "Eradicate"],
  ["recover", "Recover"],
  ["block", "Block the indicators"],
  ["harden", "Harden so it can't recur"],
];

// item helper: { text, platform, cmd, why }
const A = (text, platform, cmd, why) => ({ text, platform: platform || "manual", cmd: cmd || "", why: why || "" });

const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/;
const WIN_TYPES = new Set(["workstation", "domain controller", "mail server"]);
const NET_TYPES = new Set(["firewall", "router", "switch", "load balancer", "VPN gateway"]);

function osOf(type) {
  if (WIN_TYPES.has(type)) return "windows";
  if (NET_TYPES.has(type)) return "network";
  return "either"; // server / database / cloud / IoT / external / host — show both
}
function parseHost(a) {
  const raw = String(a.name || "").trim();
  const ipInName = (raw.match(IPV4) || [])[0] || "";
  const ip = (a.ip && a.ip.trim()) || ipInName || "";
  let host = raw.split(/\s*[·|(]\s*/)[0].trim().split(/\s+/)[0] || raw;
  if (IPV4.test(host)) host = raw; // name is literally an IP
  return { host: host || "the host", ip, type: a.type || "host", os: osOf(a.type || "host") };
}

// ---- per-host containment (built dynamically so commands name the real host) ----
function preserveEvidence(h) {
  const items = [];
  if (h.os === "windows" || h.os === "either") {
    items.push(A(
      `Capture volatile evidence from ${h.host} before you touch it`,
      "windows",
      `# Run as admin ON ${h.host}. Save output to removable/again-gapped media, not the host.\n` +
      `Get-Date -Format o > C:\\ir\\${h.host}-collected.txt\n` +
      `Get-NetTCPConnection | Sort-Object State | Format-Table -Auto | Out-File C:\\ir\\${h.host}-netstat.txt\n` +
      `Get-Process | Select-Object Id,ProcessName,Path,StartTime | Out-File C:\\ir\\${h.host}-procs.txt\n` +
      `Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine | Out-File C:\\ir\\${h.host}-cmdlines.txt\n` +
      `# Full memory image (needs a tool on media): .\\winpmem.exe C:\\ir\\${h.host}.raw`,
      "Network isolation and process kills destroy live state. Capture connections, process trees and (ideally) RAM first."
    ));
  }
  if (h.os === "linux" || h.os === "either") {
    items.push(A(
      `Capture volatile evidence from ${h.host} before you touch it`,
      "linux",
      `# Run as root ON ${h.host}. Write to mounted media, not local disk.\n` +
      `mkdir -p /ir && date -u > /ir/${h.host}-collected.txt\n` +
      `ss -tanp > /ir/${h.host}-sockets.txt\n` +
      `ps auxww > /ir/${h.host}-procs.txt\n` +
      `ls -la /proc/*/exe 2>/dev/null > /ir/${h.host}-openfiles.txt\n` +
      `# Memory image (needs AVML on media): ./avml /ir/${h.host}.lime`,
      "Sockets, process command lines and RAM disappear the moment you isolate or reboot."
    ));
  }
  return items;
}
function isolateHost(h, attackerIp) {
  const items = [];
  items.push(A(
    `Network-contain ${h.host} in your EDR`,
    "edr",
    "",
    "One click in CrowdStrike/Defender/SentinelOne severs the host from the network but keeps your EDR link for investigation — cleaner than a firewall change."
  ));
  if (h.os === "windows" || h.os === "either") {
    items.push(A(
      `Firewall-isolate ${h.host}${h.ip ? " (" + h.ip + ")" : ""}, keeping only your admin subnet`,
      "windows",
      `# Run on ${h.host}. Replace 10.0.0.0/24 with your responder/management subnet.\n` +
      `Set-NetFirewallProfile -Profile Domain,Public,Private -DefaultInboundAction Block -DefaultOutboundAction Block\n` +
      `New-NetFirewallRule -DisplayName "IR-Allow-Admin-In"  -Direction Inbound  -RemoteAddress 10.0.0.0/24 -Action Allow\n` +
      `New-NetFirewallRule -DisplayName "IR-Allow-Admin-Out" -Direction Outbound -RemoteAddress 10.0.0.0/24 -Action Allow`,
      "Default-deny both directions, then allow only your admin subnet. (Block rules would otherwise override Allow rules — setting the default is the correct way.)"
    ));
  }
  if (h.os === "linux" || h.os === "either") {
    items.push(A(
      `Firewall-isolate ${h.host}${h.ip ? " (" + h.ip + ")" : ""}, keeping only your admin host`,
      "linux",
      `# Run on ${h.host}. Replace 10.0.0.10 with your responder host.\n` +
      `sudo iptables -I INPUT  -s 10.0.0.10 -j ACCEPT\n` +
      `sudo iptables -I OUTPUT -d 10.0.0.10 -j ACCEPT\n` +
      `sudo iptables -A INPUT  -j DROP\n` +
      `sudo iptables -A OUTPUT -j DROP`,
      "Accept your admin host first, then drop everything else in/out."
    ));
  }
  if (h.os === "network") {
    items.push(A(
      `Shut the compromised interface / pull the ACL on ${h.host}`,
      "network",
      `! Cisco IOS example — shut the affected port\nconf t\n interface <Gi0/x>\n  shutdown\nend\nwrite memory`,
      "For a network device, isolate at the port/ACL level and preserve its running-config + logs."
    ));
  }
  return items;
}
function cutSessions(h, attackerIp) {
  const ip = attackerIp || "<attacker-ip>";
  const items = [];
  items.push(A(
    `Kill the attacker's live SSH session(s) on ${h.host}`,
    "linux",
    `# See who's on and from where\nwho\nss -tnp state established '( sport = :22 )'\n` +
    `# Drop the established sockets from the attacker (iproute2, needs CONFIG_INET_DIAG_DESTROY)\n` +
    `sudo ss -K dst ${ip}\n` +
    `# Or terminate a specific login shell by its TTY (from \`who\`, e.g. pts/1)\n` +
    `sudo pkill -KILL -t pts/1\n` +
    `# Lock the account the attacker is using so it can't just reconnect\n` +
    `sudo passwd -l <username> && sudo pkill -KILL -u <username>`,
    "Isolation stops new connections but an interactive SSH session already open can still act — terminate it explicitly."
  ));
  items.push(A(
    `Kill the attacker's live RDP/interactive session(s) on ${h.host}`,
    "windows",
    `# List sessions\nquery session\n# Log off the attacker's session by ID (from \`query session\`)\nlogoff <SESSIONID>\n` +
    `# Block RDP inbound from the attacker immediately\n` +
    `New-NetFirewallRule -DisplayName "IR-Block-RDP-${ip}" -Direction Inbound -Protocol TCP -LocalPort 3389 -RemoteAddress ${ip} -Action Block`,
    "Same idea on Windows: an existing RDP/console session survives isolation until you log it off."
  ));
  return items;
}

// ---- technique knowledge base (contain / eradicate / recover / harden) ----
const TECH = {
  T1190: {
    contain: [A("Take the exploited app offline or put the WAF in block mode", "manual", "", "Stop the bleeding at the entry point while you patch — a maintenance page beats an active foothold.")],
    eradicate: [
      A("Find and remove webshells / attacker files dropped in the web root", "linux",
        `# Recently-modified files under the web root are prime suspects\nsudo find /var/www -type f -mmin -1440 -printf '%TY-%Tm-%Td %TH:%TM  %p\\n' | sort\n# Known-bad one-liner scan\nsudo grep -RilnE "eval\\(|base64_decode\\(|system\\(|passthru\\(|assert\\(" /var/www`,
        "Web exploitation almost always drops a webshell for re-entry; hunt the web root by mtime and suspicious functions."),
      A("Rotate every secret the app process could read", "manual", "", "DB connection strings, API keys, tokens and signing keys in the app's config/env must be assumed stolen."),
    ],
    recover: [A("Rebuild the host from a known-good image, then restore data", "manual", "", "A host that ran attacker code shouldn't be trusted after cleanup on anything critical — reimage.")],
    harden: [A("Patch to a fixed version and put it behind a WAF + MFA", "manual", "", "Close the actual CVE and add compensating controls so the same request can't work twice.")],
  },
  T1133: {
    contain: [A("Disable the exposed remote-access service (RDP/VPN/Citrix) until fixed", "manual", "", "External remote services are internet-reachable by definition — close the door while you rotate creds.")],
    harden: [A("Require MFA on all remote access and restrict source IPs", "manual", "", "Valid-cred access over VPN/RDP is defeated by MFA + geo/allow-listing.")],
  },
  T1078: {
    contain: [
      A("Disable the compromised account(s) immediately", "ad", `Disable-ADAccount -Identity <samAccountName>`, "Stop the account being used while you investigate blast radius."),
      A("Revoke all active sessions / refresh tokens for the account", "m365",
        `# Microsoft Graph\nRevoke-MgUserSignInSession -UserId <user@domain>\n# or legacy AzureAD\nRevoke-AzureADUserAllRefreshToken -ObjectId <user@domain>`,
        "Disabling the account doesn't kill sessions/tokens already issued — revoke them or the attacker stays in."),
    ],
    eradicate: [A("Force a password reset and re-enable only after review", "ad", `Set-ADAccountPassword -Identity <samAccountName> -Reset -NewPassword (Read-Host -AsSecureString "New password")\nSet-ADUser -Identity <samAccountName> -ChangePasswordAtLogon $true`, "Rotate the credential; require change at next logon.")],
    harden: [A("Enforce MFA and alert on impossible-travel / new-device sign-ins", "manual", "", "Stolen valid creds are stopped by MFA and anomaly detection.")],
  },
  T1566: {
    contain: [
      A("Purge the phishing email from all mailboxes", "m365",
        `# Connect first: Connect-ExchangeOnline / Connect-IPPSSession\nNew-ComplianceSearch -Name "IR-Phish" -ExchangeLocation All -ContentMatchQuery 'subject:"<subject>" AND from:<sender>'\nStart-ComplianceSearch -Identity "IR-Phish"\nNew-ComplianceSearchAction -SearchName "IR-Phish" -Purge -PurgeType HardDelete`,
        "Pull the lure from every inbox so no one else clicks it."),
      A("Reset credentials + revoke sessions for anyone who interacted", "m365", `Revoke-MgUserSignInSession -UserId <user@domain>`, "Treat clickers/credential-enterers as compromised until proven otherwise."),
    ],
    harden: [A("Block the sender/domain and enforce MFA", "manual", "", "Stop repeat delivery and neuter any harvested passwords.")],
  },
  T1059: {
    eradicate: [A("Kill the malicious process by name or PID", "windows", `Get-Process -Name <procname> -ErrorAction SilentlyContinue | Stop-Process -Force\n# or: Stop-Process -Id <pid> -Force`, "Terminate the live interpreter/payload before it does more.")],
    harden: [A("Enable command-line + script logging so this is caught next time", "windows", `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging" /v EnableScriptBlockLogging /t REG_DWORD /d 1 /f\nreg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\\Audit" /v ProcessCreationIncludeCmdLine_Enabled /t REG_DWORD /d 1 /f`, "Full command lines in event logs make the next intrusion obvious.")],
  },
  "T1059.001": {
    eradicate: [A("Kill the PowerShell payload and grab its command line", "windows", `Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" | Select-Object ProcessId,CommandLine\nStop-Process -Id <pid> -Force`, "Capture the (often base64/encoded) command line for IOCs before killing it.")],
    harden: [A("Turn on Script Block Logging and Constrained Language Mode", "windows", `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging" /v EnableScriptBlockLogging /t REG_DWORD /d 1 /f`, "Logs every script block (even obfuscated) and limits what unsigned scripts can do.")],
  },
  T1053: {
    eradicate: [A("Enumerate and remove the malicious scheduled task", "windows", `Get-ScheduledTask | Where-Object { $_.Date -gt (Get-Date).AddDays(-7) -or $_.TaskName -match '<suspect>' } | Format-Table TaskName,TaskPath,State\nUnregister-ScheduledTask -TaskName "<TaskName>" -TaskPath "<\\Path\\>" -Confirm:$false`, "Scheduled tasks are a top persistence spot — list recent/odd ones and delete the attacker's.")],
    harden: [A("Alert on task creation (Event ID 4698)", "manual", "", "Security 4698 fires on every new task; monitor it.")],
  },
  T1543: {
    eradicate: [A("Find and delete the malicious Windows service", "windows", `Get-CimInstance Win32_Service | Where-Object { $_.PathName -notmatch 'C:\\\\Windows|Program Files' } | Select-Object Name,PathName,StartName\nStop-Service -Name "<svc>" -Force\nsc.exe delete "<svc>"`, "Services from odd paths are classic persistence; stop then delete.")],
    harden: [A("Alert on service installs (Event ID 7045)", "manual", "", "System 7045 logs every new service.")],
  },
  T1547: {
    eradicate: [A("Enumerate and clean autostart / Run keys", "windows", `reg query "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"\nreg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"\nreg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "<ValueName>" /f`, "Run/RunOnce keys and the Startup folder are the most common userland persistence.")],
  },
  T1055: {
    eradicate: [A("Identify the injected host process and terminate it", "windows", `Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine | Sort-Object Name\nStop-Process -Id <pid> -Force`, "Injected code lives inside a legit process — find the anomalous parent/child and kill it, then reboot the host to clear memory-only implants.")],
    recover: [A("Reboot to clear memory-resident implants, then re-scan", "manual", "", "Injection is often fileless; a reboot plus fresh EDR scan clears what killing the process may miss.")],
  },
  T1003: {
    contain: [A("Assume every credential used on this host is stolen — plan a rotation", "manual", "", "Credential dumping means cached/logged-on secrets are gone. Scope which accounts touched the host.")],
    eradicate: [
      A("Force-reset every exposed user and privileged account", "ad", `Set-ADAccountPassword -Identity <samAccountName> -Reset -NewPassword (Read-Host -AsSecureString "New password")\nSet-ADUser -Identity <samAccountName> -ChangePasswordAtLogon $true`, "Rotate all accounts that had sessions on the host, prioritising admins and service accounts."),
      A("Rotate the local administrator password (all hosts, via LAPS)", "windows", `Reset-LapsPassword -ComputerName <host>   # if LAPS is deployed`, "A dumped local admin hash enables lateral movement everywhere it's reused."),
    ],
    recover: [A("Reset the krbtgt account TWICE if a DC or domain admin was exposed", "ad", `# Prefer Microsoft's New-KrbtgtKeys.ps1. Manual, do TWICE with AD replication (10h+) between resets:\nSet-ADAccountPassword -Identity krbtgt -Reset -NewPassword (ConvertTo-SecureString ([System.Web.Security.Membership]::GeneratePassword(64,10)) -AsPlainText -Force)`, "Invalidates forged Kerberos (golden) tickets. Two resets are required to fully cycle the key history — space them by one replication cycle so you don't break auth.")],
    harden: [A("Enable LSA Protection (RunAsPPL) and Credential Guard", "windows", `reg add HKLM\\SYSTEM\\CurrentControlSet\\Control\\Lsa /v RunAsPPL /t REG_DWORD /d 1 /f\nreg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v EnableVirtualizationBasedSecurity /t REG_DWORD /d 1 /f`, "Stops tools reading LSASS memory. Reboot to apply.")],
  },
  "T1003.001": {
    contain: [A("Assume all credentials cached on this host are compromised", "manual", "", "LSASS held plaintext/hashes/tickets for everyone logged on — scope and rotate them.")],
    eradicate: [
      A("Force-reset accounts that had sessions on the host", "ad", `Set-ADAccountPassword -Identity <samAccountName> -Reset -NewPassword (Read-Host -AsSecureString "New password")\nSet-ADUser -Identity <samAccountName> -ChangePasswordAtLogon $true`, "Prioritise domain admins and service accounts that logged on interactively."),
      A("Block LSASS credential theft going forward with an ASR rule", "windows", `Add-MpPreference -AttackSurfaceReductionRules_Ids 9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2 -AttackSurfaceReductionRules_Actions Enabled`, "This ASR rule ('Block credential stealing from lsass.exe') blocks the exact technique."),
    ],
    recover: [A("Reset krbtgt TWICE if a DC/domain admin was exposed", "ad", `# Prefer New-KrbtgtKeys.ps1. Manual (do TWICE, one replication cycle apart):\nSet-ADAccountPassword -Identity krbtgt -Reset -NewPassword (ConvertTo-SecureString ([System.Web.Security.Membership]::GeneratePassword(64,10)) -AsPlainText -Force)`, "Kills golden tickets forged from a stolen krbtgt hash.")],
    harden: [A("Enable RunAsPPL + Credential Guard on all hosts", "windows", `reg add HKLM\\SYSTEM\\CurrentControlSet\\Control\\Lsa /v RunAsPPL /t REG_DWORD /d 1 /f`, "Protects LSASS from user-mode credential dumpers. Reboot to apply.")],
  },
  T1110: {
    contain: [A("Lock the targeted account(s) and block the source IP", "ad", `Search-ADAccount -LockedOut | Format-Table Name,LastLogonDate\nDisable-ADAccount -Identity <samAccountName>`, "Stop the guessing against the account and cut the source.")],
    harden: [A("Enforce lockout policy + MFA and alert on 4625 spikes", "manual", "", "Account lockout thresholds and MFA make spraying/brute force ineffective; watch Event ID 4625 bursts.")],
  },
  T1021: {
    contain: [A("Cut RDP/SMB from the attacker and reset the pivoted account", "windows", `# Block lateral protocols from the source host\nNew-NetFirewallRule -DisplayName "IR-Block-Lateral" -Direction Inbound -Protocol TCP -LocalPort 445,3389,5985 -RemoteAddress <attacker-ip> -Action Block`, "Kill the movement path (SMB/RDP/WinRM) from the compromised host and rotate the account used to move.")],
    harden: [A("Segment the network and require MFA for admin protocols", "manual", "", "Host firewalls / VLAN segmentation + MFA on RDP/WinRM stop the pivot repeating.")],
  },
  "T1021.001": {
    contain: [A("Log off the attacker's RDP session and block 3389 from the source", "windows", `query session\nlogoff <SESSIONID>\nNew-NetFirewallRule -DisplayName "IR-Block-RDP" -Direction Inbound -Protocol TCP -LocalPort 3389 -RemoteAddress <attacker-ip> -Action Block`, "End the live RDP session, then block the port from the attacker.")],
    harden: [A("Restrict RDP to jump hosts + Network Level Authentication + MFA", "manual", "", "Never expose RDP flat; broker it through MFA-gated jump hosts.")],
  },
  "T1021.002": {
    contain: [A("Cut SMB from the attacker and audit admin-share access", "windows", `New-NetFirewallRule -DisplayName "IR-Block-SMB" -Direction Inbound -Protocol TCP -LocalPort 445 -RemoteAddress <attacker-ip> -Action Block\nGet-SmbSession | Format-Table ClientComputerName,ClientUserName\nClose-SmbSession -Force`, "Block 445 from the source and close live SMB sessions (PsExec/admin-share moves).")],
    harden: [A("Disable admin shares where unneeded and enforce SMB signing", "manual", "", "Reduce C$/ADMIN$ exposure and require signing to blunt relay/lateral abuse.")],
  },
  T1570: {
    eradicate: [A("Find and remove tools the attacker copied in", "windows", `Get-ChildItem C:\\Users\\*\\AppData\\Local\\Temp,C:\\Windows\\Temp,C:\\ProgramData -Recurse -Include *.exe,*.dll,*.ps1 -ErrorAction SilentlyContinue | Where-Object {$_.LastWriteTime -gt (Get-Date).AddDays(-2)} | Select-Object FullName,LastWriteTime`, "Staged tooling usually lands in Temp/ProgramData — hunt by recent write time and hash it for IOCs.")],
  },
  T1105: {
    contain: [A("Block the download source at the perimeter and DNS", "manual", "", "Cut the channel the attacker pulls tools/payloads through (see the IOC-blocking section below).")],
    eradicate: [A("Remove downloaded payloads and record their hashes", "windows", `Get-FileHash <path-to-file> -Algorithm SHA256`, "Hash before deleting so the indicator can be swept fleet-wide.")],
  },
  T1071: {
    contain: [A("Sinkhole/deny the C2 domains and IPs everywhere", "manual", "", "Block at firewall egress, DNS and proxy so beacons can't reach home (commands in the IOC-blocking section).")],
    harden: [A("Force outbound web through an inspecting proxy; alert on beacons", "manual", "", "Deny direct egress; jittered/periodic callbacks stand out through a proxy.")],
  },
  T1486: {
    contain: [
      A("Isolate every encrypting host and protect the backups NOW", "manual", "", "Ransomware spreads fast — segment first, and get backups offline/read-only before the attacker reaches them."),
      A("Identify the ransomware family and stop the spread mechanism", "manual", "", "Knowing the family tells you the propagation method (SMB, GPO, PsExec) to cut."),
    ],
    eradicate: [A("Rebuild encrypted hosts from clean media; remove persistence", "manual", "", "Do not just decrypt in place — reimage, because the intrusion that delivered ransomware is still present.")],
    recover: [
      A("Restore from verified clean backups, rebuilding tier-0 first", "manual", "", "Validate backup integrity before restoring; bring DCs/identity back first."),
      A("Rotate ALL credentials including krbtgt (twice) and service accounts", "ad", `# See T1003 krbtgt guidance — reset twice, one replication cycle apart.`, "Ransomware crews almost always have domain admin — assume total credential compromise."),
    ],
    harden: [A("Segment, enforce MFA, and keep offline immutable backups", "manual", "", "Immutable/offline backups + segmentation turn a domain-wide event into a contained one.")],
  },
  T1490: {
    contain: [A("Confirm shadow-copy/backup deletion and protect what remains", "windows", `vssadmin list shadows\nwevtutil qe Security "/q:*[System[(EventID=524)]]" /f:text /c:20`, "Attackers delete VSS/backups before encrypting — check what's gone and lock down the rest immediately.")],
    recover: [A("Restore from off-host backups the attacker couldn't reach", "manual", "", "On-host shadow copies are usually destroyed; rely on offline/immutable copies.")],
  },
  T1489: {
    eradicate: [A("Identify what stopped critical services and restart them cleanly", "windows", `Get-WinEvent -FilterHashtable @{LogName='System';Id=7036} -MaxEvents 50 | Select-Object TimeCreated,Message\nStart-Service -Name <svc>`, "Attackers stop AV/DB/backup services before acting — find the culprit, then restore service.")],
  },
  T1562: {
    contain: [A("Re-enable the security tooling the attacker disabled", "windows", `Set-MpPreference -DisableRealtimeMonitoring $false\nStart-Service WinDefend\nGet-MpComputerStatus | Select-Object RealTimeProtectionEnabled,AntivirusEnabled,AMServiceEnabled`, "Turn defenses back on so you're not blind. (Tamper Protection is managed from the Defender/Intune portal, not locally.)")],
    harden: [A("Enable Tamper Protection and alert when AV/EDR is disabled", "manual", "", "Tamper Protection blocks the disable; alerting catches attempts.")],
  },
  T1136: {
    eradicate: [A("Find and disable recently-created rogue accounts", "ad", `# AD\nGet-ADUser -Filter { whenCreated -gt (Get-Date).AddDays(-7) } -Properties whenCreated | Format-Table Name,whenCreated\nDisable-ADAccount -Identity <samAccountName>\n# Local\nGet-LocalUser | Sort-Object -Property @{e={$_.PasswordLastSet}} | Format-Table Name,Enabled,PasswordLastSet\nDisable-LocalUser -Name <name>`, "Backdoor accounts are persistence — hunt newly-created local and domain users and disable (don't delete: preserve for evidence).")],
    harden: [A("Alert on account creation (4720) and privileged group changes (4728/4732)", "manual", "", "New-account and group-add events flag this technique early.")],
  },
  T1070: {
    contain: [A("Check for cleared logs and switch to off-host logging now", "windows", `Get-WinEvent -FilterHashtable @{LogName='Security';Id=1102} -MaxEvents 10 | Select-Object TimeCreated,Message`, "Event ID 1102 = audit log cleared. If logs were wiped, forward everything to a SIEM/syslog the attacker can't reach.")],
    harden: [A("Ship logs off-host in real time and restrict who can clear them", "manual", "", "Central logging defeats local log deletion.")],
  },
  T1552: {
    eradicate: [A("Hunt for and purge credentials sitting in files/config", "linux", `grep -RilnE "password|passwd|secret|api[_-]?key|BEGIN (RSA|OPENSSH) PRIVATE KEY" /home /etc /var/www 2>/dev/null | head -50`, "Find plaintext secrets the attacker likely already grabbed, then rotate every one you find.")],
    harden: [A("Move secrets into a vault and scan repos/configs in CI", "manual", "", "A secrets manager + pre-commit/CI scanning stops credentials living in files.")],
  },
  T1558: {
    contain: [A("Find kerberoastable / AS-REP-roastable accounts exposed here", "ad", `# Accounts with SPNs (kerberoastable) and no-preauth (AS-REP roastable)\nGet-ADUser -Filter { ServicePrincipalName -like '*' } -Properties ServicePrincipalName,PasswordLastSet | Format-Table Name,PasswordLastSet\nGet-ADUser -Filter { DoesNotRequirePreAuth -eq $true } -Properties DoesNotRequirePreAuth | Format-Table Name`, "Identify the service/user accounts whose tickets could be cracked offline, so you know what to rotate.")],
    eradicate: [A("Reset the exposed service-account passwords (long/complex)", "ad", `Set-ADAccountPassword -Identity <svcAccount> -Reset -NewPassword (Read-Host -AsSecureString "New password (25+ chars)")`, "A cracked or forged service ticket is only killed by rotating that account's password.")],
    recover: [A("Reset krbtgt TWICE to invalidate golden tickets", "ad", `# Prefer New-KrbtgtKeys.ps1. Manual (TWICE, one replication cycle apart):\nSet-ADAccountPassword -Identity krbtgt -Reset -NewPassword (ConvertTo-SecureString ([System.Web.Security.Membership]::GeneratePassword(64,10)) -AsPlainText -Force)`, "Golden tickets are forged from the krbtgt hash — only a double reset fully revokes them.")],
    harden: [A("Force AES, use gMSA/25+ char service passwords, disable RC4", "ad", `# Group Managed Service Accounts remove the crackable password entirely\nNew-ADServiceAccount -Name <gMSA> -DNSHostName <host> -PrincipalsAllowedToRetrieveManagedPassword <group>`, "Long/managed passwords + AES-only make offline cracking infeasible.")],
  },
  T1550: {
    contain: [A("Reset the abused account's password to invalidate the hash/ticket", "ad", `Set-ADAccountPassword -Identity <samAccountName> -Reset -NewPassword (Read-Host -AsSecureString "New password")\n# For pass-the-ticket, also reset krbtgt twice (see T1558).`, "Pass-the-hash/ticket reuses stolen material — rotating the credential is what actually revokes it.")],
    harden: [A("Stop admin credential reuse: LAPS, tiered admin, deny NTLM where possible", "windows", `# Block members of a protected group from logging on to lower tiers, and use LAPS for local admin\nReset-LapsPassword -ComputerName <host>`, "Unique local-admin passwords and admin tiering stop one stolen hash unlocking the whole estate.")],
  },
  T1098: {
    eradicate: [A("Review and revert recent account/group changes and added keys", "ad", `# Recently-changed privileged group membership\nGet-ADGroupMember "Domain Admins" | Get-ADUser -Properties whenChanged | Sort-Object whenChanged -Descending | Format-Table Name,whenChanged\n# Remove an attacker-added member\nRemove-ADGroupMember -Identity "Domain Admins" -Members <samAccountName> -Confirm:$false`, "Attackers grant themselves persistence by adding accounts to privileged groups, adding SSH keys, or registering MFA — audit and revert each.")],
    harden: [A("Alert on group changes (4728/4732/4756) and new credential registration", "manual", "", "Privileged-group additions and new MFA/keys should page someone.")],
  },
  T1484: {
    eradicate: [A("Audit recent GPO / policy changes and restore from backup", "ad", `Get-GPO -All | Where-Object { $_.ModificationTime -gt (Get-Date).AddDays(-7) } | Format-Table DisplayName,ModificationTime\n# Restore a tampered GPO\nRestore-GPO -Name "<GPO Name>" -Path <backup-path>`, "Domain/tenant policy edits push attacker config (scripts, scheduled tasks, rights) fleet-wide — find recent changes and roll them back.")],
    harden: [A("Restrict who can edit GPOs and alert on 5136 directory changes", "manual", "", "Lock down GPO edit rights and monitor AD object modifications.")],
  },
  T1219: {
    contain: [A("Kill and block the remote-access tool (AnyDesk/TeamViewer/RMM)", "windows", `Get-Process | Where-Object { $_.ProcessName -match 'anydesk|teamviewer|screenconnect|atera|splashtop|ngrok' } | Select-Object Id,ProcessName,Path\nStop-Process -Name <toolname> -Force\n# Then block its update/relay domains at the perimeter and uninstall it.`, "Attackers install legitimate RMM/remote tools for hands-on access — terminate, block its infrastructure, then uninstall.")],
    harden: [A("Application-allowlist RMM tools; block unsanctioned ones", "manual", "", "Only your approved remote-support tool should run or reach the internet.")],
  },
  T1048: {
    contain: [A("Block the exfil destination + protocol and quantify what left", "linux", `# Block the destination; inspect proxy/DNS/netflow for volume to it\nsudo iptables -A OUTPUT -d <dest-ip> -j DROP\n# DNS-exfil hint: unusually long/frequent TXT queries to one domain`, "Cut the channel (DNS/FTP/ICMP/HTTP to an odd host), then use proxy/netflow logs to size the loss.")],
    harden: [A("Egress-filter outbound traffic and deploy DLP", "manual", "", "Default-deny egress + DLP catches and blocks alternative-protocol exfiltration.")],
  },
  T1485: {
    contain: [A("Isolate destroying hosts immediately and protect backups", "manual", "", "Data destruction spreads like ransomware — segment first and get backups offline/read-only.")],
    recover: [A("Restore from off-host, verified-clean backups", "manual", "", "On-host copies are usually targeted; rely on immutable/offline backups.")],
    harden: [A("Keep offline immutable backups and restrict mass-delete rights", "manual", "", "Immutable backups + least-privilege on bulk delete blunt destruction.")],
  },
  T1561: {
    contain: [A("Isolate wiped/wiping hosts and preserve one for analysis", "manual", "", "Disk wipers (often MBR/boot) render hosts unbootable — isolate to stop spread, image one victim for the wiper sample.")],
    recover: [A("Rebuild from images and restore data from offline backups", "manual", "", "Wiped systems must be reimaged; recover data only from off-host backups.")],
  },
  T1531: {
    contain: [A("Regain control via a break-glass admin and reset the locked accounts", "ad", `# Use an emergency/break-glass admin the attacker didn't touch\nSet-ADAccountPassword -Identity <lockedUser> -Reset -NewPassword (Read-Host -AsSecureString)\nEnable-ADAccount -Identity <lockedUser>`, "Attackers lock out defenders by changing passwords/deleting accounts — recover with a protected break-glass account.")],
    harden: [A("Keep monitored break-glass accounts and alert on mass password/lockout events", "manual", "", "A protected emergency account plus alerting on bulk account changes keeps you in control.")],
  },
  T1114: {
    contain: [A("Remove attacker inbox rules/forwards and revoke sessions", "m365", `# Connect-ExchangeOnline first. Hunt hidden forwarding + rules:\nGet-Mailbox <user> | Select-Object ForwardingSMTPAddress,DeliverToMailboxAndForward\nGet-InboxRule -Mailbox <user> | Format-Table Name,ForwardTo,RedirectTo,DeleteMessage\nRemove-InboxRule -Mailbox <user> -Identity "<rule>" -Confirm:$false\nRevoke-MgUserSignInSession -UserId <user@domain>`, "Email collection runs off auto-forwarding rules and delegate access — strip them and kill the sessions.")],
    harden: [A("Alert on new forwarding rules and disable external auto-forward", "manual", "", "Block external auto-forward at the tenant and alert on rule creation.")],
  },
  T1036: {
    eradicate: [A("Verify the suspect binary's real path, signature and hash", "windows", `Get-CimInstance Win32_Process -Filter "Name='svchost.exe'" | Select-Object ProcessId,ExecutablePath,CommandLine\nGet-AuthenticodeSignature <path-to-exe> | Select-Object Status,SignerCertificate\nGet-FileHash <path-to-exe> -Algorithm SHA256`, "Masquerading hides malware as a trusted name (e.g. svchost.exe in the wrong path) — confirm path, signature and hash, then kill/quarantine impostors.")],
    harden: [A("Enable application control (WDAC/AppLocker) to block untrusted binaries", "manual", "", "Signed-and-allowed-only execution defeats renamed/relocated malware.")],
  },
  T1112: {
    eradicate: [A("Compare the modified registry keys against a known-good baseline and revert", "windows", `reg query "<HKLM\\...\\suspect key>" /s\n# Export before changing, then delete the malicious value\nreg export "<key>" C:\\ir\\key-backup.reg\nreg delete "<key>" /v "<value>" /f`, "Registry edits underpin persistence, defense-evasion and config tampering — back up, then remove the attacker's values.")],
    harden: [A("Audit changes to sensitive registry keys", "manual", "", "Enable auditing on Run keys, services and security-policy hives.")],
  },
};

// ---- tactic-level fallbacks: every technique without a specific playbook
// still gets solid, phase-appropriate guidance based on its ATT&CK tactic ----
const TACTIC_FALLBACK = {
  "reconnaissance": {
    contain: [A("Confirm whether the recon led to access; scope what was exposed", "manual", "", "Reconnaissance itself isn't a breach — check perimeter/auth logs for follow-on activity from the same source and treat anything found as a real intrusion.")],
    harden: [A("Reduce external attack surface and remove leaked information", "manual", "", "Take down exposed services/credentials, tighten what's public (job posts, metadata, subdomains), and rate-limit/alert on scanning.")],
  },
  "resource-development": {
    contain: [A("Block the attacker infrastructure and pre-position detections", "manual", "", "If you've identified attacker domains/accounts/tooling being staged, block them (see the IOC-blocking section) and watch for their use.")],
    harden: [A("Monitor for newly-registered look-alike domains and leaked credentials", "manual", "", "Typosquat/brand monitoring and credential-leak alerting catch staging before it's used against you.")],
  },
  "initial-access": {
    contain: [A("Cut the entry vector and isolate the entry host", "manual", "", "Disable the exploited service, block the sender, or pull the exposed account — then isolate the first host (see the containment section above).")],
    eradicate: [A("Remove the foothold the attacker established on entry", "manual", "", "Webshell, dropped tool, added account or mail rule — find and remove whatever gave them a way back in.")],
    harden: [A("Patch the entry point and require MFA on all external access", "manual", "", "Close the specific vector (CVE, weak/exposed service, phishing path) and add MFA so a repeat attempt fails.")],
  },
  "execution": {
    eradicate: [A("Identify and kill the malicious process, capturing its command line", "windows", `Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine | Sort-Object Name\nStop-Process -Id <pid> -Force`, "Grab the full command line (for IOCs) before terminating the payload/interpreter.")],
    harden: [A("Enable command-line + script logging and application control", "windows", `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\\Audit" /v ProcessCreationIncludeCmdLine_Enabled /t REG_DWORD /d 1 /f`, "Full command-line auditing plus WDAC/AppLocker makes execution both visible and harder.")],
  },
  "persistence": {
    eradicate: [A("Sweep the host for persistence and remove the attacker's mechanism", "windows", `# Autoruns-style sweep: run keys, services, scheduled tasks, WMI subs, startup\nGet-CimInstance Win32_StartupCommand | Select-Object Name,Command,Location\nGet-ScheduledTask | Where-Object State -ne 'Disabled' | Select-Object TaskName,TaskPath\nGet-CimInstance -Namespace root\\subscription -Class __EventFilter | Select-Object Name,Query`, "Persistence hides in many places — enumerate autostarts, services, tasks and WMI subscriptions, then remove what's attacker-owned.")],
    recover: [A("If persistence can't be fully proven clean, rebuild the host", "manual", "", "For anything critical, reimaging is safer than chasing every persistence artifact.")],
    harden: [A("Baseline autoruns and alert on new persistence (4697/4698/7045)", "manual", "", "Alerting on service/task creation surfaces the next attempt fast.")],
  },
  "privilege-escalation": {
    contain: [A("Identify what the attacker escalated to and constrain that access", "windows", `whoami /priv\nGet-LocalGroupMember -Group Administrators\nGet-ADGroupMember "Domain Admins" | Select-Object name`, "Confirm which privileges/groups were gained so you know the blast radius, then remove attacker-added rights.")],
    eradicate: [A("Patch the escalation vector and remove attacker-added privileges", "manual", "", "Close the exploited weakness (kernel/app CVE, misconfig, token abuse) and revoke any rights they granted themselves.")],
    harden: [A("Enforce least privilege and keep hosts patched", "manual", "", "Fewer local admins + timely patching removes most escalation paths.")],
  },
  "defense-evasion": {
    contain: [A("Re-enable and verify security tooling; check for cleared logs", "windows", `Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled,AntivirusEnabled,AMServiceEnabled\nSet-MpPreference -DisableRealtimeMonitoring $false; Start-Service WinDefend\nGet-WinEvent -FilterHashtable @{LogName='Security';Id=1102} -MaxEvents 5`, "Evasion works by blinding you — restore AV/EDR and confirm logs weren't wiped (Event 1102).")],
    eradicate: [A("Remove the evasion artifacts (masqueraded files, hidden persistence)", "manual", "", "Hunt renamed/hidden binaries, tampered config and disabled controls, then restore them.")],
    harden: [A("Enable Tamper Protection and ship logs off-host in real time", "manual", "", "Tamper Protection blocks defense-disabling; central logging defeats local log deletion.")],
  },
  "credential-access": {
    contain: [A("Assume the targeted credentials are stolen and plan rotation", "manual", "", "Scope which accounts/secrets were reachable from the affected host, prioritising admins and service accounts.")],
    eradicate: [A("Force-reset the exposed credentials", "ad", `Set-ADAccountPassword -Identity <samAccountName> -Reset -NewPassword (Read-Host -AsSecureString "New password")\nSet-ADUser -Identity <samAccountName> -ChangePasswordAtLogon $true`, "Rotate every credential the attacker could have captured.")],
    harden: [A("Enforce MFA, LSA Protection and phishing-resistant auth", "windows", `reg add HKLM\\SYSTEM\\CurrentControlSet\\Control\\Lsa /v RunAsPPL /t REG_DWORD /d 1 /f`, "MFA + protected LSASS + FIDO2 blunt most credential theft.")],
  },
  "discovery": {
    contain: [A("Treat discovery as a live intruder mapping your environment", "manual", "", "Enumeration (accounts, shares, trusts, services) precedes lateral movement — hunt the same host/account for the next stage now, don't wait.")],
    harden: [A("Limit what low-privileged accounts can enumerate; alert on recon bursts", "manual", "", "Restrict anonymous/LDAP enumeration and alert on rapid net/AD discovery from one host.")],
  },
  "lateral-movement": {
    contain: [A("Cut the lateral protocols from the source and reset the pivot account", "windows", `New-NetFirewallRule -DisplayName "IR-Block-Lateral" -Direction Inbound -Protocol TCP -LocalPort 445,3389,5985 -RemoteAddress <attacker-ip> -Action Block`, "Block SMB/RDP/WinRM from the compromised host and rotate the account being used to move.")],
    eradicate: [A("Remove tooling the attacker transferred to reached hosts", "windows", `Get-ChildItem C:\\Windows\\Temp,C:\\ProgramData -Include *.exe,*.dll,*.ps1 -Recurse -ErrorAction SilentlyContinue | Where-Object LastWriteTime -gt (Get-Date).AddDays(-2)`, "Sweep each reached host for staged binaries and hash them for fleet-wide IOCs.")],
    harden: [A("Segment the network and require MFA on admin protocols", "manual", "", "Host-firewall/VLAN segmentation + MFA on RDP/WinRM stop the pivot repeating.")],
  },
  "collection": {
    contain: [A("Identify what data was staged and cut the collection", "windows", `# Recent large archives are classic staging\nGet-ChildItem C:\\,D:\\ -Include *.zip,*.rar,*.7z,*.tar,*.gz -Recurse -ErrorAction SilentlyContinue | Where-Object Length -gt 10MB | Sort-Object LastWriteTime -Descending | Select-Object FullName,Length,LastWriteTime`, "Find staged/archived data so you know what's at risk of exfiltration, then remove it and cut access.")],
    harden: [A("Apply least-privilege on sensitive repositories and deploy DLP", "manual", "", "Restrict who can bulk-read sensitive stores and watch for mass collection.")],
  },
  "command-and-control": {
    contain: [A("Block the C2 at the edge, DNS and proxy, then remove the implant", "manual", "", "Deny the beacon's destinations everywhere (see the IOC-blocking section) and kill/remove the implant process so it can't fail over to a backup channel.")],
    harden: [A("Force outbound through an inspecting proxy and alert on beaconing", "manual", "", "Default-deny egress with proxy inspection makes periodic/jittered callbacks stand out and fail.")],
  },
  "exfiltration": {
    contain: [A("Block the exfil destination, throttle egress, and size the loss", "manual", "", "Cut the channel to the destination, then use proxy/DLP/netflow logs to determine what and how much data left.")],
    harden: [A("Egress-filter outbound traffic and deploy DLP", "manual", "", "Default-deny egress + DLP detects and blocks bulk data leaving.")],
  },
  "impact": {
    contain: [A("Isolate affected hosts to stop the spread and protect backups", "manual", "", "Destructive/impact actions spread fast — segment immediately and get backups offline/read-only before they're reached.")],
    eradicate: [A("Remove the tool causing impact and the intrusion behind it", "manual", "", "Don't just undo the damage — the access that delivered it is still present; remove it too.")],
    recover: [A("Restore from verified clean backups, rebuilding identity/tier-0 first", "manual", "", "Validate backup integrity, bring DCs/identity back first, and rotate all credentials.")],
    harden: [A("Keep offline immutable backups and segment the network", "manual", "", "Immutable backups + segmentation turn a fleet-wide event into a contained one.")],
  },
};

// ---- IOC blocking (dynamic from the case's indicators) ----
function blockIocs(iocs) {
  const items = [];
  const ips = [...new Set(iocs.filter((x) => x.type === "ipv4").map((x) => x.value))];
  const domains = [...new Set(iocs.filter((x) => x.type === "domain").map((x) => x.value))];
  const urls = [...new Set(iocs.filter((x) => x.type === "url").map((x) => x.value))];
  const hashes = [...new Set(iocs.filter((x) => ["md5", "sha1", "sha256"].includes(x.type)).map((x) => x.value))];
  if (ips.length) {
    items.push(A(
      `Block ${ips.length} malicious IP${ips.length > 1 ? "s" : ""} outbound (host firewall)`,
      "windows",
      ips.map((ip) => `New-NetFirewallRule -DisplayName "IR-Block-${ip}" -Direction Outbound -Action Block -RemoteAddress ${ip}`).join("\n"),
      "Deny egress to the attacker infrastructure on Windows hosts."
    ));
    items.push(A(
      `Block the same IP${ips.length > 1 ? "s" : ""} on Linux and at the edge`,
      "linux",
      ips.map((ip) => `sudo iptables -A OUTPUT -d ${ip} -j DROP`).join("\n") + `\n# Also add these to your perimeter firewall / proxy deny-list.`,
      "Do it on Linux hosts and — more importantly — once at the perimeter so every host is covered."
    ));
  }
  if (domains.length) {
    items.push(A(
      `Sinkhole ${domains.length} C2 domain${domains.length > 1 ? "s" : ""}`,
      "linux",
      domains.map((d) => `echo "0.0.0.0 ${d}" | sudo tee -a /etc/hosts`).join("\n") + `\n# Better: add these to your DNS/proxy block-list so it covers the whole estate.`,
      "Point the C2 domains at nowhere. A DNS/proxy block-list is the real fix; the hosts entry is a quick local stopgap."
    ));
  }
  if (urls.length) {
    items.push(A(`Block ${urls.length} malicious URL${urls.length > 1 ? "s" : ""} at the proxy`, "manual", urls.join("\n"), "Add these exact URLs to your web-proxy deny-list."));
  }
  if (hashes.length) {
    items.push(A(
      `Blocklist ${hashes.length} file hash${hashes.length > 1 ? "es" : ""} in EDR and sweep for them`,
      "edr",
      hashes.join("\n"),
      "Add these hashes to your EDR custom-IOC/blocklist and run a fleet-wide search to find every host that has the file."
    ));
  }
  return items;
}

/**
 * Build a tailored response plan for a finding.
 * @param {object} finding  { id, title, severity, attack:[], assets:[{type,name,ip}], technicalDetail }
 * @param {object} ctx      { iocs: [{type, value}] }
 */
function advise(finding, ctx) {
  ctx = ctx || {};
  const iocs = ctx.iocs || [];
  const hosts = (finding.assets || []).map(parseHost);
  const attackerIp = (iocs.find((x) => x.type === "ipv4") || {}).value ||
    ((finding.technicalDetail || "").match(IPV4) || [])[0] || "";

  // resolve matched techniques: exact id + parent (T1003.001 -> also T1003)
  const raw = finding.attack || [];
  const ids = new Set();
  raw.forEach((id) => { ids.add(id); if (id.includes(".")) ids.add(id.split(".")[0]); });
  const matched = [];
  const seenName = new Set();
  raw.forEach((id) => { if (!seenName.has(id)) { seenName.add(id); matched.push({ id, name: TNAME[id] || "" }); } });
  const withPlaybook = raw.filter((id) => TECH[id] || TECH[id.split(".")[0]]);

  const buckets = { triage: [], contain: [], eradicate: [], recover: [], block: [], harden: [] };

  // 1) per-host triage + containment (always, when we know the hosts)
  if (hosts.length) {
    hosts.forEach((h) => {
      preserveEvidence(h).forEach((it) => buckets.triage.push(it));
      isolateHost(h, attackerIp).forEach((it) => buckets.contain.push(it));
      cutSessions(h, attackerIp).forEach((it) => buckets.contain.push(it));
    });
  } else {
    buckets.contain.push(A("Isolate the affected host(s)", "edr", "", "No systems are attached to this finding yet — add them under 'Affected systems' and re-open this advisor for host-specific commands."));
  }

  // 2) technique-specific advice (exact id + parent, deduped)
  const applied = new Set();
  [...ids].forEach((id) => {
    const kb = TECH[id];
    if (!kb || applied.has(id)) return;
    applied.add(id);
    ["contain", "eradicate", "recover", "harden"].forEach((ph) => (kb[ph] || []).forEach((it) => buckets[ph].push(it)));
  });

  // 2b) tactic-level fallback: any matched technique WITHOUT a specific
  // playbook still gets phase-appropriate guidance from its ATT&CK tactic
  const tacticsUsed = [];
  raw.forEach((id) => {
    if (TECH[id] || TECH[id.split(".")[0]]) return; // has a specific playbook already
    const tac = TTACTIC[id] || TTACTIC[id.split(".")[0]];
    if (tac && TACTIC_FALLBACK[tac] && tacticsUsed.indexOf(tac) < 0) tacticsUsed.push(tac);
  });
  tacticsUsed.forEach((tac) => {
    const kb = TACTIC_FALLBACK[tac];
    ["contain", "eradicate", "recover", "harden"].forEach((ph) => (kb[ph] || []).forEach((it) => buckets[ph].push(it)));
  });

  // 3) IOC blocking from the case indicators
  blockIocs(iocs).forEach((it) => buckets.block.push(it));

  // 4) if the finding has no ATT&CK technique at all, nudge to add one
  if (!raw.length) {
    buckets.harden.push(A("Map this finding to an ATT&CK technique for targeted advice", "manual", "", "Add the technique ID(s) on the finding (use the ATT&CK helper) and re-open this advisor for technique-specific containment and eradication steps."));
  }

  // substitute the few global placeholders in technique items
  const subs = (s) => String(s || "")
    .replace(/<attacker-ip>/g, attackerIp || "<attacker-ip>")
    .replace(/\{HOST\}/g, hosts[0] ? hosts[0].host : "the host")
    .replace(/\{IP\}/g, (hosts[0] && hosts[0].ip) || attackerIp || "<host-ip>");

  // build sections, deduping repeated advice by text within each phase
  const sections = PHASES.map(([key, label]) => {
    const seen = new Set();
    const items = buckets[key].filter((it) => { if (seen.has(it.text)) return false; seen.add(it.text); return true; })
      .map((it) => ({ ...it, text: subs(it.text), cmd: subs(it.cmd), platformLabel: PLATFORMS[it.platform] || "Step" }));
    return { key, label, items };
  }).filter((s) => s.items.length);

  return {
    findingId: finding.id,
    title: finding.title,
    severity: finding.severity,
    hosts: hosts.map((h) => ({ host: h.host, ip: h.ip, type: h.type })),
    attackerIp,
    matched,
    hasPlaybook: withPlaybook.length > 0 || tacticsUsed.length > 0,
    specificCount: withPlaybook.length,
    tacticGuidance: tacticsUsed.map((t) => TACTIC_NAME[t] || t),
    sections,
  };
}
