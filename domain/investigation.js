"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Investigation = void 0;
const audit_1 = require("./audit");
/** The case container; owns findings, an optional regulatory clock, and its audit log. */
class Investigation {
    id;
    title;
    leadId;
    clock;
    status = "open";
    audit = new audit_1.AuditLog();
    findings = new Map();
    constructor(id, title, leadId, clock) {
        this.id = id;
        this.title = title;
        this.leadId = leadId;
        this.clock = clock;
    }
    addFinding(f) {
        this.findings.set(f.id, f);
        this.audit.record(f.authorId, "finding.created", f.id, { title: f.title });
    }
    list() { return [...this.findings.values()]; }
    technicalFindings() { return this.list().filter((f) => f.isInTechnicalReport); }
    formalFindings() { return this.list().filter((f) => f.isInFormalReport); }
}
exports.Investigation = Investigation;
