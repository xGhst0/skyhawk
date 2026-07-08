// Async Store seam. Swap persistence with STORE=file (default) or STORE=postgres.
// The whole app talks to this interface only, so moving to Postgres is one binding.
const fs = require("fs");
const path = require("path");

class FileStore {
  constructor(file) { this.file = file; this.data = this._read(); }
  _read() { try { return JSON.parse(fs.readFileSync(this.file, "utf-8")); } catch { return {}; } }
  _write() { fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2)); }
  async all(coll) { return this.data[coll] ? [...this.data[coll]] : []; }
  async get(coll, id) { return (this.data[coll] || []).find((x) => x.id === id) || null; }
  async put(coll, rec) {
    const arr = this.data[coll] || (this.data[coll] = []);
    const i = arr.findIndex((x) => x.id === rec.id);
    if (i >= 0) arr[i] = rec; else arr.push(rec);
    this._write(); return rec;
  }
  async remove(coll, id) { this.data[coll] = (this.data[coll] || []).filter((x) => x.id !== id); this._write(); }
}

// Same interface, backed by Postgres (jsonb kv). Needs `npm i pg` + a DATABASE_URL.
class PostgresStore {
  constructor(url) { const { Pool } = require("pg"); this.pool = new Pool({ connectionString: url }); this.ready = this._init(); }
  async _init() { await this.pool.query("create table if not exists kv (coll text, id text, val jsonb, primary key (coll,id))"); }
  async all(coll) { await this.ready; const r = await this.pool.query("select val from kv where coll=$1", [coll]); return r.rows.map((x) => x.val); }
  async get(coll, id) { await this.ready; const r = await this.pool.query("select val from kv where coll=$1 and id=$2", [coll, id]); return r.rows[0]?.val || null; }
  async put(coll, rec) { await this.ready; await this.pool.query("insert into kv(coll,id,val) values($1,$2,$3) on conflict (coll,id) do update set val=excluded.val", [coll, rec.id, rec]); return rec; }
  async remove(coll, id) { await this.ready; await this.pool.query("delete from kv where coll=$1 and id=$2", [coll, id]); }
}

function makeStore(logger) {
  if ((process.env.STORE || "file") === "postgres") {
    logger.info("store: postgres", { hasUrl: !!process.env.DATABASE_URL });
    return new PostgresStore(process.env.DATABASE_URL);
  }
  const file = path.join(__dirname, "skyhawk-data.json");
  logger.info("store: file", { file });
  return new FileStore(file);
}
module.exports = { FileStore, PostgresStore, makeStore };
