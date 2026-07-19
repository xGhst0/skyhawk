"use strict";
// The event lake (v1) — SKYHAWK's own append-only event store. Each case gets a
// newline-delimited JSON log under lake/. It's deliberately simple: append is a
// file write, query is a scan + filter. That's plenty for a case's worth of
// events and keeps the store a format we fully own (no database, no open port).
// The 3.0 build replaces the scan with time-segmented, indexed reads — this is
// the shape that seam will slot behind.
Object.defineProperty(exports, "__esModule", { value: true });
exports.append = append;
exports.query = query;
exports.stats = stats;
exports.dump = dump;
exports.clear = clear;

const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "lake");
const MAX_SCAN = 200000; // cap the scan so a runaway file can't wedge a query

function file(invId) { return path.join(DIR, String(invId).replace(/[^A-Za-z0-9._-]/g, "_") + ".ndjson"); }

function append(invId, events) {
  if (!events || !events.length) return 0;
  try { fs.mkdirSync(DIR, { recursive: true }); } catch {}
  const now = Date.now();
  const lines = events.map((e, i) => JSON.stringify({ id: "E-" + now.toString(36) + i.toString(36), ts: e.ts || new Date().toISOString(), ...e })).join("\n") + "\n";
  try { fs.appendFileSync(file(invId), lines); } catch { return 0; }
  return events.length;
}

function readAll(invId) {
  let txt = ""; try { txt = fs.readFileSync(file(invId), "utf8"); } catch { return []; }
  const out = [];
  const lines = txt.split("\n");
  const start = lines.length > MAX_SCAN ? lines.length - MAX_SCAN : 0;
  for (let i = start; i < lines.length; i++) { const l = lines[i]; if (!l) continue; try { out.push(JSON.parse(l)); } catch {} }
  return out;
}

function topN(o, n) { return Object.keys(o).map((k) => ({ k, v: o[k] })).sort((a, b) => b.v - a.v).slice(0, n); }

// ---- lightweight field-aware query language (KQL/SPL-lite) ----
// tokens are ANDed; `field:value`, `field:"a b"`, bare free-text, and `-` to negate.
const FIELDMAP = { source: "source", src: "saddr", saddr: "saddr", srcip: "saddr", dest: "daddr", dst: "daddr", daddr: "daddr", dstip: "daddr", host: "host", type: "type", proto: "proto", sport: "sport", dport: "dport", port: "dport", msg: "msg", attack: "attack", technique: "attack" };
function tokenize(qs) {
  const out = [], re = /(-?)(?:([A-Za-z_][\w.]*):)?(?:"([^"]*)"|(\S+))/g; let m;
  while ((m = re.exec(qs))) { const val = (m[3] != null ? m[3] : m[4]) || ""; if (!val) continue; out.push({ neg: m[1] === "-", field: m[2] ? m[2].toLowerCase() : null, val: val.toLowerCase() }); }
  return out;
}
function matchToken(e, t) {
  let hit;
  if (t.field) {
    const key = FIELDMAP[t.field];
    if (key === "attack") hit = (e.attack || []).some((a) => String(a).toLowerCase().includes(t.val));
    else if (key) hit = String(e[key] == null ? "" : e[key]).toLowerCase().includes(t.val);
    else { const fv = e.fields && e.fields[t.field]; hit = fv != null ? String(fv).toLowerCase().includes(t.val) : JSON.stringify(e).toLowerCase().includes(t.field + ":" + t.val); }
  } else hit = JSON.stringify(e).toLowerCase().includes(t.val);
  return t.neg ? !hit : hit;
}
// split tokens into OR-groups (a bare `or` separates them); a group is ANDed
function parseQuery(qs) {
  const groups = [[]];
  for (const t of tokenize(qs)) { if (!t.field && !t.neg && (t.val === "or" || t.val === "||")) groups.push([]); else groups[groups.length - 1].push(t); }
  return groups.filter((g) => g.length);
}
function matchQuery(e, groups) { if (!groups.length) return true; return groups.some((g) => g.every((t) => matchToken(e, t))); }

function query(invId, opts) {
  opts = opts || {};
  const all = readAll(invId);
  const sources = {}, srcIps = {}, dstIps = {}, attacks = {};
  for (const e of all) {
    sources[e.source || "?"] = (sources[e.source || "?"] || 0) + 1;
    if (e.saddr) srcIps[e.saddr] = (srcIps[e.saddr] || 0) + 1;
    if (e.daddr) dstIps[e.daddr] = (dstIps[e.daddr] || 0) + 1;
    (e.attack || []).forEach((a) => { attacks[a] = (attacks[a] || 0) + 1; });
  }
  const top = { srcIps: topN(srcIps, 6), dstIps: topN(dstIps, 6), attacks: topN(attacks, 8) };
  let rows = all;
  if (opts.source) rows = rows.filter((e) => e.source === opts.source);
  const from = opts.from ? Date.parse(opts.from) : NaN, to = opts.to ? Date.parse(opts.to) : NaN;
  if (!isNaN(from)) rows = rows.filter((e) => Date.parse(e.ts) >= from);
  if (!isNaN(to)) rows = rows.filter((e) => Date.parse(e.ts) <= to);
  const qs = (opts.q || "").trim();
  if (qs) { const groups = parseQuery(qs); rows = rows.filter((e) => matchQuery(e, groups)); }
  rows.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0)); // newest first
  const total = rows.length;
  const limit = Math.min(Math.max(1, opts.limit || 100), 500), offset = Math.max(0, opts.offset || 0);
  return { total, count: all.length, sources, top, events: rows.slice(offset, offset + limit) };
}

function dump(invId) { return readAll(invId); }

function stats(invId) {
  const all = readAll(invId);
  const sources = {}; let min = null, max = null;
  for (const e of all) { sources[e.source || "?"] = (sources[e.source || "?"] || 0) + 1; const t = e.ts; if (t) { if (!min || t < min) min = t; if (!max || t > max) max = t; } }
  return { count: all.length, sources, first: min, last: max };
}

function clear(invId) { try { fs.unlinkSync(file(invId)); } catch {} }
