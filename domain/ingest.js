"use strict";
// Offline evidence ingestion. Parses structured tool exports (CSV / NDJSON /
// JSON) entirely locally — no network, no dependencies — and normalises them
// into the case's own shapes: timeline events, IOCs and findings. The first
// profile is Chainsaw (WithSecure) Sigma-hunt output; the reader layer is
// generic so more profiles slot in beside it.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
exports.detect = detect;
exports.dedupe = dedupe;
exports.profiles = profileList;

// ---------- pure-JS readers (no deps) ----------
function parseCsv(text) {
  const rows = []; let row = [], field = "", inQ = false;
  const s = text.replace(/^﻿/, ""); // strip BOM
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); if (row.length > 1 || row[0] !== "") rows.push(row); }
  if (!rows.length) return { header: [], rows: [] };
  const header = rows[0].map((h) => h.trim());
  const out = rows.slice(1).map((r) => { const o = {}; header.forEach((h, i) => { o[h] = r[i] != null ? r[i] : ""; }); return o; });
  return { header, rows: out };
}
function parseJsonish(text) {
  const t = text.trim();
  if (!t) return [];
  // NDJSON / JSONL: one object per line
  if (t[0] !== "[" && t.indexOf("\n") > 0) {
    const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const objs = [];
    for (const l of lines) { try { objs.push(JSON.parse(l)); } catch {} }
    if (objs.length) return objs;
  }
  try { const v = JSON.parse(t); return Array.isArray(v) ? v : [v]; } catch { return []; }
}

// ---------- IOC extraction (self-contained) ----------
const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const SHA256 = /\b[a-f0-9]{64}\b/gi, SHA1 = /\b[a-f0-9]{40}\b/gi, MD5 = /\b[a-f0-9]{32}\b/gi;
const DOMAIN = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|top|xyz|ru|cn|info|biz|io|co|us|uk|de|nl|onion|su|cc|tk|ml|ga|cf|pw|club|site|online|live|link)\b/gi;
const URLRE = /\bhttps?:\/\/[^\s"'<>)\]]+/gi;
const PRIVATE_IP = /^(?:10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|22[4-9]\.|2[3-5]\d\.|255\.)/;
function extractIocs(text, into, seen) {
  if (!text) return;
  const push = (type, v) => { const k = type + ":" + v.toLowerCase(); if (seen.has(k)) return; seen.add(k); into.push({ type, value: v }); };
  (text.match(SHA256) || []).forEach((v) => push("sha256", v));
  (text.match(URLRE) || []).forEach((v) => push("url", v));
  (text.match(IPV4) || []).forEach((v) => { if (!PRIVATE_IP.test(v)) push("ipv4", v); });
  (text.match(DOMAIN) || []).forEach((v) => push("domain", v));
  // sha1/md5 after sha256 to avoid overlap consuming; run on residual
  (text.match(SHA1) || []).forEach((v) => { if (v.length === 40) push("sha1", v); });
  (text.match(MD5) || []).forEach((v) => { if (v.length === 32) push("md5", v); });
}

// ---------- helpers ----------
const ATTACK_RE = /\bT\d{4}(?:\.\d{3})?\b/gi;
const LEVEL_RANK = { critical: 4, high: 3, medium: 2, low: 1, informational: 0, info: 0 };
const normLevel = (l) => { const x = String(l || "").toLowerCase().trim(); return ["critical", "high", "medium", "low"].includes(x) ? x : (x === "informational" || x === "info" ? "low" : ""); };
const ci = (obj, ...names) => { // case-insensitive field getter, first match wins
  const keys = Object.keys(obj);
  for (const n of names) { const k = keys.find((k) => k.toLowerCase() === n.toLowerCase()); if (k != null && obj[k] !== "" && obj[k] != null) return obj[k]; }
  return "";
};
const toIso = (v) => { if (!v) return null; const d = new Date(String(v).replace(" ", "T")); return isNaN(d) ? null : d.toISOString(); };
const hostAsset = (name) => ({ type: /dc\d|domain/i.test(name) ? "domain controller" : /srv|server/i.test(name) ? "server" : "workstation", name: String(name).slice(0, 80), ip: "" });
// a normalized event for the lake / SIEM tab
const mkEvent = (source, type, o) => ({ ts: o.ts || null, source, type: type || "", host: o.host || o.saddr || "", saddr: o.saddr || "", sport: o.sport != null ? String(o.sport) : "", daddr: o.daddr || "", dport: o.dport != null ? String(o.dport) : "", proto: (o.proto || "").toString().toLowerCase(), msg: (o.msg || "").toString().slice(0, 300), attack: o.attack || [], fields: o.fields || {}, raw: o.raw != null ? o.raw : null });

// ---------- network map extraction (hosts = nodes, flows = connectors) ----------
const ZONE_X = { external: 110, dmz: 345, internal: 585 };
function mapFromEvents(events, existing, opts) {
  opts = opts || {}; const capNodes = opts.capNodes || 48, capEdges = opts.capEdges || 90;
  const base = existing && typeof existing === "object" ? existing : {};
  const nodes = Array.isArray(base.nodes) ? base.nodes.slice() : [];
  const edges = Array.isArray(base.edges) ? base.edges.slice() : [];
  const byIp = {}; nodes.forEach((n) => { const k = (n.ip || n.name || "").toLowerCase(); if (k) byIp[k] = n; });
  const yz = {}; let seq = 0;
  const ensure = (ip) => {
    if (!ip || ip === "-") return null; const k = ip.toLowerCase();
    if (byIp[k]) return byIp[k];
    if (nodes.length >= capNodes) return null;
    const pub = !PRIVATE_IP.test(ip), zone = pub ? "external" : "internal";
    const n = { id: "ni" + (Date.now().toString(36)) + (seq++).toString(36), type: pub ? "external host" : "server", name: ip, ip, state: pub ? "external" : "clean", x: ZONE_X[zone], y: 50 + ((yz[zone] = (yz[zone] || 0) + 1) - 1) * 66 };
    nodes.push(n); byIp[k] = n; return n;
  };
  const eseen = new Set(edges.map((e) => e.a + "|" + e.b));
  // alert/attack-bearing flows first so the most useful connectors survive the cap
  const ordered = events.slice().sort((a, b) => ((b.attack && b.attack.length) ? 1 : 0) - ((a.attack && a.attack.length) ? 1 : 0));
  for (const ev of ordered) {
    if (!ev.saddr || !ev.daddr) continue;
    const a = ensure(ev.saddr), b = ensure(ev.daddr);
    if (!a || !b || a === b) continue;
    if (eseen.has(a.id + "|" + b.id) || eseen.has(b.id + "|" + a.id)) continue;
    if (edges.length >= capEdges) break;
    eseen.add(a.id + "|" + b.id);
    const label = (ev.attack && ev.attack.length) ? ev.attack[0] : (ev.proto ? ev.proto + (ev.dport ? "/" + ev.dport : "") : "");
    edges.push({ a: a.id, b: b.id, label: String(label).slice(0, 24) });
  }
  return { nodes, edges };
}

// ---------- Chainsaw profile ----------
const chainsaw = {
  id: "chainsaw",
  label: "Chainsaw (Sigma hunt)",
  detect(text, filename, csv, json) {
    const f = (filename || "").toLowerCase();
    if (csv && csv.header.length) {
      const h = csv.header.map((x) => x.toLowerCase());
      if (h.includes("detections") && h.includes("timestamp")) return true;
    }
    if (json && json.length) {
      const d = json[0];
      if (d && (d.detections || d.document || (d.kind && d.data))) return true;
    }
    return /chainsaw/.test(f);
  },
  normalize(text, filename, csv, json) {
    // build a uniform list of "hits": {at, rule, host, user, srcip, eid, detail, level, attack[]}
    const hits = [];
    if (csv && csv.rows.length) {
      for (const r of csv.rows) {
        const at = toIso(ci(r, "timestamp", "SystemTime", "Event Time", "time"));
        const rule = ci(r, "detections", "detection", "rule", "title") || "Chainsaw detection";
        const host = ci(r, "Computer", "Computer Name", "Hostname", "host");
        const user = ci(r, "User", "User Name", "Account", "TargetUserName", "SubjectUserName");
        const srcip = ci(r, "Source IP", "SourceIp", "IpAddress", "Source Address");
        const eid = ci(r, "Event ID", "EventID", "Event Id");
        const cmd = ci(r, "Command Line", "CommandLine", "ProcessCommandLine", "Information", "Details");
        const level = normLevel(ci(r, "level", "Level", "severity"));
        const tags = ci(r, "tags", "Tags", "attack", "mitre");
        const blob = [rule, host, user, srcip, eid, cmd, tags, JSON.stringify(r)].join(" ");
        hits.push({ at, rule, host, user, srcip, eid, cmd, level, attack: [...new Set((blob.match(ATTACK_RE) || []).map((t) => t.toUpperCase()))], blob });
      }
    }
    if (json && json.length) {
      for (const d of json) {
        const dataDoc = (d.document && d.document.data) || d.data || d;
        const ev = dataDoc && dataDoc.Event ? dataDoc.Event : dataDoc;
        const sys = (ev && ev.System) || {};
        const edata = (ev && ev.EventData) || {};
        const at = toIso(d.timestamp || (sys.TimeCreated && (sys.TimeCreated["#attributes"] ? sys.TimeCreated["#attributes"].SystemTime : sys.TimeCreated)) || d.SystemTime);
        const detArr = d.detections || d.rules || [];
        const rule = Array.isArray(detArr) ? detArr.map((x) => (typeof x === "string" ? x : (x.name || x.title))).filter(Boolean).join("; ") : String(detArr || "Chainsaw detection");
        const level = normLevel(Array.isArray(detArr) && detArr[0] && detArr[0].level);
        const host = sys.Computer || ci(edata, "Computer", "Hostname") || "";
        const user = ci(edata, "TargetUserName", "SubjectUserName", "User") || "";
        const srcip = ci(edata, "IpAddress", "SourceIp", "SourceAddress") || "";
        const eid = (sys.EventID && (sys.EventID["#text"] || sys.EventID)) || "";
        const cmd = ci(edata, "CommandLine", "ProcessCommandLine", "Image") || "";
        const blob = JSON.stringify(d);
        hits.push({ at, rule: rule || "Chainsaw detection", host, user, srcip, eid, cmd, level, attack: [...new Set((blob.match(ATTACK_RE) || []).map((t) => t.toUpperCase()))], blob });
      }
    }
    return hitsToItems(hits);
  },
};

function hitsToItems(hits) {
  const timeline = [], iocs = [], iocSeen = new Set(), byRule = {};
  for (const h of hits) {
    const bits = [];
    if (h.eid) bits.push("EID " + h.eid);
    if (h.user) bits.push("user " + h.user);
    if (h.srcip) bits.push("src " + h.srcip);
    if (h.cmd) bits.push(String(h.cmd).slice(0, 160));
    const text = h.rule + (h.host ? " on " + h.host : "") + (bits.length ? " — " + bits.join(" · ") : "");
    timeline.push({ at: h.at || new Date().toISOString(), text: text.slice(0, 500), source: "Chainsaw", level: h.level });
    extractIocs([h.srcip, h.cmd, h.blob].join(" "), iocs, iocSeen);
    const key = h.rule;
    const g = byRule[key] || (byRule[key] = { rule: key, hosts: new Set(), count: 0, level: "", attack: new Set(), first: null, last: null, sampleCmd: "" });
    g.count++;
    if (h.host) g.hosts.add(h.host);
    if (LEVEL_RANK[h.level] > (LEVEL_RANK[g.level] || -1)) g.level = h.level;
    (h.attack || []).forEach((t) => g.attack.add(t));
    if (h.at) { if (!g.first || h.at < g.first) g.first = h.at; if (!g.last || h.at > g.last) g.last = h.at; }
    if (!g.sampleCmd && h.cmd) g.sampleCmd = String(h.cmd).slice(0, 200);
  }
  const findings = Object.values(byRule).map((g) => {
    const hosts = [...g.hosts];
    const when = g.first ? (g.first === g.last ? g.first : g.first + " → " + g.last) : "";
    return {
      title: g.rule.slice(0, 200),
      severity: g.level || "medium",
      technicalDetail: `Chainsaw flagged ${g.count} matching event${g.count > 1 ? "s" : ""}` +
        (hosts.length ? ` on ${hosts.join(", ")}` : "") + (when ? ` (${when})` : "") + "." +
        (g.sampleCmd ? `\nSample: ${g.sampleCmd}` : ""),
      attack: [...g.attack],
      assets: hosts.map(hostAsset),
      _count: g.count,
    };
  }).sort((a, b) => (LEVEL_RANK[b.severity] || 0) - (LEVEL_RANK[a.severity] || 0) || b._count - a._count);
  return { timeline, iocs, findings };
}

// ---------- offline Windows event detection (a Chainsaw-free mini-engine) ----------
// Maps high-signal Windows event IDs to ATT&CK-tagged findings, so a host can
// just export its event logs (no Chainsaw install) and SKYHAWK does the hunting.
const EV_SUSP_CMD = /-enc\b|-encodedcommand|frombase64string|downloadstring|\biex\b|invoke-expression|\-nop\b|-w(indowstyle)?\s+hidden|-noni|certutil\b[^\n]*(-urlcache|-decode)|bitsadmin|\bmshta\b|regsvr32\b[^\n]*http|rundll32\b[^\n]*(javascript|http)|\bnc\.exe\b|Invoke-WebRequest[^\n]*-outfile/i;
const EV_SUSP_PATH = /\\(temp|appdata|programdata|windows\\temp|users\\public|\$recycle)\\/i;
const evd = (d, ...names) => { const keys = Object.keys(d || {}); for (const n of names) { const k = keys.find((k) => k.toLowerCase() === n.toLowerCase()); if (k != null && d[k] !== "" && d[k] != null) return String(d[k]); } return ""; };
const extIp = (ip) => ip && ip !== "-" && !PRIVATE_IP.test(ip) && ip !== "::1" && ip !== "::";

function processWinEvents(events, host) {
  const timeline = [], iocs = [], seen = new Set(), g = {};
  const add = (key, title, sev, attack, comp, at, sample) => {
    const it = g[key] || (g[key] = { title, sev: "", attack: new Set(), hosts: new Set(), count: 0, sample: "", first: null, last: null });
    it.count++; if (comp) it.hosts.add(comp);
    (attack || []).forEach((a) => it.attack.add(a));
    if (sev && (LEVEL_RANK[sev] || 0) > (LEVEL_RANK[it.sev] || -1)) it.sev = sev;
    if (!it.sample && sample) it.sample = String(sample).slice(0, 220);
    if (at) { if (!it.first || at < it.first) it.first = at; if (!it.last || at > it.last) it.last = at; }
  };
  let failed = 0, fUsers = new Set(), fIps = new Set(), fLast = null, fHost = host;
  for (const ev of (events || [])) {
    const ch = String(ev.channel || ""), id = Number(ev.id) || 0, d = ev.data || {}, at = toIso(ev.time), comp = ev.computer || host;
    extractIocs(Object.keys(d).map((k) => d[k]).join(" "), iocs, seen);
    const sysmon = /sysmon/i.test(ch), ps = /powershell/i.test(ch), defender = /defender/i.test(ch), sec = /security/i.test(ch), sys = /system/i.test(ch);
    if (sec && id === 4624) {
      const lt = evd(d, "LogonType"), u = evd(d, "TargetUserName"), ip = evd(d, "IpAddress");
      if (extIp(ip)) timeline.push({ at, text: `Logon type ${lt} ${u} from ${ip} on ${comp}`.slice(0, 500), source: "eventlog:" + comp });
      if (lt === "10" && extIp(ip)) add("rdp-ext", "External RDP logon", "high", ["T1021.001"], comp, at, `${u} from ${ip}`);
    } else if (sec && id === 4625) {
      failed++; const u = evd(d, "TargetUserName"), ip = evd(d, "IpAddress");
      if (u) fUsers.add(u); if (ip && ip !== "-") fIps.add(ip); if (at && (!fLast || at > fLast)) fLast = at; fHost = comp;
    } else if (sec && id === 4688) {
      const img = evd(d, "NewProcessName", "ProcessName"), cmd = evd(d, "CommandLine");
      if (cmd && EV_SUSP_CMD.test(cmd)) add("susp-cmd", "Suspicious process command line", "high", ["T1059"], comp, at, cmd);
      else if (img && EV_SUSP_PATH.test(img)) add("susp-path", "Process run from a suspicious path", "medium", ["T1204"], comp, at, img);
    } else if (sec && id === 4720) add("acct-new", "Account created", "medium", ["T1136.001"], comp, at, evd(d, "TargetUserName"));
    else if (sec && (id === 4728 || id === 4732 || id === 4756)) add("group-add", "Member added to a privileged group", "high", ["T1098"], comp, at, evd(d, "MemberName", "TargetUserName"));
    else if (sec && id === 4698) add("sched-task", "Scheduled task created", "medium", ["T1053.005"], comp, at, evd(d, "TaskName"));
    else if ((sec && id === 1102) || (sys && id === 104)) add("log-clear", "Event log cleared", "high", ["T1070.001"], comp, at, evd(d, "SubjectUserName"));
    else if (sys && id === 7045) {
      const svc = evd(d, "ServiceName"), pth = evd(d, "ImagePath");
      add("svc-install", "Service installed", (pth && EV_SUSP_PATH.test(pth)) ? "high" : "medium", ["T1543.003"], comp, at, `${svc} -> ${pth}`);
    } else if (ps && id === 4104) {
      const sb = evd(d, "ScriptBlockText");
      if (sb && EV_SUSP_CMD.test(sb)) add("susp-ps", "Suspicious PowerShell script block", "high", ["T1059.001"], comp, at, sb);
    } else if (sysmon && id === 1) {
      const cmd = evd(d, "CommandLine"), img = evd(d, "Image"), hashes = evd(d, "Hashes");
      if (hashes) extractIocs(hashes, iocs, seen);
      if (cmd && EV_SUSP_CMD.test(cmd)) add("susp-cmd", "Suspicious process command line", "high", ["T1059"], comp, at, cmd);
      else if (img && EV_SUSP_PATH.test(img)) add("susp-path", "Process run from a suspicious path", "medium", ["T1204"], comp, at, img);
    } else if (sysmon && id === 3) {
      const dip = evd(d, "DestinationIp"), dport = evd(d, "DestinationPort");
      if (extIp(dip)) { extractIocs(dip, iocs, seen); timeline.push({ at, text: `Outbound connection to ${dip}:${dport} from ${comp}`.slice(0, 500), source: "eventlog:" + comp }); }
    } else if (sysmon && id === 10) {
      if (/lsass\.exe/i.test(evd(d, "TargetImage"))) add("lsass", "LSASS access (possible credential dumping)", "critical", ["T1003.001"], comp, at, evd(d, "SourceImage"));
    } else if (defender && (id === 1116 || id === 1117)) add("av-detect", "Endpoint AV detection", "high", ["T1204"], comp, at, evd(d, "Threat Name", "ThreatName", "Threat_Name"));
    else if (defender && (id === 5001 || id === 5010 || id === 5012)) add("av-off", "Endpoint protection disabled", "high", ["T1562.001"], comp, at, "");
  }
  if (failed >= 8) add("brute", "Failed-logon burst (possible brute force / password spraying)", "medium", ["T1110"], fHost, fLast, `${failed} failures, ${fUsers.size} users, ${fIps.size} source IPs`);
  fIps.forEach((ip) => { if (ip && ip !== "-") extractIocs(ip, iocs, seen); });
  const findings = Object.values(g).map((x) => {
    const hosts = [...x.hosts], when = x.first ? (x.first === x.last ? x.first : x.first + " -> " + x.last) : "";
    return { title: x.title, severity: x.sev || "medium", attack: [...x.attack], assets: hosts.map(hostAsset),
      technicalDetail: `Detected from Windows event logs${hosts.length ? " on " + hosts.join(", ") : ""}${x.count > 1 ? ` (${x.count} events${when ? ", " + when : ""})` : (when ? ` (${when})` : "")}.${x.sample ? "\nSample: " + x.sample : ""}` };
  });
  return { timeline, iocs, findings };
}

// ---------- SKYHAWK collection-agent profile (read-only host triage) ----------
const agent = {
  id: "agent",
  label: "SKYHAWK collection agent",
  detect(text, filename, csv, json) {
    return !!(json && json.length && json[0] && json[0].skyhawkAgent);
  },
  normalize(text, filename, csv, json) {
    const doc = (json && json[0]) || {};
    const host = doc.host || "host";
    const timeline = [], iocs = [], seen = new Set();
    const arr = (x) => Array.isArray(x) ? x : (x ? [x] : []); // PowerShell collapses 1-element arrays
    // logon events -> timeline
    arr(doc.logons).forEach((l) => {
      const at = toIso(l.time);
      const kind = l.eventId === 4625 || l.eventId === "4625" ? "Failed logon" : "Logon";
      const text = `${kind}${l.logonType ? " type " + l.logonType : ""}${l.user ? " — " + l.user : ""}${l.srcIp ? " from " + l.srcIp : ""} on ${l.computer || host}`;
      timeline.push({ at: at || new Date().toISOString(), text: text.slice(0, 500), source: "agent:" + host });
      extractIocs(l.srcIp || "", iocs, seen);
    });
    // outbound network connections -> IOCs + a few timeline notes
    arr(doc.connections).forEach((c) => {
      if (c.remoteAddr) extractIocs(c.remoteAddr, iocs, seen);
    });
    // host connections -> lake events (so they show in the SIEM tab + network map)
    const events = [];
    arr(doc.connections).forEach((c) => {
      if (!c.remoteAddr) return;
      events.push(mkEvent("agent", "netconn", { ts: doc.collectedAt, host, saddr: "", daddr: c.remoteAddr, dport: c.remotePort, proto: c.proto || "tcp",
        msg: `${host} -> ${c.remoteAddr}:${c.remotePort || ""} (${c.process || c.pid || ""})`, raw: c }));
    });
    // exported Windows event logs -> offline detections (Chainsaw-free) + lake events
    const findings = [];
    if (doc.events && doc.events.length) {
      const evs = arr(doc.events);
      const w = processWinEvents(evs, host);
      w.timeline.forEach((t) => timeline.push(t));
      w.iocs.forEach((x) => { const k = x.type + ":" + x.value.toLowerCase(); if (!seen.has(k)) { seen.add(k); iocs.push(x); } });
      w.findings.forEach((f) => findings.push(f));
      evs.forEach((ev) => {
        const d = ev.data || {};
        events.push(mkEvent("eventlog", String(ev.channel || "").replace(/^.*[\\/]/, "") + "/" + ev.id, { ts: ev.time, host: ev.computer || host,
          saddr: d.IpAddress || d.SourceIp || "", daddr: d.DestinationIp || "", dport: d.DestinationPort || "",
          msg: [ev.channel && String(ev.channel).replace(/^.*[\\/]/, ""), "EID " + ev.id, d.TargetUserName || d.SubjectUserName || "", d.CommandLine || d.ScriptBlockText || d.ServiceName || ""].filter(Boolean).join(" · ").slice(0, 300),
          fields: d, raw: ev }));
      });
    }
    return { timeline, iocs, findings, events };
  },
};

// ---------- Suricata IDS (eve.json) profile ----------
// Network-layer detections to sit beside the host event-log ones. Consumes
// Suricata's eve.json (NDJSON); alert records become findings, every alert
// contributes a timeline entry and IOCs from its network + app-layer fields.
const suricata = {
  id: "suricata",
  label: "Suricata IDS (eve.json)",
  detect(text, filename, csv, json) {
    if (json && json.some((d) => d && d.event_type && (d.alert || d.flow_id || d.src_ip))) return true;
    return /eve\.json|suricata/i.test(filename || "");
  },
  normalize(text, filename, csv, json) {
    const rows = json || [];
    const SEV = { 1: "high", 2: "medium", 3: "low", 4: "low" };
    const timeline = [], iocs = [], seen = new Set(), g = {}, events = [];
    for (const e of rows) {
      if (!e || typeof e !== "object" || !e.event_type) continue;
      const at = toIso(e.timestamp);
      const et = e.event_type;
      let msg = et, attack = [];
      if (et === "alert" && e.alert) {
        const a = e.alert;
        msg = a.signature || "alert";
        attack = [...new Set(((a.metadata && (a.metadata.mitre_technique_id || a.metadata.mitre_technique_ids)) || []).map((x) => String(x).toUpperCase()).filter((x) => /^T\d{4}(\.\d{3})?$/.test(x)))];
        const sev = SEV[a.severity] || "medium";
        extractIocs([e.src_ip, e.dest_ip, e.dns && e.dns.rrname, e.http && e.http.hostname, e.tls && e.tls.sni,
          e.fileinfo && [e.fileinfo.md5, e.fileinfo.sha1, e.fileinfo.sha256].filter(Boolean).join(" ")].filter(Boolean).join(" "), iocs, seen);
        const flow = `${e.src_ip || "?"}:${e.src_port || ""} -> ${e.dest_ip || "?"}:${e.dest_port || ""} ${e.proto || ""}${e.app_proto ? "/" + e.app_proto : ""}`.trim();
        timeline.push({ at: at || new Date().toISOString(), text: `${msg} — ${flow}`.slice(0, 500), source: "suricata" });
        const it = g[msg] || (g[msg] = { sig: msg, sev: "", attack: new Set(), hosts: new Set(), count: 0, cat: a.category || "", sample: flow, first: null, last: null });
        it.count++;
        if ((LEVEL_RANK[sev] || 0) > (LEVEL_RANK[it.sev] || -1)) it.sev = sev;
        attack.forEach((t) => it.attack.add(t));
        [e.src_ip, e.dest_ip].forEach((ip) => { if (ip) it.hosts.add(ip); });
        if (at) { if (!it.first || at < it.first) it.first = at; if (!it.last || at > it.last) it.last = at; }
      } else if (et === "dns" && e.dns) { msg = `DNS ${e.dns.rrtype || ""} ${e.dns.rrname || ""}`.trim(); }
      else if (et === "http" && e.http) { msg = `HTTP ${e.http.http_method || ""} ${e.http.hostname || ""}${e.http.url || ""}`.trim(); }
      else if (et === "tls" && e.tls) { msg = `TLS ${e.tls.sni || e.tls.subject || ""}`.trim(); }
      else if (et === "fileinfo" && e.fileinfo) { msg = `file ${e.fileinfo.filename || ""}`.trim(); }
      else if (et === "flow") { msg = `flow ${e.proto || ""}`.trim(); }
      // every eve record (alert or not) lands in the lake
      events.push(mkEvent("suricata", et, { ts: at, saddr: e.src_ip, sport: e.src_port, daddr: e.dest_ip, dport: e.dest_port, proto: e.proto, msg, attack, raw: e,
        fields: { app_proto: e.app_proto, sni: e.tls && e.tls.sni, host: e.http && e.http.hostname, dns: e.dns && e.dns.rrname } }));
    }
    const findings = Object.values(g).map((x) => {
      const hosts = [...x.hosts], when = x.first ? (x.first === x.last ? x.first : x.first + " -> " + x.last) : "";
      return { title: x.sig.slice(0, 200), severity: x.sev || "medium", attack: [...x.attack],
        assets: hosts.map((ip) => ({ type: PRIVATE_IP.test(ip) ? "server" : "external host", name: ip, ip })),
        technicalDetail: `Suricata network alert${x.cat ? " (" + x.cat + ")" : ""}: ${x.count} hit${x.count > 1 ? "s" : ""}${when ? " (" + when + ")" : ""}.${x.sample ? "\nFlow: " + x.sample : ""}`, _n: x.count };
    }).sort((a, b) => (LEVEL_RANK[b.severity] || 0) - (LEVEL_RANK[a.severity] || 0) || b._n - a._n)
      .map((f) => { delete f._n; return f; });
    return { timeline, iocs, findings, events };
  },
};

// ---------- Zeek profile (TSV logs with a #fields header, or JSON lines) ----------
const zeek = {
  id: "zeek",
  label: "Zeek network logs",
  detect(text, filename, csv, json) {
    if (/#fields|#separator|#path\b/.test(text || "")) return true;
    if (json && json.some((d) => d && (d["id.orig_h"] || d._path || (d.id && d.id.orig_h)))) return true;
    return /\bzeek\b|conn\.log|dns\.log|http\.log|ssl\.log|notice\.log/i.test(filename || "");
  },
  normalize(text, filename, csv, json) {
    const recs = [];
    let path = (filename || "").replace(/^.*[\\/]/, "").replace(/\.log(\.gz)?$/i, "") || "zeek";
    if (/#fields/.test(text || "")) {
      // Zeek TSV: header lines start with '#', data rows are tab-separated
      let fields = null; const lines = (text || "").split(/\r?\n/);
      for (const line of lines) {
        if (!line) continue;
        if (line[0] === "#") { const m = /^#fields\t(.+)$/.exec(line); if (m) fields = m[1].split("\t"); const p = /^#path\t(.+)$/.exec(line); if (p) path = p[1].trim(); continue; }
        if (!fields) continue;
        const cols = line.split("\t"); const o = {}; fields.forEach((f, i) => { o[f] = cols[i]; });
        recs.push(o);
      }
    } else if (json && json.length) {
      json.forEach((d) => { if (d && typeof d === "object") { if (d._path) path = d._path; recs.push(d); } });
    }
    const G = (o, k) => { const v = o[k] != null ? o[k] : (o.id && o.id[k.replace("id.", "")]); return v == null || v === "-" ? "" : String(v); };
    const timeline = [], iocs = [], seen = new Set(), events = [], notices = {};
    for (const o of recs) {
      const at = o.ts ? toIso(new Date(Number(o.ts) * 1000).toISOString()) || toIso(o.ts) : null;
      const saddr = G(o, "id.orig_h"), daddr = G(o, "id.resp_h"), sport = G(o, "id.orig_p"), dport = G(o, "id.resp_p");
      const proto = G(o, "proto");
      let msg = path, attack = [];
      if (path === "dns") { msg = `DNS ${G(o, "qtype_name") || ""} ${G(o, "query")}`.trim(); extractIocs(G(o, "query"), iocs, seen); }
      else if (path === "http") { msg = `HTTP ${G(o, "method")} ${G(o, "host")}${G(o, "uri")}`.trim(); extractIocs(G(o, "host") + " " + G(o, "uri"), iocs, seen); }
      else if (path === "ssl") { msg = `TLS ${G(o, "server_name")}`.trim(); extractIocs(G(o, "server_name"), iocs, seen); }
      else if (path === "conn") { msg = `conn ${proto} ${saddr}:${sport} -> ${daddr}:${dport} (${G(o, "service") || "?"})`.trim(); }
      else if (path === "files") { const h = G(o, "sha256") || G(o, "md5"); if (h) extractIocs(h, iocs, seen); msg = `file ${G(o, "mime_type") || ""}`.trim(); }
      else if (path === "notice") {
        const note = G(o, "note") || "Zeek notice", smsg = G(o, "msg"); msg = `NOTICE ${note}: ${smsg}`.trim();
        const it = notices[note] || (notices[note] = { note, hosts: new Set(), count: 0, sample: smsg || "", first: null, last: null });
        it.count++; if (saddr) it.hosts.add(saddr); if (daddr) it.hosts.add(daddr);
        if (at) { if (!it.first || at < it.first) it.first = at; if (!it.last || at > it.last) it.last = at; }
        timeline.push({ at: at || new Date().toISOString(), text: msg.slice(0, 500), source: "zeek" });
      }
      if (daddr) extractIocs(daddr, iocs, seen);
      events.push(mkEvent("zeek", path, { ts: at, saddr, sport, daddr, dport, proto, msg, attack, raw: o,
        fields: { uid: o.uid, service: G(o, "service"), query: G(o, "query"), host: G(o, "host"), server_name: G(o, "server_name") } }));
    }
    const findings = Object.values(notices).map((x) => {
      const hosts = [...x.hosts], when = x.first ? (x.first === x.last ? x.first : x.first + " -> " + x.last) : "";
      return { title: ("Zeek notice: " + x.note).slice(0, 200), severity: "medium", attack: [],
        assets: hosts.map((ip) => ({ type: PRIVATE_IP.test(ip) ? "server" : "external host", name: ip, ip })),
        technicalDetail: `Zeek raised ${x.count} "${x.note}" notice${x.count > 1 ? "s" : ""}${when ? " (" + when + ")" : ""}.${x.sample ? "\n" + x.sample : ""}` };
    });
    return { timeline, iocs, findings, events };
  },
};

// ---------- PCAP profile (classic libpcap -> flow events, pure Node) ----------
const pcap = {
  id: "pcap",
  label: "PCAP capture (flows)",
  detect(text, filename) { return /\.pcap$|\.pcapng$|\.cap$/i.test(filename || ""); },
  normalize(text, filename) {
    let buf; try { buf = Buffer.from(text, "base64"); } catch { return { error: "could not read PCAP bytes", timeline: [], iocs: [], findings: [], events: [] }; }
    if (buf.length < 24) return { error: "not a PCAP file", timeline: [], iocs: [], findings: [], events: [] };
    // endianness + timestamp precision from the magic
    let le, nano; const m = buf.readUInt32LE(0);
    if (m === 0xa1b2c3d4) { le = true; nano = false; } else if (m === 0xa1b23c4d) { le = true; nano = true; }
    else if (m === 0xd4c3b2a1) { le = false; nano = false; } else if (m === 0x4d3cb2a1) { le = false; nano = true; }
    else return { error: "unsupported capture (pcapng isn't parsed yet — export as classic pcap)", timeline: [], iocs: [], findings: [], events: [] };
    const u32 = (off) => le ? buf.readUInt32LE(off) : buf.readUInt32BE(off);
    const u16 = (off) => le ? buf.readUInt16LE(off) : buf.readUInt16BE(off);
    const linktype = u32(20);
    const ip4 = (o) => `${buf[o]}.${buf[o + 1]}.${buf[o + 2]}.${buf[o + 3]}`;
    const flows = {}; const seen = new Set(), iocs = []; let off = 24, n = 0;
    while (off + 16 <= buf.length && n < 300000) {
      const tsec = u32(off), tsub = u32(off + 4), incl = u32(off + 8); off += 16;
      if (incl <= 0 || off + incl > buf.length) break;
      const ts = new Date(tsec * 1000 + (nano ? tsub / 1e6 : tsub / 1e3)).toISOString();
      let p = off; // start of link-layer
      let l3 = -1;
      if (linktype === 1) { const et = (buf[p + 12] << 8) | buf[p + 13]; if (et === 0x0800) l3 = p + 14; else if (et === 0x8100 && ((buf[p + 16] << 8) | buf[p + 17]) === 0x0800) l3 = p + 18; }
      else if (linktype === 101) { l3 = p; }
      else if (linktype === 113) { if (((buf[p + 14] << 8) | buf[p + 15]) === 0x0800) l3 = p + 16; }
      off += incl; n++;
      if (l3 < 0 || l3 + 20 > buf.length || (buf[l3] >> 4) !== 4) continue;
      const ihl = (buf[l3] & 0x0f) * 4; const proto = buf[l3 + 9];
      const saddr = ip4(l3 + 12), daddr = ip4(l3 + 16); const l4 = l3 + ihl;
      let sport = "", dport = "", pname = proto === 6 ? "tcp" : proto === 17 ? "udp" : proto === 1 ? "icmp" : String(proto);
      if ((proto === 6 || proto === 17) && l4 + 4 <= buf.length) { sport = ((buf[l4] << 8) | buf[l4 + 1]); dport = ((buf[l4 + 2] << 8) | buf[l4 + 3]); }
      const key = `${saddr}|${sport}|${daddr}|${dport}|${pname}`;
      const fl = flows[key] || (flows[key] = { saddr, daddr, sport, dport, proto: pname, first: ts, last: ts, pkts: 0, bytes: 0 });
      fl.pkts++; fl.bytes += incl; fl.last = ts;
    }
    const flist = Object.values(flows);
    flist.forEach((f) => { if (f.daddr) extractIocs(f.daddr, iocs, seen); if (f.saddr) extractIocs(f.saddr, iocs, seen); });
    const events = flist.map((f) => mkEvent("pcap", "flow", { ts: f.first, saddr: f.saddr, sport: f.sport, daddr: f.daddr, dport: f.dport, proto: f.proto,
      msg: `${f.proto} ${f.saddr}:${f.sport} -> ${f.daddr}:${f.dport} (${f.pkts} pkts, ${f.bytes} B)`, fields: { packets: f.pkts, bytes: f.bytes, last: f.last }, raw: null }));
    return { timeline: [], iocs, findings: [], events, stats: { packets: n, flows: flist.length } };
  },
};

// ---------- registry / public API ----------
const PROFILES = [chainsaw, suricata, zeek, pcap, agent];
function profileList() { return PROFILES.map((p) => ({ id: p.id, label: p.label })); }
exports.mapFromEvents = mapFromEvents;

function readAll(text, filename) {
  const f = (filename || "").toLowerCase();
  let csv = null, json = null;
  if (f.endsWith(".csv") || f.endsWith(".tsv")) csv = parseCsv(text);
  else if (f.endsWith(".json") || f.endsWith(".jsonl") || f.endsWith(".ndjson")) json = parseJsonish(text);
  else { // sniff
    const t = text.trim();
    if (t[0] === "[" || t[0] === "{") json = parseJsonish(text);
    else if (t.indexOf(",") >= 0 && t.indexOf("\n") >= 0) csv = parseCsv(text);
    else json = parseJsonish(text);
  }
  return { csv, json };
}

function detect(text, filename) {
  const { csv, json } = readAll(text, filename);
  for (const p of PROFILES) { try { if (p.detect(text, filename, csv, json)) return p.id; } catch {} }
  return null;
}

/** Parse a text blob with a chosen (or auto-detected) profile → normalised items. */
function parse(text, filename, profileId) {
  const { csv, json } = readAll(text, filename);
  let prof = PROFILES.find((p) => p.id === profileId);
  if (!prof) prof = PROFILES.find((p) => { try { return p.detect(text, filename, csv, json); } catch { return false; } });
  if (!prof) return { profile: null, error: "No matching ingest profile. Supported: " + PROFILES.map((p) => p.label).join(", "), timeline: [], iocs: [], findings: [] };
  const out = prof.normalize(text, filename, csv, json);
  return { profile: prof.id, profileLabel: prof.label, ...out, stats: { timeline: (out.timeline || []).length, iocs: (out.iocs || []).length, findings: (out.findings || []).length, events: (out.events || []).length } };
}

/** Flag which proposed items are new vs already present, given the existing case data. */
function dedupe(parsed, existing) {
  existing = existing || {};
  const tlSeen = new Set((existing.timeline || []).map((e) => (e.at || "").slice(0, 16) + "|" + (e.text || "").toLowerCase()));
  const iocSeen = new Set((existing.iocs || []).map((x) => String(x.value || "").toLowerCase()));
  const fSeen = new Set((existing.findings || []).map((f) => String(f.title || "").toLowerCase()));
  const timeline = parsed.timeline.map((e) => ({ ...e, dup: tlSeen.has((e.at || "").slice(0, 16) + "|" + (e.text || "").toLowerCase()) }));
  const iocs = parsed.iocs.map((x) => ({ ...x, dup: iocSeen.has(String(x.value).toLowerCase()) }));
  const findings = parsed.findings.map((f) => ({ ...f, dup: fSeen.has(String(f.title).toLowerCase()) }));
  return { ...parsed, timeline, iocs, findings,
    newCounts: { timeline: timeline.filter((x) => !x.dup).length, iocs: iocs.filter((x) => !x.dup).length, findings: findings.filter((x) => !x.dup).length } };
}
