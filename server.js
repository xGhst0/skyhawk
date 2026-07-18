// Skyhawk — air-gapped investigation-to-report platform (runnable build).
// Roles (Analyst/Tech Lead/Manager) · findings with full evidence + network map · live
// technical & frozen formal reports · persisted tamper-evident audit ·
// Store seam (file|postgres) · logging. No internet. Run: node server.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const os = require("os");
const log = require("./logger.js");
const { makeStore } = require("./store.js");
const { Finding, User, Role, TechnicalPolicy, FormalPolicy, Report, AuditLog, OfflineDraftAssist } = require("./domain/index.js");
const pages = require("./pages.js");
const attack = require("./attack.js");
const remediation = require("./domain/remediation.js");
const ingest = require("./domain/ingest.js");

const PORT = process.env.PORT || 8462;
const useTLS = !!(process.env.TLS_CERT && process.env.TLS_KEY);
// Collection-agent enrollment secret. Operators SHOULD set SKYHAWK_ENROLL_TOKEN;
// otherwise a random one is generated per boot and printed to the log.
const AGENT_ENROLL = process.env.SKYHAWK_ENROLL_TOKEN || crypto.randomBytes(12).toString("hex");
const COLLECTORS = ["triage", "eventlog", "chainsaw"];
// Reachable (non-loopback) IPv4 addresses, so the Agents tab can hand out a
// deploy one-liner that a *remote* target host can actually curl back to.
function lanHosts() {
  const out = [], ifs = os.networkInterfaces();
  for (const name in ifs) for (const a of ifs[name] || []) if (a.family === "IPv4" && !a.internal) out.push(a.address);
  return out;
}
const AGENT_FILES = { "/agent/skyhawk-agent.ps1": "skyhawk-agent.ps1", "/agent/skyhawk-agent.sh": "skyhawk-agent.sh" };
const store = makeStore(log);
const assist = new OfflineDraftAssist();
const EVID = path.join(__dirname, "evidence");
try { fs.mkdirSync(EVID, { recursive: true }); } catch {}

const DEVICE_TYPES = ["workstation", "server", "domain controller", "firewall", "router", "switch", "load balancer", "database", "mail server", "VPN gateway", "cloud / SaaS", "IoT / OT", "external host"];
const INV_STATUSES = ["open", "contained", "eradicated", "recovered", "closed"];
const SEVERITIES = ["critical", "high", "medium", "low"];
const mkId = (p) => p + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------- roles / permissions ----------
const TITLES = { "Analyst": "Analyst", "Tech Lead": "Tech Lead", "Manager": "Manager" };
const LEGACY_TITLES = { NCM: "Analyst", HCM: "Analyst", TC: "Tech Lead", MC: "Manager" };
const CAP = {
  "Analyst": ["finding.create", "finding.editOwn"],
  "Tech Lead": ["finding.create", "finding.editOwn", "finding.editAny", "finding.curate", "tech.control"],
  "Manager": ["finding.create", "finding.editOwn", "finding.editAny", "finding.curate", "tech.control", "formal.finalize", "user.manage"],
};
const canonTitle = (raw) => {
  const t = String(raw || "").trim();
  return Object.keys(TITLES).find((k) => k.toLowerCase() === t.toLowerCase()) || LEGACY_TITLES[t.toUpperCase()] || null;
};
const can = (title, cap) => (CAP[title] || []).includes(cap);
const capsFor = (title) => CAP[title] || [];

// ---------- users (persisted; login picks one) ----------
let USERS = new Map();
async function loadUsers() {
  const arr = await store.all("users");
  if (!arr.length) {
    const seed = [ { id: "U-MC", name: "Morgan", title: "Manager" }, { id: "U-TC", name: "Chen", title: "Tech Lead" }, { id: "U-NCM", name: "Rivera", title: "Analyst" }, { id: "U-HCM", name: "Patel", title: "Analyst" } ];
    for (const s0 of seed) { const pw = hashPw("skyhawk"); const u = { ...s0, prefs: { theme: "monolith", mark: "strike" }, salt: pw.salt, hash: pw.hash }; await store.put("users", u); USERS.set(u.id, u); }
  } else for (const u of arr) {
    // migrate pre-rename titles (NCM/HCM -> Analyst, TC -> Tech Lead, MC -> Manager)
    if (LEGACY_TITLES[u.title]) { u.title = LEGACY_TITLES[u.title]; await store.put("users", u); log.info("user.title.migrated", { id: u.id, title: u.title }); }
    USERS.set(u.id, u);
  }
}
async function createUser(b) {
  const name = (b.name || "").trim(); const title = canonTitle(b.title);
  if (!name) throw new Error("name required");
  if (!title) throw new Error("title must be Analyst, Tech Lead or Manager");
  const existing = [...USERS.values()].find((u) => u.name.toLowerCase() === name.toLowerCase() && u.title === title);
  if (existing) return existing;
  const pw = hashPw(b.password || "skyhawk"); const u = { id: "U-" + Date.now().toString(36), name, title, prefs: { theme: "monolith", mark: "strike" }, salt: pw.salt, hash: pw.hash };
  await store.put("users", u); USERS.set(u.id, u); log.info("user.created", { id: u.id, title });
  return u;
}
const userById = (id) => USERS.get(id) || { id, name: id, title: "Analyst" };
const userName = (id) => userById(id).name;
function requireCap(actorId, cap) {
  const u = userById(actorId); if (!can(u.title, cap)) { const e = new Error("permission denied: " + u.title + " lacks " + cap); e.code = 403; throw e; }
  return u;
}

// ---------- audit (persisted per investigation) ----------
async function auditFor(invId) { const rec = await store.get("audit", invId); const l = new AuditLog(); if (rec && rec.events) l.load(rec.events); return l; }
async function auditRecord(invId, actor, action, target, data) { const l = await auditFor(invId); l.record(actor, action, target, data); await store.put("audit", { id: invId, events: l.all() }); }

// ---------- findings ----------
const domainLead = new User("system", "system", Role.Lead);
const hydrate = (r) => { const f = new Finding(r.id, r.investigationId, r.title, r.technicalDetail, r.severity, r.authorId, r.attack || []); f.state = r.state; f.inFormal = r.inFormal; f.formalSummary = r.formalSummary || ""; f.createdAt = r.createdAt; return f; };
const dehydrate = (f) => ({ id: f.id, investigationId: f.investigationId, title: f.title, technicalDetail: f.technicalDetail, severity: f.severity, authorId: f.authorId, attack: f.attackTechniques, state: f.state, inFormal: f.inFormal, formalSummary: f.formalSummary, createdAt: f.createdAt });

function saveShot(fid, i, dataUrl, caption) {
  const m = /^data:(image\/(png|jpe?g|gif|webp));base64,(.+)$/.exec(dataUrl || ""); if (!m) return null;
  const ext = m[2] === "jpeg" ? "jpg" : m[2]; const file = fid + "-" + Date.now().toString(36) + i + "." + ext;
  const buf = Buffer.from(m[3], "base64");
  try { fs.writeFileSync(path.join(EVID, file), buf); } catch { return null; }
  return { id: file, caption: (caption || "").slice(0, 200), file, url: "/evidence/" + file, sha256: crypto.createHash("sha256").update(buf).digest("hex") };
}
function collectEvidence(b) {
  const screenshots = (b.screenshots || []).map((sc, i) => saveShot(b._fid, i, sc.dataUrl, sc.caption)).filter(Boolean);
  const assets = (b.assets || []).filter((a) => a && a.name).map((a) => ({ type: a.type || "host", name: String(a.name).slice(0, 80), ip: a.ip ? String(a.ip).slice(0, 60) : "" }));
  const queries = (b.queries || []).filter((qy) => qy && qy.text).map((qy) => ({ lang: (qy.lang || "query").slice(0, 20), text: String(qy.text).slice(0, 4000) }));
  const tools = (b.tools || []).map((t) => String(t).slice(0, 60)).filter(Boolean);
  return { screenshots, assets, queries, tools };
}

async function addFinding(b) {
  const actor = requireCap(b.actorId, "finding.create");
  await getInv(b.investigationId);
  const f = new Finding("F-" + Date.now().toString(36), b.investigationId, (b.title || "").trim(), b.technicalDetail || "", b.severity || "medium", actor.id, (b.attack || "").split(",").map((s) => s.trim()).filter(Boolean));
  if (!f.title) throw new Error("title required");
  f.createdAt = new Date().toISOString(); f.submit(new User(actor.id, actor.name, Role.Analyst));
  b._fid = f.id; const ev = collectEvidence(b);
  const rec = { ...dehydrate(f), ...ev };
  await store.put("findings", rec); await auditRecord(b.investigationId, actor.id, "finding.created", f.id, { title: f.title });
  log.info("finding.created", { id: f.id, inv: b.investigationId, by: actor.id }); return rec;
}
async function editFinding(id, b) {
  const rec = await store.get("findings", id); if (!rec) throw new Error("finding not found");
  const actor = userById(b.actorId);
  if (rec.authorId === actor.id) requireCap(actor.id, "finding.editOwn"); else requireCap(actor.id, "finding.editAny");
  if (b.title !== undefined) rec.title = String(b.title).slice(0, 200);
  if (b.technicalDetail !== undefined) rec.technicalDetail = b.technicalDetail;
  if (b.severity !== undefined) rec.severity = b.severity;
  if (b.attack !== undefined) rec.attack = String(b.attack).split(",").map((s) => s.trim()).filter(Boolean);
  await store.put("findings", rec); await auditRecord(rec.investigationId, actor.id, "finding.edited", id, {});
  log.info("finding.edited", { id, by: actor.id }); return rec;
}
async function addEvidence(id, b) {
  const rec = await store.get("findings", id); if (!rec) throw new Error("finding not found");
  const actor = userById(b.actorId);
  if (rec.authorId === actor.id) requireCap(actor.id, "finding.editOwn"); else requireCap(actor.id, "finding.editAny");
  b._fid = id; const ev = collectEvidence(b);
  rec.screenshots = (rec.screenshots || []).concat(ev.screenshots);
  rec.assets = (rec.assets || []).concat(ev.assets);
  rec.queries = (rec.queries || []).concat(ev.queries);
  rec.tools = (rec.tools || []).concat(ev.tools);
  await store.put("findings", rec); await auditRecord(rec.investigationId, actor.id, "finding.evidence", id, { shots: ev.screenshots.length, assets: ev.assets.length });
  log.info("finding.evidence", { id, by: actor.id }); return rec;
}
async function curate(id, b, mutate, action) {
  const actor = requireCap(b.actorId, "finding.curate");
  const rec = await store.get("findings", id); if (!rec) throw new Error("finding not found");
  const f = hydrate(rec); mutate(f);
  await store.put("findings", { ...rec, ...dehydrate(f) });
  await auditRecord(f.investigationId, actor.id, action, id, { state: f.state, inFormal: f.inFormal });
  log.info(action, { id, by: actor.id, state: f.state }); return f;
}

// ---------- investigations ----------
async function listInv() { return store.all("investigations"); }
async function getInv(id) { const i = await store.get("investigations", id); if (!i) throw new Error("investigation not found"); return i; }
async function createInv(b) {
  requireCap(b.actorId, "finding.create");
  const title = (b.title || "").trim(); if (!title) throw new Error("title required");
  const id = (b.id || "INC-" + Date.now().toString(36)).toUpperCase();
  const rec = { id, title, status: "open", severity: SEVERITIES.includes(b.severity) ? b.severity : "medium", assigneeId: b.actorId || null, createdAt: new Date().toISOString(), execSummary: "", scope: "", remediation: "", formalFrozen: null };
  await store.put("investigations", rec); await auditRecord(id, b.actorId, "investigation.created", id, { title });
  log.info("investigation.created", { id }); return rec;
}
async function updateInv(invId, b) {
  const actor = requireCap(b.actorId, "tech.control");
  const inv = await getInv(invId);
  if (b.status !== undefined) { if (!INV_STATUSES.includes(b.status)) throw new Error("status must be one of: " + INV_STATUSES.join(", ")); inv.status = b.status; }
  if (b.severity !== undefined) { if (!SEVERITIES.includes(b.severity)) throw new Error("severity must be one of: " + SEVERITIES.join(", ")); inv.severity = b.severity; }
  if (b.assigneeId !== undefined) { if (b.assigneeId && !USERS.get(b.assigneeId)) throw new Error("unknown assignee"); inv.assigneeId = b.assigneeId || null; }
  if (b.execSummary !== undefined) inv.execSummary = String(b.execSummary).slice(0, 8000);
  if (b.scope !== undefined) inv.scope = String(b.scope).slice(0, 8000);
  if (b.remediation !== undefined) inv.remediation = String(b.remediation).slice(0, 8000);
  await store.put("investigations", inv);
  await auditRecord(invId, actor.id, "investigation.updated", invId, { status: inv.status, severity: inv.severity, assigneeId: inv.assigneeId });
  log.info("investigation.updated", { id: invId, status: inv.status }); return inv;
}
async function recordsFor(invId) { return (await store.all("findings")).filter((r) => r.investigationId === invId); }

// ---------- per-investigation sub-collections (timeline / iocs / tasks) ----------
async function subDoc(coll, invId) { const r = await store.get(coll, invId); return r && Array.isArray(r.items) ? r.items : []; }
async function subSave(coll, invId, items) { await store.put(coll, { id: invId, items }); return items; }

// ---------- evidence ingestion (offline; writes selected parsed items) ----------
// Shared writer used by both the manual Ingest tab and the collection agent.
async function writeIngested(invId, actorId, actorName, sel, src) {
  const res = { timeline: 0, iocs: 0, findings: 0 };
  if (Array.isArray(sel.timeline) && sel.timeline.length) {
    const items = await subDoc("timeline", invId);
    for (const e of sel.timeline) {
      const text = (e.text || "").toString().trim().slice(0, 500); if (!text) continue;
      const at = e.at && !isNaN(Date.parse(e.at)) ? new Date(e.at).toISOString() : new Date().toISOString();
      items.push({ id: mkId("T"), at, text, source: (e.source || src).toString().slice(0, 40), findingId: null, by: actorId });
      res.timeline++;
    }
    items.sort((x, y) => (x.at < y.at ? -1 : 1));
    await subSave("timeline", invId, items);
  }
  if (Array.isArray(sel.iocs) && sel.iocs.length) {
    const items = await subDoc("iocs", invId);
    const seen = new Set(items.map((x) => x.value.toLowerCase()));
    for (const x of sel.iocs) {
      const value = (x.value || "").toString().trim().slice(0, 300);
      if (!value || seen.has(value.toLowerCase())) continue;
      seen.add(value.toLowerCase());
      items.push({ id: mkId("I"), type: IOC_TYPES.includes(x.type) ? x.type : iocType(value), value, note: (x.note || "ingested via " + src).slice(0, 200), by: actorId, at: new Date().toISOString() });
      res.iocs++;
    }
    await subSave("iocs", invId, items);
  }
  for (const f of (sel.findings || [])) {
    const title = (f.title || "").toString().trim(); if (!title) continue;
    const fd = new Finding(mkId("F"), invId, title.slice(0, 200), (f.technicalDetail || "").toString(), SEVERITIES.includes(f.severity) ? f.severity : "medium", actorId, Array.isArray(f.attack) ? f.attack.filter(Boolean) : []);
    fd.createdAt = new Date().toISOString(); fd.submit(new User(actorId, actorName || actorId, Role.Analyst));
    const assets = (f.assets || []).filter((a) => a && a.name).map((a) => ({ type: a.type || "host", name: String(a.name).slice(0, 80), ip: a.ip ? String(a.ip).slice(0, 60) : "" }));
    await store.put("findings", { ...dehydrate(fd), assets, screenshots: [], queries: [], tools: [], ingested: src });
    res.findings++;
  }
  return res;
}
async function ingestCommit(invId, b) {
  const actor = requireCap(b.actorId, "finding.create");
  await getInv(invId);
  const src = (b.source || "ingest").toString().slice(0, 40);
  const res = await writeIngested(invId, actor.id, actor.name, b, src);
  await auditRecord(invId, actor.id, "case.ingested", invId, { source: src, ...res });
  log.info("case.ingested", { inv: invId, source: src, ...res });
  return res;
}

// ---------- collection agents (read-only host triage; authorised IR use) ----------
// The agent authenticates with its own token (not a user session). The server
// can only queue tasks from a FIXED collector catalogue — never arbitrary
// commands — so this is a forensic collector, not a remote-execution channel.
const ctEq = (a, b) => { a = String(a || ""); b = String(b || ""); if (!a.length || a.length !== b.length) return false; try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; } };
async function agentAuth(id, token) { const a = await store.get("agents", id); if (!a || !ctEq(token, a.token)) return null; return a; }
async function agentEnroll(b) {
  if (!ctEq(b.enrollToken, AGENT_ENROLL)) { const e = new Error("invalid enrollment token"); e.code = 403; throw e; }
  const host = (b.host || "unknown-host").toString().slice(0, 80);
  const token = crypto.randomBytes(24).toString("hex");
  let a = (await store.all("agents")).find((x) => x.name.toLowerCase() === host.toLowerCase());
  if (a) { a.token = token; a.os = (b.os || a.os || "").toString().slice(0, 160); a.lastSeen = Date.now(); }
  else a = { id: mkId("AG"), name: host, os: (b.os || "").toString().slice(0, 160), token, enrolledAt: Date.now(), lastSeen: Date.now() };
  await store.put("agents", a);
  log.info("agent.enrolled", { id: a.id, host });
  return { agentId: a.id, agentToken: token, pollSeconds: 15, collectors: COLLECTORS };
}
async function agentPoll(id, token) {
  const a = await agentAuth(id, token); if (!a) { const e = new Error("agent auth failed"); e.code = 403; throw e; }
  a.lastSeen = Date.now(); await store.put("agents", a);
  const tasks = (await store.all("agentTasks")).filter((t) => t.agentId === id && t.status === "pending");
  for (const t of tasks) { t.status = "dispatched"; t.dispatchedAt = Date.now(); await store.put("agentTasks", t); }
  return { tasks: tasks.map((t) => ({ id: t.id, collector: t.collector, invId: t.invId })) };
}
async function agentResults(b) {
  const a = await agentAuth(b.id, b.token); if (!a) { const e = new Error("agent auth failed"); e.code = 403; throw e; }
  const task = b.taskId ? await store.get("agentTasks", b.taskId) : null;
  const invId = (task && task.invId) || b.invId;
  if (!invId) throw new Error("no target case for results");
  await getInv(invId);
  const text = b.text != null ? String(b.text) : JSON.stringify(b.data || {});
  const parsed = ingest.parse(text, b.filename || (a.name + ".json"), b.profile);
  let committed = { timeline: 0, iocs: 0, findings: 0 };
  const authorId = (task && task.createdBy) || ("agent:" + a.id);
  const authorName = (task && task.createdByName) || a.name;
  if (!parsed.error) committed = await writeIngested(invId, authorId, authorName, parsed, "agent:" + a.name);
  if (task) { task.status = "done"; task.completedAt = Date.now(); task.result = committed; task.profile = parsed.profile || null; await store.put("agentTasks", task); }
  a.lastSeen = Date.now();
  a.lastCollection = { at: Date.now(), collector: (task && task.collector) || b.collector || "adhoc", invId, result: committed };
  await store.put("agents", a);
  await auditRecord(invId, "agent:" + a.id, "agent.collected", a.name, { collector: (task && task.collector) || b.collector || "adhoc", profile: parsed.profile || null, ...committed });
  log.info("agent.collected", { agent: a.name, inv: invId, ...committed });
  return { ok: true, profile: parsed.profile || null, error: parsed.error || null, ...committed };
}
async function agentList() {
  const tasks = await store.all("agentTasks");
  return (await store.all("agents")).map((a) => {
    const mine = tasks.filter((t) => t.agentId === a.id);
    const lastTask = mine.filter((t) => t.status === "done").sort((x, y) => (y.completedAt || 0) - (x.completedAt || 0))[0];
    const last = a.lastCollection || (lastTask ? { at: lastTask.completedAt, collector: lastTask.collector, invId: lastTask.invId, result: lastTask.result } : null);
    return { id: a.id, name: a.name, os: a.os, enrolledAt: a.enrolledAt, lastSeen: a.lastSeen,
      online: Date.now() - a.lastSeen < 60000, pending: mine.filter((t) => t.status === "pending" || t.status === "dispatched").length,
      lastCollection: last };
  }).sort((a, b) => b.lastSeen - a.lastSeen);
}
async function agentCollect(agentId, b) {
  const actor = requireCap(b.actorId, "tech.control");
  const a = await store.get("agents", agentId); if (!a) throw new Error("unknown agent");
  const collector = COLLECTORS.includes(b.collector) ? b.collector : "triage";
  if (!b.invId) throw new Error("choose a target case");
  await getInv(b.invId);
  const t = { id: mkId("TK"), agentId, invId: b.invId, collector, status: "pending", createdBy: actor.id, createdByName: actor.name, createdAt: Date.now() };
  await store.put("agentTasks", t);
  await auditRecord(b.invId, actor.id, "agent.tasked", a.name, { collector });
  log.info("agent.tasked", { agent: a.name, collector, inv: b.invId, by: actor.id });
  return { ok: true, taskId: t.id };
}
async function agentRemove(agentId, b) {
  requireCap(b.actorId, "user.manage");
  await store.remove("agents", agentId);
  for (const t of (await store.all("agentTasks")).filter((t) => t.agentId === agentId)) await store.remove("agentTasks", t.id);
  log.info("agent.removed", { id: agentId }); return { ok: true };
}

// ---------- incident timeline ----------
const TL_SOURCES = ["analyst", "EDR", "firewall", "proxy", "DNS", "auth logs", "email", "backup", "netflow", "other"];
async function timelineAdd(invId, b) {
  const actor = requireCap(b.actorId, "finding.create"); await getInv(invId);
  const text = (b.text || "").trim().slice(0, 500); if (!text) throw new Error("event text required");
  const at = b.at && !isNaN(Date.parse(b.at)) ? new Date(b.at).toISOString() : new Date().toISOString();
  const ev = { id: mkId("T"), at, text, source: TL_SOURCES.includes(b.source) ? b.source : "analyst", findingId: b.findingId || null, by: actor.id };
  const items = await subDoc("timeline", invId); items.push(ev); items.sort((x, y) => (x.at < y.at ? -1 : 1));
  await subSave("timeline", invId, items); await auditRecord(invId, actor.id, "timeline.added", ev.id, { at: ev.at });
  log.info("timeline.added", { inv: invId, by: actor.id }); return ev;
}
async function timelineRemove(invId, eid, b) {
  const actor = requireCap(b.actorId, "finding.create");
  await subSave("timeline", invId, (await subDoc("timeline", invId)).filter((e) => e.id !== eid));
  await auditRecord(invId, actor.id, "timeline.removed", eid, {}); return { ok: true };
}

// ---------- IOC tracking (auto-typed, extractable from findings) ----------
const IOC_CLASS = [
  ["sha256", /^[a-f0-9]{64}$/i], ["sha1", /^[a-f0-9]{40}$/i], ["md5", /^[a-f0-9]{32}$/i],
  ["ipv4", /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/],
  ["cve", /^CVE-\d{4}-\d{4,7}$/i],
  ["email", /^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/],
  ["url", /^https?:\/\/\S+$/i],
  ["path", /^(?:[a-zA-Z]:\\|\/[^\s/]|\\\\).*/],
  ["domain", /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i],
];
const IOC_TYPES = [...IOC_CLASS.map(([t]) => t), "other"];
const iocType = (v) => { for (const [t, re] of IOC_CLASS) if (re.test(v)) return t; return "other"; };
const IOC_EXTRACT = [
  ["sha256", /\b[a-f0-9]{64}\b/gi], ["sha1", /\b[a-f0-9]{40}\b/gi], ["md5", /\b[a-f0-9]{32}\b/gi],
  ["ipv4", /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g],
  ["cve", /\bCVE-\d{4}-\d{4,7}\b/gi],
  ["email", /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g],
  ["url", /\bhttps?:\/\/[^\s"'<>)\]]+/gi],
];
async function iocAdd(invId, b) {
  const actor = requireCap(b.actorId, "finding.create"); await getInv(invId);
  const value = (b.value || "").trim().slice(0, 300); if (!value) throw new Error("IOC value required");
  const items = await subDoc("iocs", invId);
  if (items.find((x) => x.value.toLowerCase() === value.toLowerCase())) throw new Error("IOC already tracked");
  const it = { id: mkId("I"), type: IOC_TYPES.includes(b.type) ? b.type : iocType(value), value, note: (b.note || "").slice(0, 200), by: actor.id, at: new Date().toISOString() };
  items.push(it); await subSave("iocs", invId, items);
  await auditRecord(invId, actor.id, "ioc.added", it.id, { type: it.type });
  log.info("ioc.added", { inv: invId, type: it.type }); return it;
}
async function iocRemove(invId, iid, b) {
  const actor = requireCap(b.actorId, "finding.create");
  await subSave("iocs", invId, (await subDoc("iocs", invId)).filter((x) => x.id !== iid));
  await auditRecord(invId, actor.id, "ioc.removed", iid, {}); return { ok: true };
}
async function iocExtract(invId) {
  await getInv(invId);
  const recs = await recordsFor(invId);
  const text = recs.map((r) => [r.title, r.technicalDetail, ...(r.queries || []).map((qy) => qy.text)].join(" ")).join(" ");
  const tracked = new Set((await subDoc("iocs", invId)).map((x) => x.value.toLowerCase()));
  const seen = new Set(); const out = [];
  for (const [type, re] of IOC_EXTRACT) {
    re.lastIndex = 0; let m;
    while ((m = re.exec(text))) {
      const v = m[0]; const k = v.toLowerCase();
      if (seen.has(k) || tracked.has(k)) continue;
      seen.add(k); out.push({ type, value: v });
    }
  }
  return out.slice(0, 60);
}

// ---------- response checklists (PICERL playbooks, fully offline) ----------
const PLAYBOOK_PHASES = ["Identify", "Contain", "Eradicate", "Recover", "Lessons"];
const PLAYBOOKS = {
  generic: [
    ["Identify", "Establish incident timeline and initial scope"],
    ["Identify", "Identify affected systems, accounts and data"],
    ["Identify", "Preserve volatile evidence (memory, logs) before changes"],
    ["Contain", "Isolate affected hosts from the network"],
    ["Contain", "Disable or reset compromised accounts"],
    ["Eradicate", "Remove attacker tooling, persistence and access paths"],
    ["Eradicate", "Patch or mitigate the exploited weakness"],
    ["Recover", "Restore systems from known-good state"],
    ["Recover", "Monitor restored systems for re-compromise"],
    ["Lessons", "Hold post-incident review and record lessons"],
  ],
  ransomware: [
    ["Identify", "Identify ransomware family and ransom note artifacts"],
    ["Identify", "Determine initial access vector"],
    ["Identify", "Map encryption blast radius (hosts, shares, backups)"],
    ["Contain", "Isolate infected segments; block C2 at the perimeter"],
    ["Contain", "Suspend privileged accounts used by the attacker"],
    ["Contain", "Protect and verify offline backups immediately"],
    ["Eradicate", "Rebuild or clean encrypted / compromised hosts"],
    ["Eradicate", "Remove persistence (scheduled tasks, services, run keys)"],
    ["Recover", "Restore data from verified clean backups"],
    ["Recover", "Rotate all credentials incl. service accounts and KRBTGT"],
    ["Lessons", "Report to stakeholders / regulators as required"],
    ["Lessons", "Post-incident review: close the initial access vector"],
  ],
  bec: [
    ["Identify", "Identify compromised mailbox(es) and fraudulent emails"],
    ["Identify", "Review mailbox rules, forwards and OAuth grants"],
    ["Identify", "Determine financial exposure and payment redirection"],
    ["Contain", "Reset credentials and revoke sessions / tokens"],
    ["Contain", "Remove malicious inbox rules and forwards"],
    ["Contain", "Notify finance to freeze pending transfers"],
    ["Eradicate", "Enforce MFA on affected and high-risk accounts"],
    ["Recover", "Notify affected counterparties from a clean channel"],
    ["Lessons", "Update payment verification procedures"],
  ],
  malware: [
    ["Identify", "Collect and hash malware samples"],
    ["Identify", "Identify delivery vector and patient zero"],
    ["Identify", "Sweep environment for the same IOCs"],
    ["Contain", "Quarantine infected hosts; block hashes / domains"],
    ["Eradicate", "Remove malware and persistence from all hosts"],
    ["Recover", "Reimage where cleaning cannot be verified"],
    ["Lessons", "Tune detections for the observed TTPs"],
  ],
};
async function tasksAdd(invId, b) {
  const actor = requireCap(b.actorId, "finding.create"); await getInv(invId);
  const items = await subDoc("tasks", invId);
  if (b.template) {
    const tpl = PLAYBOOKS[b.template]; if (!tpl) throw new Error("unknown playbook: " + b.template);
    let added = 0;
    for (const [phase, text] of tpl) if (!items.find((t) => t.text === text)) { items.push({ id: mkId("K"), phase, text, done: false }); added++; }
    await subSave("tasks", invId, items);
    await auditRecord(invId, actor.id, "tasks.template", b.template, { added });
    log.info("tasks.template", { inv: invId, template: b.template, added }); return { added };
  }
  const text = (b.text || "").trim().slice(0, 200); if (!text) throw new Error("task text required");
  const t = { id: mkId("K"), phase: PLAYBOOK_PHASES.includes(b.phase) ? b.phase : "Identify", text, done: false };
  items.push(t); await subSave("tasks", invId, items);
  await auditRecord(invId, actor.id, "task.added", t.id, {}); return t;
}
async function taskToggle(invId, tid, b) {
  const actor = requireCap(b.actorId, "finding.create");
  const items = await subDoc("tasks", invId); const t = items.find((x) => x.id === tid); if (!t) throw new Error("task not found");
  t.done = !t.done; t.doneBy = t.done ? actor.id : null; t.doneAt = t.done ? new Date().toISOString() : null;
  await subSave("tasks", invId, items);
  await auditRecord(invId, actor.id, t.done ? "task.done" : "task.reopened", tid, {}); return t;
}
async function taskRemove(invId, tid, b) {
  const actor = requireCap(b.actorId, "finding.create");
  await subSave("tasks", invId, (await subDoc("tasks", invId)).filter((x) => x.id !== tid));
  await auditRecord(invId, actor.id, "task.removed", tid, {}); return { ok: true };
}

// ---------- case export / import (air-gap transfer) + full backup ----------
async function exportInv(invId) {
  const inv = await getInv(invId);
  const findings = (await recordsFor(invId)).map((f) => ({
    ...f,
    screenshots: (f.screenshots || []).map((s) => {
      let data = null;
      try { data = fs.readFileSync(path.join(EVID, path.basename(s.file))).toString("base64"); } catch {}
      return { ...s, data };
    }),
  }));
  const auditRec = await store.get("audit", invId);
  return {
    skyhawkBundle: 1, exportedAt: new Date().toISOString(),
    investigation: inv, findings,
    timeline: await subDoc("timeline", invId), iocs: await subDoc("iocs", invId), tasks: await subDoc("tasks", invId),
    audit: auditRec ? auditRec.events : [],
  };
}
async function importInv(b) {
  const actor = requireCap(b.actorId, "user.manage");
  const bun = b.bundle;
  if (!bun || bun.skyhawkBundle !== 1 || !bun.investigation || !bun.investigation.id) throw new Error("not a SKYHAWK case bundle");
  let id = String(bun.investigation.id).toUpperCase();
  if (await store.get("investigations", id)) id = id + "-IMP" + Date.now().toString(36).slice(-4).toUpperCase();
  await store.put("investigations", { ...bun.investigation, id });
  for (const f of bun.findings || []) {
    const fid = mkId("F");
    const shots = (f.screenshots || []).map((s, i) => {
      if (!s.data) return { id: s.id, caption: s.caption, file: s.file, url: s.url, sha256: s.sha256 };
      const ext = (s.file || "x.png").split(".").pop().replace(/[^a-z0-9]/gi, "") || "png";
      const file = fid + "-imp" + i + "." + ext;
      try { fs.writeFileSync(path.join(EVID, file), Buffer.from(s.data, "base64")); } catch { return null; }
      return { id: file, caption: s.caption || "", file, url: "/evidence/" + file, sha256: s.sha256 };
    }).filter(Boolean);
    await store.put("findings", { ...f, id: fid, investigationId: id, screenshots: shots, data: undefined });
  }
  await subSave("timeline", id, bun.timeline || []);
  await subSave("iocs", id, bun.iocs || []);
  await subSave("tasks", id, bun.tasks || []);
  const l = new AuditLog(); l.load(Array.isArray(bun.audit) ? bun.audit : []);
  const chainIntact = l.verify();
  l.record(actor.id, "investigation.imported", id, { from: bun.investigation.id, chainIntact });
  await store.put("audit", { id, events: l.all() });
  log.info("investigation.imported", { id, from: bun.investigation.id, chainIntact });
  return { id, chainIntact };
}
async function backupAll(b) {
  requireCap(b.actorId, "user.manage");
  const colls = ["users", "investigations", "findings", "audit", "timeline", "iocs", "tasks", "messages"];
  const data = {};
  for (const c of colls) data[c] = await store.all(c);
  return { skyhawkBackup: 1, at: new Date().toISOString(), data };
}

// ---------- global search ----------
async function searchAll(qs) {
  const ql = (qs || "").trim().toLowerCase(); if (ql.length < 2) return { cases: [], findings: [], iocs: [] };
  const invs = await listInv();
  const cases = invs.filter((i) => (i.id + " " + i.title).toLowerCase().includes(ql)).slice(0, 20)
    .map((i) => ({ id: i.id, title: i.title, status: i.status, severity: i.severity || "medium" }));
  const finds = (await store.all("findings"))
    .filter((f) => [f.title, f.technicalDetail, (f.attack || []).join(" ")].join(" ").toLowerCase().includes(ql)).slice(0, 20)
    .map((f) => ({ id: f.id, invId: f.investigationId, title: f.title, severity: f.severity, state: f.state }));
  const iocs = [];
  for (const i of invs) for (const it of await subDoc("iocs", i.id)) if (it.value.toLowerCase().includes(ql)) iocs.push({ invId: i.id, type: it.type, value: it.value });
  return { cases, findings: finds, iocs: iocs.slice(0, 20) };
}

async function finalizeFormal(invId, b) {
  requireCap(b.actorId, "formal.finalize");
  const inv = await getInv(invId);
  const findings = (await recordsFor(invId)).map(hydrate);
  const blocks = new Report(invId, new FormalPolicy(), userName).render(findings);
  const version = (inv.formalFrozen ? inv.formalFrozen.version : 0) + 1;
  inv.execSummary = b.execSummary || inv.execSummary; inv.scope = b.scope || inv.scope; inv.remediation = b.remediation || inv.remediation;
  inv.formalFrozen = { version, frozenAt: new Date().toISOString(), frozenBy: userName(b.actorId), blocks, execSummary: inv.execSummary, scope: inv.scope, remediation: inv.remediation };
  await store.put("investigations", inv); await auditRecord(invId, b.actorId, "formal.finalized", invId, { version });
  log.info("formal.finalized", { inv: invId, version }); return inv.formalFrozen;
}

async function stateFor(invId, meId) {
  const inv = await getInv(invId);
  const recs = await recordsFor(invId);
  const view = recs.map((r) => ({ ...r, by: userName(r.authorId), authorId: r.authorId, inTechnical: r.state === "approved", inFormalReport: r.state === "approved" && !!r.inFormal && (r.formalSummary || "").length > 0 }));
  const audit = await auditFor(invId);
  const me = userById(meId);
  return {
    investigation: inv, devices: DEVICE_TYPES, findings: view, technicalCount: view.filter((f) => f.inTechnical).length,
    formalCount: view.filter((f) => f.inFormalReport).length,
    map: inv.map || { nodes: [], edges: [] },
    timeline: await subDoc("timeline", invId), iocs: await subDoc("iocs", invId), tasks: await subDoc("tasks", invId),
    users: [...USERS.values()].map((u) => ({ id: u.id, name: u.name, title: u.title })),
    statuses: INV_STATUSES, severities: SEVERITIES, tlSources: TL_SOURCES, playbooks: Object.keys(PLAYBOOKS), phases: PLAYBOOK_PHASES,
    audit: { intact: audit.verify(), events: audit.all().length },
    me: { id: me.id, name: me.name, title: me.title, caps: capsFor(me.title), prefs: me.prefs || { theme: "monolith", mark: "strike" } },
  };
}
async function reportData(invId) {
  const inv = await getInv(invId);
  const raw = await recordsFor(invId);
  const recs = raw.map((r) => ({ ...r, by: userName(r.authorId), attackTechniques: r.attack || [], inTechnical: r.state === "approved" }));
  const attack = [...new Set(recs.filter((r) => r.inTechnical).flatMap((r) => r.attack || []))];
  const formalLive = new Report(invId, new FormalPolicy(), userName).render(raw.map(hydrate));
  return { inv, findingsRaw: recs, attack, formalLive, timeline: await subDoc("timeline", invId), iocs: await subDoc("iocs", invId) };
}
async function portfolio() {
  const out = [];
  for (const inv of await listInv()) {
    const recs = await recordsFor(inv.id);
    const tasks = await subDoc("tasks", inv.id);
    out.push({
      id: inv.id, title: inv.title, status: inv.status, severity: inv.severity || "medium",
      assignee: inv.assigneeId ? userName(inv.assigneeId) : null, createdAt: inv.createdAt,
      finalized: !!inv.formalFrozen, formalVersion: inv.formalFrozen ? inv.formalFrozen.version : 0,
      findings: recs.length, technical: recs.filter((r) => r.state === "approved").length,
      formal: recs.filter((r) => r.state === "approved" && r.inFormal && (r.formalSummary || "").length > 0).length,
      iocs: (await subDoc("iocs", inv.id)).length,
      tasksDone: tasks.filter((t) => t.done).length, tasksTotal: tasks.length,
    });
  }
  return out;
}

async function seedIfEmpty() {
  if ((await store.all("investigations")).length) return;
  await createInv({ id: "INC-2043", title: "Acme Corp ransomware", actorId: "U-MC" });
  const mk = async (id, title, sev, aid, tk, assets, formal, sum) => {
    const f = new Finding(id, "INC-2043", title, "Technical detail: " + title + ".", sev, aid, tk);
    f.createdAt = new Date().toISOString(); f.submit(new User(aid, "", Role.Analyst)); f.beginReview(domainLead); f.approve(domainLead);
    if (formal) { f.setIncludeInFormal(domainLead, true); f.writeFormalSummary(domainLead, sum); }
    await store.put("findings", { ...dehydrate(f), assets, screenshots: [], queries: [], tools: [] });
  };
  await mk("F-01", "Exploited public-facing vendor portal", "critical", "U-NCM", ["T1190"], [{ type: "server", name: "WEB01 · 10.0.1.20" }, { type: "firewall", name: "FW-EDGE" }], true, "The attacker exploited an unpatched internet-facing application to run commands on the server.");
  await mk("F-03", "LSASS credential dumping", "critical", "U-HCM", ["T1003.001"], [{ type: "server", name: "WEB01 · 10.0.1.20" }, { type: "domain controller", name: "DC01 · 10.0.0.5" }], true, "The attacker harvested passwords from server memory and reused them across the network.");
  await mk("F-06", "Ransomware deployed", "critical", "U-HCM", ["T1486"], [{ type: "domain controller", name: "DC01 · 10.0.0.5" }, { type: "workstation", name: "Workstations ×38" }], true, "The attacker deployed ransomware that encrypted ~2.1 TB across 41 systems.");
  const inv = await getInv("INC-2043"); inv.severity = "critical"; inv.assigneeId = "U-TC"; await store.put("investigations", inv);
  const h = (n) => new Date(Date.now() - n * 3600000).toISOString();
  await subSave("timeline", "INC-2043", [
    { id: "T-seed1", at: h(78), text: "First exploit attempt against vendor portal (WEB01) from 45.155.204.11", source: "firewall", findingId: "F-01", by: "U-NCM" },
    { id: "T-seed2", at: h(77), text: "Webshell dropped on WEB01; interactive commands begin", source: "EDR", findingId: "F-01", by: "U-NCM" },
    { id: "T-seed3", at: h(52), text: "LSASS memory dumped on WEB01 via comsvcs.dll", source: "EDR", findingId: "F-03", by: "U-HCM" },
    { id: "T-seed4", at: h(49), text: "Domain admin logon from WEB01 to DC01 (pass-the-hash suspected)", source: "auth logs", findingId: "F-03", by: "U-HCM" },
    { id: "T-seed5", at: h(6), text: "Mass encryption begins; ransom notes written to 41 hosts", source: "EDR", findingId: "F-06", by: "U-HCM" },
  ].sort((a, b2) => (a.at < b2.at ? -1 : 1)));
  await subSave("iocs", "INC-2043", [
    { id: "I-seed1", type: "ipv4", value: "45.155.204.11", note: "exploit + C2 source", by: "U-NCM", at: h(70) },
    { id: "I-seed2", type: "sha256", value: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", note: "dropped webshell", by: "U-NCM", at: h(70) },
    { id: "I-seed3", type: "domain", value: "cdn-sync-update.top", note: "C2 callback domain", by: "U-HCM", at: h(48) },
  ]);
  await subSave("tasks", "INC-2043", PLAYBOOKS.ransomware.map(([phase, text], i) => ({ id: "K-seed" + i, phase, text, done: i < 5 })));
  log.info("seeded demo investigation INC-2043");
}

// ---------- auth: passwords + sessions (Node crypto only) ----------
function hashPw(pw, salt) { salt = salt || crypto.randomBytes(16).toString("hex"); const hash = crypto.scryptSync(String(pw), salt, 64).toString("hex"); return { salt, hash }; }
function verifyPw(pw, u) { if (!u || !u.salt) return false; const h = crypto.scryptSync(String(pw), u.salt, 64).toString("hex"); try { return crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(u.hash, "hex")); } catch { return false; } }
const pub = (u) => ({ id: u.id, name: u.name, title: u.title, prefs: u.prefs || { theme: "monolith", mark: "strike" } });
let SESSIONS = new Map();
async function loadSessions() { (await store.all("sessions")).forEach((x) => SESSIONS.set(x.token, x.userId)); }
async function newSession(userId) { const token = crypto.randomBytes(24).toString("hex"); SESSIONS.set(token, userId); await store.put("sessions", { id: token, token, userId, ts: Date.now() }); return token; }
async function dropSession(token) { SESSIONS.delete(token); await store.remove("sessions", token); }
const cookie = (tok) => `sky_sid=${tok}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${useTLS ? "; Secure" : ""}`;
function parseCookie(req) { const c = req.headers.cookie || ""; const m = /(?:^|; )sky_sid=([^;]+)/.exec(c); return m ? m[1] : null; }
function actorOf(req) { const t = parseCookie(req); if (!t) return null; const uid = SESSIONS.get(t); if (!uid) return null; return USERS.get(uid) || null; }

// ---------- login rate limiting (per IP + name) ----------
const LOGIN_ATTEMPTS = new Map();
const RL_MAX = 5, RL_WINDOW = 15 * 60000, RL_LOCK = 15 * 60000;
function rlKey(req, name) { const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim(); return ip + "|" + String(name || "").toLowerCase(); }
function rlBlocked(key) { const e = LOGIN_ATTEMPTS.get(key); if (e && e.lockUntil && Date.now() < e.lockUntil) return Math.ceil((e.lockUntil - Date.now()) / 1000); return 0; }
function rlFail(key) { const now = Date.now(); let e = LOGIN_ATTEMPTS.get(key); if (!e || now - e.first > RL_WINDOW) e = { count: 0, first: now, lockUntil: 0 }; e.count++; if (e.count >= RL_MAX) { e.lockUntil = now + RL_LOCK; log.warn("login.locked", { key }); } LOGIN_ATTEMPTS.set(key, e); }
function rlReset(key) { LOGIN_ATTEMPTS.delete(key); }

// ---------- local chat (team channel + DMs; persisted) ----------
async function chatChannels(meId) {
  const others = [...USERS.values()].filter((u) => u.id !== meId).map((u) => ({ id: "dm:" + [meId, u.id].sort().join("~"), name: u.name, title: u.title, dm: true, uid: u.id }));
  return [{ id: "team", name: "Team", dm: false }, ...others];
}
function dmOk(channel, meId) { if (channel === "team") return true; if (channel.startsWith("dm:")) return channel.slice(3).split("~").includes(meId); return false; }
async function chatMessages(channel) { const all = await store.all("messages"); return all.filter((m) => m.channel === channel).sort((a, b) => a.ts - b.ts).slice(-300).map((m) => ({ ...m, fromName: userName(m.from) })); }
async function chatSummary(meId) {
  const all = await store.all("messages"); const chans = await chatChannels(meId); const last = {};
  for (const m of all) { if (!last[m.channel] || last[m.channel].ts < m.ts) last[m.channel] = { ts: m.ts, from: m.from }; }
  return chans.map((c) => ({ id: c.id, name: c.name, dm: !!c.dm, lastTs: last[c.id] ? last[c.id].ts : 0, lastFrom: last[c.id] ? last[c.id].from : null }));
}
async function chatSend(b) {
  const actor = userById(b.actorId); const channel = b.channel || "team";
  if (!dmOk(channel, actor.id)) throw new Error("not a member of this channel");
  const text = (b.text || "").slice(0, 2000).trim(); if (!text) throw new Error("empty message");
  const msg = { id: "M-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), channel, from: actor.id, text, ts: Date.now() };
  await store.put("messages", msg); log.info("chat", { ch: channel, from: actor.id });
  return { ...msg, fromName: actor.name };
}

// ---------- http ----------
const send = (res, code, body, type = "application/json") => { res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" }); res.end(typeof body === "string" ? body : JSON.stringify(body, null, 2)); };
const BODY_MAX = 80 * 1024 * 1024;
const readBodyRaw = (req) => new Promise((r) => {
  let d = "", done = false;
  const finish = (v) => { if (!done) { done = true; r(v); } };
  req.on("data", (c) => { d += c; if (d.length > BODY_MAX) { d = ""; req.destroy(); finish({}); } });
  req.on("end", () => { try { finish(JSON.parse(d || "{}")); } catch { finish({}); } });
});

const handler = async (req, res) => {
  const t0 = Date.now(); const url = new URL(req.url, "http://localhost"); const p = url.pathname; const q = url.searchParams;
  res.on("finish", () => log.debug("req", { m: req.method, p, s: res.statusCode, ms: Date.now() - t0 }));
  const actor = actorOf(req);
  const rb = async () => { const b = await readBodyRaw(req); if (actor) b.actorId = actor.id; return b; };
  const isReport = /^\/investigations\/[^/]+\/report\//.test(p);
  if (p === "/api/auth/register" && req.method === "POST") { try { const b = await readBodyRaw(req); const u = await createUser(b); const tok = await newSession(u.id); res.writeHead(201, { "Content-Type": "application/json", "Set-Cookie": cookie(tok) }); return res.end(JSON.stringify(pub(u))); } catch (e) { return send(res, 400, { error: String(e.message || e) }); } }
  if (p === "/api/auth/login" && req.method === "POST") {
    const b = await readBodyRaw(req); const key = rlKey(req, b.name);
    const wait = rlBlocked(key); if (wait) return send(res, 429, { error: "too many attempts — wait " + wait + "s" });
    const u = [...USERS.values()].find((x) => x.name.toLowerCase() === (b.name || "").toLowerCase());
    if (!u || !verifyPw(b.password || "", u)) { rlFail(key); return send(res, 401, { error: "invalid name or password" }); }
    rlReset(key); const tok = await newSession(u.id);
    res.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": cookie(tok) }); return res.end(JSON.stringify(pub(u)));
  }
  if (p === "/api/auth/logout" && req.method === "POST") { const t = parseCookie(req); if (t) await dropSession(t); res.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": "sky_sid=; Path=/; Max-Age=0" }); return res.end("{}"); }
  if (p === "/api/me") return actor ? send(res, 200, { ...pub(actor), caps: capsFor(actor.title) }) : send(res, 401, { error: "not signed in" });
  // ---- collection-agent endpoints: token-authenticated, not session-gated ----
  if (p === "/api/agents/enroll" && req.method === "POST") { try { return send(res, 201, await agentEnroll(await readBodyRaw(req))); } catch (e) { return send(res, e.code === 403 ? 403 : 400, { error: String(e.message || e) }); } }
  if (p === "/api/agents/poll" && req.method === "POST") { try { const b = await readBodyRaw(req); return send(res, 200, await agentPoll(b.id, b.token)); } catch (e) { return send(res, e.code === 403 ? 403 : 400, { error: String(e.message || e) }); } }
  if (p === "/api/agents/results" && req.method === "POST") { try { return send(res, 201, await agentResults(await readBodyRaw(req))); } catch (e) { return send(res, e.code === 403 ? 403 : 400, { error: String(e.message || e) }); } }
  const needsAuth = isReport || p.startsWith("/evidence/") || p.startsWith("/api/");
  if (needsAuth && !actor) { if (isReport) { res.writeHead(302, { Location: "/login" }); return res.end(); } return send(res, 401, { error: "not signed in" }); }
  try {
    if (p === "/") return send(res, 200, pages.portfolio(), "text/html");
    if (p === "/login") return send(res, 200, pages.login(), "text/html");
    if (p === "/inv") return send(res, 200, pages.workspace(q.get("id")), "text/html");
    let rm;
    if ((rm = p.match(/^\/investigations\/([^/]+)\/report\/technical$/))) { const d = await reportData(rm[1]); return send(res, 200, pages.report("technical", d), "text/html"); }
    if ((rm = p.match(/^\/investigations\/([^/]+)\/report\/formal$/))) { const d = await reportData(rm[1]); return send(res, 200, pages.report("formal", d), "text/html"); }
    if (p === "/favicon.svg" || p === "/favicon.ico") return send(res, 200, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="26" fill="#0B0D10"/><g fill="#5EEAD4"><path d=\"M58 32 C58 27 70 27 70 32 C70 39 66 43 64 48 C62 43 58 39 58 32 Z\"/><path d=\"M64 44 L60 54 L64 50 L68 54 Z\"/><path d=\"M60 48 L59 70 L69 70 L68 48 Z\"/><path d=\"M60 50 L16 28 L30 47 L47 51 L58 62 Z\"/><path d=\"M68 50 L112 28 L98 47 L81 51 L70 62 Z\"/><path d=\"M64 68 L60 90 L64 84 L68 90 Z\"/><path d=\"M60 68 L50 84 L42 88 L49 88 L44 94 L52 90 L50 97 L56 89 L63 70 Z\"/><path d=\"M68 68 L78 84 L86 88 L79 88 L84 94 L76 90 L78 97 L72 89 L65 70 Z\"/></g></svg>', "image/svg+xml");
    // serve the collection-agent scripts so a target host can pull them over HTTP
    // (no auth: the scripts carry no secrets; running one still needs the enrol token)
    if (AGENT_FILES[p]) {
      const fp = path.join(__dirname, "agent", AGENT_FILES[p]);
      if (!fs.existsSync(fp)) return send(res, 404, { error: "agent script not found" });
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Content-Disposition": "attachment; filename=" + AGENT_FILES[p] });
      return res.end(fs.readFileSync(fp));
    }
    if (p === "/api/devices") return send(res, 200, DEVICE_TYPES);
    if (p === "/api/users" && req.method === "GET") return send(res, 200, [...USERS.values()].map(pub));
    if (p === "/api/users" && req.method === "POST") { requireCap(actor.id, "user.manage"); return send(res, 201, pub(await createUser(await rb()))); }
    { let mm; if ((mm = p.match(/^\/api\/users\/([^/]+)\/prefs$/)) && req.method === "POST") { if (mm[1] !== actor.id && !can(actor.title, "user.manage")) return send(res, 403, { error: "can only change your own appearance" }); const b = await rb(); const u = USERS.get(mm[1]); if (!u) return send(res, 404, { error: "not found" }); u.prefs = { theme: b.theme || "monolith", mark: b.mark || "strike" }; await store.put("users", u); USERS.set(u.id, u); log.info("prefs.saved", { id: u.id, theme: u.prefs.theme }); return send(res, 200, pub(u)); } }
    if (p === "/api/titles") return send(res, 200, TITLES);
    if (p.startsWith("/evidence/")) {
      const name = path.basename(p.slice(10)); const fp = path.join(EVID, name);
      if (!fp.startsWith(EVID) || !fs.existsSync(fp)) return send(res, 404, { error: "not found" });
      const ext = name.split(".").pop().toLowerCase(); const ct = ext === "jpg" ? "image/jpeg" : "image/" + ext;
      res.writeHead(200, { "Content-Type": ct }); return res.end(fs.readFileSync(fp));
    }
    if (p === "/health") return send(res, 200, { status: "ok", airGapped: true, store: process.env.STORE || "file", ts: new Date().toISOString() });
    if (p === "/api/logs") return send(res, 200, log.recent(Number(q.get("n") || 120)));
    if (p === "/api/portfolio") return send(res, 200, await portfolio());
    if (p === "/api/chat/channels") return send(res, 200, await chatChannels(q.get("me")));
    if (p === "/api/chat/messages") return send(res, 200, await chatMessages(q.get("channel") || "team"));
    if (p === "/api/chat/send" && req.method === "POST") return send(res, 201, await chatSend(await rb()));
    if (p === "/api/investigations" && req.method === "POST") return send(res, 201, await createInv(await rb()));
    if (p === "/api/search") return send(res, 200, await searchAll(q.get("q") || ""));
    if (p === "/api/backup") return send(res, 200, await backupAll({ actorId: actor.id }));
    if (p === "/api/investigations/import" && req.method === "POST") return send(res, 201, await importInv(await rb()));
    let m;
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/state$/))) return send(res, 200, await stateFor(m[1], actor.id));
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/update$/)) && req.method === "POST") return send(res, 200, await updateInv(m[1], await rb()));
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/finalize$/)) && req.method === "POST") return send(res, 200, await finalizeFormal(m[1], await rb()));
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/export$/))) return send(res, 200, await exportInv(m[1]));
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/audit$/))) { const l = await auditFor(m[1]); return send(res, 200, { intact: l.verify(), events: l.all().map((e) => ({ ...e, actorName: userName(e.actorId) })) }); }
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/timeline$/)) && req.method === "POST") return send(res, 201, await timelineAdd(m[1], await rb()));
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/timeline\/([^/]+)\/remove$/)) && req.method === "POST") return send(res, 200, await timelineRemove(m[1], m[2], await rb()));
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/iocs$/)) && req.method === "POST") return send(res, 201, await iocAdd(m[1], await rb()));
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/iocs\/extract$/)) && req.method === "POST") return send(res, 200, await iocExtract(m[1]));
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/iocs\/([^/]+)\/remove$/)) && req.method === "POST") return send(res, 200, await iocRemove(m[1], m[2], await rb()));
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/tasks$/)) && req.method === "POST") return send(res, 201, await tasksAdd(m[1], await rb()));
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/tasks\/([^/]+)\/toggle$/)) && req.method === "POST") return send(res, 200, await taskToggle(m[1], m[2], await rb()));
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/tasks\/([^/]+)\/remove$/)) && req.method === "POST") return send(res, 200, await taskRemove(m[1], m[2], await rb()));
    if (p === "/api/ingest/profiles") return send(res, 200, ingest.profiles());
    if (p === "/api/agents" && req.method === "GET") return send(res, 200, await agentList());
    if (p === "/api/agents/config") { requireCap(actor.id, "user.manage"); return send(res, 200, { enrollToken: AGENT_ENROLL, collectors: COLLECTORS, tls: useTLS, port: PORT, serverHosts: lanHosts() }); }
    if ((m = p.match(/^\/api\/agents\/([^/]+)\/collect$/)) && req.method === "POST") return send(res, 201, await agentCollect(m[1], await rb()));
    if ((m = p.match(/^\/api\/agents\/([^/]+)\/remove$/)) && req.method === "POST") return send(res, 200, await agentRemove(m[1], await rb()));
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/ingest\/preview$/)) && req.method === "POST") {
      requireCap(actor.id, "finding.create"); await getInv(m[1]); const b = await rb();
      const parsed = ingest.parse(b.text || "", b.filename || "", b.profile);
      if (parsed.error) return send(res, 200, parsed);
      const existing = { timeline: await subDoc("timeline", m[1]), iocs: await subDoc("iocs", m[1]), findings: await recordsFor(m[1]) };
      return send(res, 200, ingest.dedupe(parsed, existing));
    }
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/ingest\/commit$/)) && req.method === "POST") return send(res, 201, await ingestCommit(m[1], await rb()));
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/map$/)) && req.method === "POST") { requireCap(actor.id, "finding.create"); const b = await rb(); const inv = await getInv(m[1]); inv.map = { nodes: Array.isArray(b.nodes) ? b.nodes : [], edges: Array.isArray(b.edges) ? b.edges : [] }; await store.put("investigations", inv); log.info("map.saved", { inv: m[1], nodes: inv.map.nodes.length }); return send(res, 200, inv.map); }
    if (p === "/api/attack") return send(res, 200, { tactics: attack.tactics, techniques: attack.techniques });
    if (p === "/api/attack/suggest" && req.method === "POST") { const b = await rb(); return send(res, 200, attack.suggest(b.text || "")); }
    if (p === "/api/chat/summary") return send(res, 200, await chatSummary(actor.id));
    if (p === "/api/findings" && req.method === "POST") return send(res, 201, await addFinding(await rb()));
    if ((m = p.match(/^\/api\/findings\/([^/]+)\/edit$/)) && req.method === "POST") return send(res, 200, await editFinding(m[1], await rb()));
    if ((m = p.match(/^\/api\/findings\/([^/]+)\/evidence$/)) && req.method === "POST") return send(res, 200, await addEvidence(m[1], await rb()));
    if ((m = p.match(/^\/api\/findings\/([^/]+)\/approve$/)) && req.method === "POST") { const b = await rb(); return send(res, 200, dehydrate(await curate(m[1], b, (f) => { if (f.state === "submitted") f.beginReview(domainLead); f.approve(domainLead); }, "finding.approved"))); }
    if ((m = p.match(/^\/api\/findings\/([^/]+)\/park$/)) && req.method === "POST") { const b = await rb(); return send(res, 200, dehydrate(await curate(m[1], b, (f) => f.park(domainLead), "finding.parked"))); }
    if ((m = p.match(/^\/api\/findings\/([^/]+)\/reject$/)) && req.method === "POST") { const b = await rb(); return send(res, 200, dehydrate(await curate(m[1], b, (f) => f.reject(domainLead), "finding.rejected"))); }
    if ((m = p.match(/^\/api\/findings\/([^/]+)\/formal$/)) && req.method === "POST") { const b = await rb(); return send(res, 200, dehydrate(await curate(m[1], b, (f) => f.setIncludeInFormal(domainLead, !!b.include), "finding.formal"))); }
    if ((m = p.match(/^\/api\/findings\/([^/]+)\/summary$/)) && req.method === "POST") { const b = await rb(); return send(res, 200, dehydrate(await curate(m[1], b, (f) => f.writeFormalSummary(domainLead, String(b.text || "")), "finding.summary"))); }
    if ((m = p.match(/^\/api\/findings\/([^/]+)\/draft$/)) && req.method === "POST") { const rec = await store.get("findings", m[1]); if (!rec) throw new Error("not found"); return send(res, 200, { text: assist.draftFormalSummary(hydrate(rec)) }); }
    if ((m = p.match(/^\/api\/findings\/([^/]+)\/advice$/))) { const rec = await store.get("findings", m[1]); if (!rec) throw new Error("finding not found"); return send(res, 200, remediation.advise(rec, { iocs: await subDoc("iocs", rec.investigationId) })); }
    send(res, 404, { error: "not found" });
  } catch (e) { const code = e.code === 403 ? 403 : 400; log.warn("request.error", { p, err: String(e.message || e) }); send(res, code, { error: String(e.message || e) }); }
};
const server = useTLS ? https.createServer({ cert: fs.readFileSync(process.env.TLS_CERT), key: fs.readFileSync(process.env.TLS_KEY) }, handler) : http.createServer(handler);

loadUsers().then(loadSessions).then(seedIfEmpty).then(() => server.listen(PORT, () => {
  log.info("listening", { url: `${useTLS ? "https" : "http"}://localhost:${PORT}`, store: process.env.STORE || "file", tls: useTLS });
  if (!process.env.SKYHAWK_ENROLL_TOKEN) log.warn("agent.enroll.token", { token: AGENT_ENROLL, note: "generated for this boot — set SKYHAWK_ENROLL_TOKEN to make it persistent" });
}));
