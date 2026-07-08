"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolEvidence = exports.QueryEvidence = exports.Screenshot = exports.EvidenceArtifact = void 0;
/** Typed evidence attached to a finding. Only screenshots may (redacted) reach the formal report. */
class EvidenceArtifact {
    id;
    provenance;
    constructor(id, provenance) {
        this.id = id;
        this.provenance = provenance;
    }
    /** Whether this artifact type is allowed into a formal (client-facing) report. */
    get formalEligible() { return this.kind === "screenshot"; }
}
exports.EvidenceArtifact = EvidenceArtifact;
class Screenshot extends EvidenceArtifact {
    caption;
    objectRef;
    kind = "screenshot";
    constructor(id, provenance, caption, objectRef) {
        super(id, provenance);
        this.caption = caption;
        this.objectRef = objectRef;
    }
}
exports.Screenshot = Screenshot;
class QueryEvidence extends EvidenceArtifact {
    language;
    text;
    result;
    kind = "query";
    constructor(id, provenance, language, text, result) {
        super(id, provenance);
        this.language = language;
        this.text = text;
        this.result = result;
    }
}
exports.QueryEvidence = QueryEvidence;
class ToolEvidence extends EvidenceArtifact {
    name;
    version;
    kind = "tool";
    constructor(id, provenance, name, version) {
        super(id, provenance);
        this.name = name;
        this.version = version;
    }
}
exports.ToolEvidence = ToolEvidence;
