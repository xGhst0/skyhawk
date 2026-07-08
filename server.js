// Skyhawk — air-gapped investigation-to-report platform (runnable build).
// Roles (NCM/HCM/TC/MC) · findings with full evidence + network map · live
// technical & frozen formal reports · persisted tamper-evident audit ·
// Store seam (file|postgres) · logging. No internet. Run: node server.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const log = require("./logger.js");
const { makeStore } = require("./store.js");
const { Finding, User, Role, TechnicalPolicy, FormalPolicy, Report, AuditLog, OfflineDraftAssist } = require("./domain/index.js");
const pages = require("./pages.js");
const attack = require("./attack.js");

const PORT = process.env.PORT || 8462;
const useTLS = !!(process.env.TLS_CERT && process.env.TLS_KEY);
const store = makeStore(log);
const assist = new OfflineDraftAssist();
const EVID = path.join(__dirname, "evidence");
try { fs.mkdirSync(EVID, { recursive: true }); } catch {}

const DEVICE_TYPES = ["workstation", "server", "domain controller", "firewall", "router", "switch", "load balancer", "database", "mail server", "VPN gateway", "cloud / SaaS", "IoT / OT", "external host"];

// ---------- roles / permissions ----------
const TITLES = { NCM: "NCM", HCM: "HCM", TC: "TC (team lead)", MC: "MC (manager)" };
const CAP = {
  NCM: ["finding.create", "finding.editOwn"],
  HCM: ["finding.create", "finding.editOwn"],
  TC: ["finding.create", "finding.editOwn", "finding.editAny", "finding.curate", "tech.control"],
  MC: ["finding.create", "finding.editOwn", "finding.editAny", "finding.curate", "tech.control", "formal.finalize", "user.manage"],
};
const can = (title, cap) => (CAP[title] || []).includes(cap);
const capsFor = (title) => CAP[title] || [];

// ---------- users (persisted; login picks one) ----------
let USERS = new Map();
async function loadUsers() {
  const arr = await store.all("users");
  if (!arr.length) {
    const seed = [ { id: "U-MC", name: "Morgan", title: "MC" }, { id: "U-TC", name: "Chen", title: "TC" }, { id: "U-NCM", name: "Rivera", title: "NCM" }, { id: "U-HCM", name: "Patel", title: "HCM" } ];
    for (const s0 of seed) { const pw = hashPw("skyhawk"); const u = { ...s0, prefs: { theme: "monolith", mark: "strike" }, salt: pw.salt, hash: pw.hash }; await store.put("users", u); USERS.set(u.id, u); }
  } else arr.forEach((u) => USERS.set(u.id, u));
}
async function createUser(b) {
  const name = (b.name || "").trim(); const title = (b.title || "").toUpperCase();
  if (!name) throw new Error("name required");
  if (!TITLES[title]) throw new Error("title must be NCM, HCM, TC or MC");
  const existing = [...USERS.values()].find((u) => u.name.toLowerCase() === name.toLowerCase() && u.title === title);
  if (existing) return existing;
  const pw = hashPw(b.password || "skyhawk"); const u = { id: "U-" + Date.now().toString(36), name, title, prefs: { theme: "monolith", mark: "strike" }, salt: pw.salt, hash: pw.hash };
  await store.put("users", u); USERS.set(u.id, u); log.info("user.created", { id: u.id, title });
  return u;
}
const userById = (id) => USERS.get(id) || { id, name: id, title: "NCM" };
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
  try { fs.writeFileSync(path.join(EVID, file), Buffer.from(m[3], "base64")); } catch { return null; }
  return { id: file, caption: (caption || "").slice(0, 200), file, url: "/evidence/" + file };
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
  const rec = { id, title, status: "open", createdAt: new Date().toISOString(), execSummary: "", scope: "", remediation: "", formalFrozen: null };
  await store.put("investigations", rec); await auditRecord(id, b.actorId, "investigation.created", id, { title });
  log.info("investigation.created", { id }); return rec;
}
async function recordsFor(invId) { return (await store.all("findings")).filter((r) => r.investigationId === invId); }

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
  const view = recs.map((r) => ({ ...r, by: userName(r.authorId), authorId: r.authorId, inTechnical: r.state === "approved" }));
  const audit = await auditFor(invId);
  const me = userById(meId);
  return { investigation: inv, devices: DEVICE_TYPES, findings: view, technicalCount: view.filter((f) => f.inTechnical).length, map: inv.map || { nodes: [], edges: [] }, audit: { intact: audit.verify(), events: audit.all().length }, me: { id: me.id, name: me.name, title: me.title, caps: capsFor(me.title), prefs: me.prefs || { theme: "monolith", mark: "strike" } } };
}
async function reportData(invId) {
  const inv = await getInv(invId);
  const recs = (await recordsFor(invId)).map((r) => ({ ...r, by: userName(r.authorId), attackTechniques: r.attack || [], inTechnical: r.state === "approved" }));
  const attack = [...new Set(recs.filter((r) => r.inTechnical).flatMap((r) => r.attack || []))];
  return { inv, findingsRaw: recs, attack };
}
async function portfolio() {
  const out = [];
  for (const inv of await listInv()) {
    const recs = await recordsFor(inv.id);
    out.push({ id: inv.id, title: inv.title, status: inv.status, findings: recs.length, technical: recs.filter((r) => r.state === "approved").length, formal: recs.filter((r) => r.state === "approved" && r.inFormal && (r.formalSummary || "").length > 0).length });
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
const readBodyRaw = (req) => new Promise((r) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => { try { r(JSON.parse(d || "{}")); } catch { r({}); } }); });

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
  const needsAuth = isReport || p.startsWith("/evidence/") || p.startsWith("/api/");
  if (needsAuth && !actor) { if (isReport) { res.writeHead(302, { Location: "/login" }); return res.end(); } return send(res, 401, { error: "not signed in" }); }
  try {
    if (p === "/") return send(res, 200, pages.portfolio(), "text/html");
    if (p === "/login") return send(res, 200, pages.login(), "text/html");
    if (p === "/inv") return send(res, 200, pages.workspace(q.get("id")), "text/html");
    let rm;
    if ((rm = p.match(/^\/investigations\/([^/]+)\/report\/technical$/))) { const d = await reportData(rm[1]); return send(res, 200, pages.report("technical", d), "text/html"); }
    if (p === "/favicon.svg" || p === "/favicon.ico") return send(res, 200, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="26" fill="#0B0D10"/><g fill="#5EEAD4"><path d=\"M58 32 C58 27 70 27 70 32 C70 39 66 43 64 48 C62 43 58 39 58 32 Z\"/><path d=\"M64 44 L60 54 L64 50 L68 54 Z\"/><path d=\"M60 48 L59 70 L69 70 L68 48 Z\"/><path d=\"M60 50 L16 28 L30 47 L47 51 L58 62 Z\"/><path d=\"M68 50 L112 28 L98 47 L81 51 L70 62 Z\"/><path d=\"M64 68 L60 90 L64 84 L68 90 Z\"/><path d=\"M60 68 L50 84 L42 88 L49 88 L44 94 L52 90 L50 97 L56 89 L63 70 Z\"/><path d=\"M68 68 L78 84 L86 88 L79 88 L84 94 L76 90 L78 97 L72 89 L65 70 Z\"/></g></svg>', "image/svg+xml");
    if (p === "/api/devices") return send(res, 200, DEVICE_TYPES);
    if (p === "/api/users" && req.method === "GET") return send(res, 200, [...USERS.values()].map(pub));
    if (p === "/api/users" && req.method === "POST") { requireCap(actor.id, "user.manage"); return send(res, 201, pub(await createUser(await rb()))); }
    { let mm; if ((mm = p.match(/^\/api\/users\/([^/]+)\/prefs$/)) && req.method === "POST") { if (mm[1] !== actor.id && actor.title !== "MC") return send(res, 403, { error: "can only change your own appearance" }); const b = await rb(); const u = USERS.get(mm[1]); if (!u) return send(res, 404, { error: "not found" }); u.prefs = { theme: b.theme || "monolith", mark: b.mark || "strike" }; await store.put("users", u); USERS.set(u.id, u); log.info("prefs.saved", { id: u.id, theme: u.prefs.theme }); return send(res, 200, pub(u)); } }
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
    let m;
    if ((m = p.match(/^\/api\/investigations\/([^/]+)\/state$/))) return send(res, 200, await stateFor(m[1], actor.id));
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
    if ((m = p.match(/^\/api\/findings\/([^/]+)\/draft$/)) && req.method === "POST") { const rec = await store.get("findings", m[1]); if (!rec) throw new Error("not found"); return send(res, 200, { text: assist.draftFormalSummary(hydrate(rec)) }); }
    send(res, 404, { error: "not found" });
  } catch (e) { const code = e.code === 403 ? 403 : 400; log.warn("request.error", { p, err: String(e.message || e) }); send(res, code, { error: String(e.message || e) }); }
};
const server = useTLS ? https.createServer({ cert: fs.readFileSync(process.env.TLS_CERT), key: fs.readFileSync(process.env.TLS_KEY) }, handler) : http.createServer(handler);

loadUsers().then(loadSessions).then(seedIfEmpty).then(() => server.listen(PORT, () => log.info("listening", { url: `${useTLS ? "https" : "http"}://localhost:${PORT}`, store: process.env.STORE || "file", tls: useTLS })));
