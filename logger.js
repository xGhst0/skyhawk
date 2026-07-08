// Structured logger: console + rotating file + in-memory ring for the UI panel.
const fs = require("fs");
const path = require("path");
const LOG_FILE = path.join(__dirname, "skyhawk.log");
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = LEVELS[process.env.LOG_LEVEL || (process.env.DEBUG ? "debug" : "info")] || 20;
const ring = [];
const MAX = 400;

function emit(level, msg, meta) {
  if (LEVELS[level] < MIN) return;
  const e = { ts: new Date().toISOString(), level, msg, meta: meta ?? null };
  ring.push(e); if (ring.length > MAX) ring.shift();
  const line = `${e.ts} ${level.toUpperCase().padEnd(5)} ${msg}${meta ? " " + JSON.stringify(meta) : ""}`;
  (level === "error" ? console.error : console.log)(line);
  try { fs.appendFileSync(LOG_FILE, line + "\n"); } catch { /* non-fatal */ }
}
module.exports = {
  debug: (m, x) => emit("debug", m, x),
  info: (m, x) => emit("info", m, x),
  warn: (m, x) => emit("warn", m, x),
  error: (m, x) => emit("error", m, x),
  recent: (n = 120) => ring.slice(-n),
  file: LOG_FILE,
};
