"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineDraftAssist = void 0;
/**
 * Fully-offline draft assist. Removes the blank-page tax with ZERO network
 * calls: it synthesizes a plain-language first draft from the finding's
 * structured data and the ATT&CK pack's ready-made phrasing. Deterministic
 * and air-gap-safe. A local model can be plugged via the DraftAssist interface,
 * but the shipped default never leaves the machine.
 */
class OfflineDraftAssist {
    id = "offline";
    draftFormalSummary(finding, phrasing) {
        const base = phrasing?.trim();
        if (base)
            return base;
        const tech = finding.attackTechniques[0] ?? "an observed technique";
        const sev = finding.severity;
        return (`The team identified a ${sev}-severity issue: ${finding.title.toLowerCase()}. ` +
            `Activity mapped to ${tech}. See the technical report for full detail.`);
    }
}
exports.OfflineDraftAssist = OfflineDraftAssist;
