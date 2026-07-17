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
    // process command lines -> IOC scan
    arr(doc.processes).forEach((p) => { extractIocs([p.cmdline, p.path].join(" "), iocs, seen); });
    return { timeline, iocs, findings: [] };
  },
};

// ---------- registry / public API ----------
const PROFILES = [chainsaw, agent];
function profileList() { return PROFILES.map((p) => ({ id: p.id, label: p.label })); }

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
  return { profile: prof.id, profileLabel: prof.label, ...out, stats: { timeline: out.timeline.length, iocs: out.iocs.length, findings: out.findings.length } };
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
