"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGIMES = exports.RegulatoryClock = exports.addBusinessDays = void 0;
/** Adds N business days, skipping weekends. Holidays are pluggable. */
function addBusinessDays(from, days, holidays = new Set()) {
    const d = new Date(from);
    let added = 0;
    while (added < days) {
        d.setUTCDate(d.getUTCDate() + 1);
        const dow = d.getUTCDay();
        const iso = d.toISOString().slice(0, 10);
        if (dow !== 0 && dow !== 6 && !holidays.has(iso))
            added++;
    }
    return d;
}
exports.addBusinessDays = addBusinessDays;
class RegulatoryClock {
    regime;
    startedAt;
    holidays;
    constructor(regime, startedAt, holidays = new Set()) {
        this.regime = regime;
        this.startedAt = startedAt;
        this.holidays = holidays;
    }
    get dueAt() {
        if (this.regime.unit === "hours") {
            return new Date(this.startedAt.getTime() + this.regime.duration * 3600_000);
        }
        return addBusinessDays(this.startedAt, this.regime.duration, this.holidays);
    }
    hoursRemaining(now = new Date()) {
        return Math.round(((this.dueAt.getTime() - now.getTime()) / 3600_000) * 10) / 10;
    }
    status(now = new Date()) {
        const h = (this.dueAt.getTime() - now.getTime()) / 3600_000;
        if (h <= 0)
            return "overdue";
        if (h <= 24)
            return "warning";
        return "ok";
    }
}
exports.RegulatoryClock = RegulatoryClock;
/** Built-in regimes — extend with a RegimePack plugin. */
exports.REGIMES = {
    "sec-8k": { id: "sec-8k", name: "SEC 8-K Item 1.05", unit: "business_days", duration: 4,
        trigger: "Materiality determination for a cybersecurity incident",
        requiredFields: ["natureScopeTiming", "materialImpact", "boardOversight"] },
    "gdpr-33": { id: "gdpr-33", name: "GDPR Article 33", unit: "hours", duration: 72,
        trigger: "Awareness of a personal-data breach",
        requiredFields: ["natureOfBreach", "dataSubjectsAffected", "likelyConsequences", "measuresTaken", "dpoContact"] },
    "dora": { id: "dora", name: "DORA major ICT incident (initial)", unit: "hours", duration: 24,
        trigger: "Classification of a major ICT-related incident",
        requiredFields: ["incidentClassification", "affectedServices", "impactAssessment"] },
    "nis2": { id: "nis2", name: "NIS2 early warning", unit: "hours", duration: 24,
        trigger: "Awareness of a significant incident",
        requiredFields: ["crossBorderImpact", "suspectedUnlawfulAction"] },
};
