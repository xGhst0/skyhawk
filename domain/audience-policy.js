"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormalPolicy = exports.TechnicalPolicy = void 0;
/** Everything approved, full detail, credited to the analyst. Live. */
class TechnicalPolicy {
    name = "technical";
    select(findings) {
        return findings.filter((f) => f.isInTechnicalReport);
    }
    toBlock(f, authorName) {
        return {
            title: f.title,
            body: f.technicalDetail,
            attack: f.attackTechniques,
            attributedTo: authorName(f.authorId),
        };
    }
}
exports.TechnicalPolicy = TechnicalPolicy;
/** Only lead-flagged findings, lead-written prose, no attribution. Frozen on finalize. */
class FormalPolicy {
    name = "formal";
    select(findings) {
        return findings.filter((f) => f.isInFormalReport);
    }
    toBlock(f) {
        return {
            title: f.title,
            body: f.formalSummary, // lead-written, plain language
            attack: f.attackTechniques,
            // no attributedTo — formal reports are anonymous
        };
    }
}
exports.FormalPolicy = FormalPolicy;
