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

function query(invId, opts) {
  opts = opts || {};
  const all = readAll(invId);
  const sources = {}; for (const e of all) sources[e.source || "?"] = (sources[e.source || "?"] || 0) + 1;
  let rows = all;
  if (opts.source) rows = rows.filter((e) => e.source === opts.source);
  const from = opts.from ? Date.parse(opts.from) : NaN, to = opts.to ? Date.parse(opts.to) : NaN;
  if (!isNaN(from)) rows = rows.filter((e) => Date.parse(e.ts) >= from);
  if (!isNaN(to)) rows = rows.filter((e) => Date.parse(e.ts) <= to);
  const q = (opts.q || "").toLowerCase().trim();
  if (q) rows = rows.filter((e) => JSON.stringify(e).toLowerCase().includes(q));
  rows.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0)); // newest first
  const total = rows.length;
  const limit = Math.min(Math.max(1, opts.limit || 100), 500), offset = Math.max(0, opts.offset || 0);
  return { total, count: all.length, sources, events: rows.slice(offset, offset + limit) };
}

function stats(invId) {
  const all = readAll(invId);
  const sources = {}; let min = null, max = null;
  for (const e of all) { sources[e.source || "?"] = (sources[e.source || "?"] || 0) + 1; const t = e.ts; if (t) { if (!min || t < min) min = t; if (!max || t > max) max = t; } }
  return { count: all.length, sources, first: min, last: max };
}

function clear(invId) { try { fs.unlinkSync(file(invId)); } catch {} }
