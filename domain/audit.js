"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const node_crypto_1 = require("node:crypto");
const GENESIS = "0".repeat(64);
const sha256 = (s) => (0, node_crypto_1.createHash)("sha256").update(s).digest("hex");
/**
 * Tamper-evident, hash-chained audit log. Any retroactive edit breaks the
 * chain — the defensibility a signed incident report needs, and something
 * IRIS/TheHive do not provide. Fully local; no external timestamp authority.
 */
class AuditLog {
    events = [];
    static digest(e) {
        return sha256(`${e.seq}|${e.timestamp}|${e.actorId}|${e.action}|${e.targetId}|${e.dataHash}|${e.prevHash}`);
    }
    record(actorId, action, targetId, data) {
        const seq = this.events.length;
        const prevHash = seq === 0 ? GENESIS : this.events[seq - 1].hash;
        const base = {
            seq, timestamp: new Date().toISOString(), actorId, action, targetId,
            dataHash: sha256(JSON.stringify(data ?? null)), prevHash,
        };
        const event = { ...base, hash: AuditLog.digest(base) };
        this.events.push(event);
        return event;
    }
    all() { return this.events; }
    /** Rehydrate a persisted chain so it continues verifiably across restarts. */
    load(events) { this.events = events.slice(); return this; }
    /** True only if the whole chain is intact and untampered. */
    verify() {
        let prev = GENESIS;
        for (const e of this.events) {
            const { hash, ...base } = e;
            if (e.prevHash !== prev || AuditLog.digest(base) !== hash)
                return false;
            prev = hash;
        }
        return true;
    }
}
exports.AuditLog = AuditLog;
