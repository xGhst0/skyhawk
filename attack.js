// Offline MITRE ATT&CK helper: a compact enterprise cheat sheet + a keyword
// suggester so analysts who don't know technique IDs can pick the right one.
const tactics = [
  { id: "reconnaissance", name: "Reconnaissance" },
  { id: "resource-development", name: "Resource Development" },
  { id: "initial-access", name: "Initial Access" },
  { id: "execution", name: "Execution" },
  { id: "persistence", name: "Persistence" },
  { id: "privilege-escalation", name: "Privilege Escalation" },
  { id: "defense-evasion", name: "Defense Evasion" },
  { id: "credential-access", name: "Credential Access" },
  { id: "discovery", name: "Discovery" },
  { id: "lateral-movement", name: "Lateral Movement" },
  { id: "collection", name: "Collection" },
  { id: "command-and-control", name: "Command and Control" },
  { id: "exfiltration", name: "Exfiltration" },
  { id: "impact", name: "Impact" },
];
const T = (id, name, tactic, keywords) => ({ id, name, tactic, keywords });
const techniques = [
  T("T1595", "Active Scanning", "reconnaissance", ["scan", "nmap", "port scan", "recon", "probe"]),
  T("T1566", "Phishing", "initial-access", ["phish", "email", "attachment", "malicious link", "lure", "spearphish"]),
  T("T1566.001", "Spearphishing Attachment", "initial-access", ["attachment", "macro", "doc", "malicious file", "email attachment"]),
  T("T1190", "Exploit Public-Facing Application", "initial-access", ["exploit", "vulnerability", "cve", "web", "rce", "internet-facing", "upload", "webshell", "public"]),
  T("T1133", "External Remote Services", "initial-access", ["rdp", "vpn", "remote desktop", "remote service", "exposed", "citrix", "ssh"]),
  T("T1078", "Valid Accounts", "initial-access", ["valid account", "stolen credentials", "legitimate login", "compromised account"]),
  T("T1204", "User Execution", "execution", ["user opened", "double-click", "ran", "executed", "clicked"]),
  T("T1059", "Command and Scripting Interpreter", "execution", ["powershell", "cmd", "bash", "script", "command line", "wscript", "cscript"]),
  T("T1059.001", "PowerShell", "execution", ["powershell", "encoded command", "iex", "downloadstring"]),
  T("T1053", "Scheduled Task/Job", "persistence", ["scheduled task", "schtasks", "cron", "at job", "task scheduler"]),
  T("T1053.005", "Scheduled Task", "persistence", ["schtasks", "scheduled task", "onlogon", "task"]),
  T("T1547", "Boot or Logon Autostart Execution", "persistence", ["run key", "registry autostart", "startup folder", "logon"]),
  T("T1543", "Create or Modify System Process", "persistence", ["service", "new service", "daemon", "systemd", "sc create"]),
  T("T1136", "Create Account", "persistence", ["created account", "new user", "net user /add", "adduser"]),
  T("T1068", "Exploitation for Privilege Escalation", "privilege-escalation", ["privilege escalation", "local exploit", "kernel exploit", "getsystem"]),
  T("T1548", "Abuse Elevation Control Mechanism", "privilege-escalation", ["uac bypass", "sudo", "setuid", "elevation"]),
  T("T1055", "Process Injection", "defense-evasion", ["injection", "inject", "hollowing", "reflective", "dll injection"]),
  T("T1562", "Impair Defenses", "defense-evasion", ["disabled defender", "disable av", "stopped edr", "tamper", "disable logging", "cleared logs"]),
  T("T1562.001", "Disable or Modify Tools", "defense-evasion", ["disabled defender", "disable antivirus", "kill edr", "stop service"]),
  T("T1070", "Indicator Removal", "defense-evasion", ["cleared logs", "delete logs", "wevtutil", "timestomp", "wipe"]),
  T("T1027", "Obfuscated Files or Information", "defense-evasion", ["obfuscated", "encoded", "base64", "packed", "encrypted payload"]),
  T("T1003", "OS Credential Dumping", "credential-access", ["credential dump", "lsass", "mimikatz", "sam", "ntds", "hashdump"]),
  T("T1003.001", "LSASS Memory", "credential-access", ["lsass", "procdump", "comsvcs", "memory dump", "mimikatz"]),
  T("T1110", "Brute Force", "credential-access", ["brute force", "password spray", "guessing", "failed logons", "many attempts"]),
  T("T1552", "Unsecured Credentials", "credential-access", ["password in file", "plaintext credentials", "hardcoded", "config password"]),
  T("T1087", "Account Discovery", "discovery", ["net user", "account enumeration", "whoami", "list users", "net group"]),
  T("T1046", "Network Service Discovery", "discovery", ["port scan", "service scan", "network scan", "enumerate services"]),
  T("T1018", "Remote System Discovery", "discovery", ["ping sweep", "net view", "remote hosts", "arp", "discover hosts"]),
  T("T1021", "Remote Services", "lateral-movement", ["lateral movement", "rdp", "smb", "psexec", "winrm", "ssh", "wmi"]),
  T("T1021.002", "SMB/Windows Admin Shares", "lateral-movement", ["smb", "admin share", "psexec", "c$", "admin$", "lateral"]),
  T("T1021.001", "Remote Desktop Protocol", "lateral-movement", ["rdp", "remote desktop", "3389", "mstsc"]),
  T("T1570", "Lateral Tool Transfer", "lateral-movement", ["copied tool", "transferred binary", "staged tool", "pushed file"]),
  T("T1560", "Archive Collected Data", "collection", ["zip", "rar", "7z", "archived", "compressed data", "staging"]),
  T("T1071", "Application Layer Protocol", "command-and-control", ["c2", "http beacon", "dns tunneling", "https callback", "command and control"]),
  T("T1105", "Ingress Tool Transfer", "command-and-control", ["downloaded", "curl", "wget", "certutil", "bitsadmin", "payload download"]),
  T("T1567", "Exfiltration Over Web Service", "exfiltration", ["exfil", "upload to cloud", "mega", "dropbox", "data theft", "exfiltration"]),
  T("T1041", "Exfiltration Over C2 Channel", "exfiltration", ["exfil over c2", "data sent to c2", "beacon exfil"]),
  T("T1486", "Data Encrypted for Impact", "impact", ["ransomware", "encrypted files", "ransom note", "lockbit", "extension", "crypto-locker"]),
  T("T1490", "Inhibit System Recovery", "impact", ["deleted backups", "vssadmin delete", "shadow copies", "wbadmin", "disable recovery"]),
  T("T1489", "Service Stop", "impact", ["stopped service", "killed database", "service stop", "disrupt"]),
  T("T1498", "Network Denial of Service", "impact", ["ddos", "denial of service", "flood", "dos"]),
];

function suggest(text) {
  const t = String(text || "").toLowerCase();
  if (!t.trim()) return [];
  const scored = techniques.map((x) => {
    let s = 0;
    for (const k of x.keywords) if (t.includes(k)) s += k.length > 6 ? 3 : 2;
    if (t.includes(x.name.toLowerCase())) s += 4;
    return { ...x, score: s };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, 6);
}
module.exports = { tactics, techniques, suggest };
