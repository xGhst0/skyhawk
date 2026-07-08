"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Finding = exports.Severity = void 0;
const errors_1 = require("./errors");
const user_1 = require("./user");
const finding_state_1 = require("./finding-state");
var Severity;
(function (Severity) {
    Severity["Critical"] = "critical";
    Severity["High"] = "high";
    Severity["Medium"] = "medium";
    Severity["Low"] = "low";
})(Severity || (exports.Severity = Severity = {}));
/**
 * The atomic unit of the product. Owns its own lifecycle: illegal
 * transitions are impossible by construction, not policed elsewhere.
 */
class Finding {
    id;
    investigationId;
    title;
    technicalDetail;
    severity;
    authorId;
    attackTechniques;
    state = finding_state_1.FindingState.Draft;
    inFormal = false;
    /** Lead-owned. Empty until Compose. */
    formalSummary = "";
    constructor(id, investigationId, title, technicalDetail, severity, 
    /** analyst id — set at capture from the roster identity */
    authorId, attackTechniques = []) {
        this.id = id;
        this.investigationId = investigationId;
        this.title = title;
        this.technicalDetail = technicalDetail;
        this.severity = severity;
        this.authorId = authorId;
        this.attackTechniques = attackTechniques;
    }
    transition(to) {
        if (!finding_state_1.TRANSITIONS[this.state].includes(to)) {
            throw new errors_1.DomainError(`Cannot move finding from '${this.state}' to '${to}'`);
        }
        this.state = to;
    }
    submit(actor) {
        if (actor.id !== this.authorId) {
            throw new errors_1.DomainError("Only the author may submit their finding");
        }
        this.transition(finding_state_1.FindingState.Submitted);
    }
    beginReview(lead) {
        lead.assertRole(user_1.Role.Lead);
        this.transition(finding_state_1.FindingState.UnderReview);
    }
    approve(lead) {
        lead.assertRole(user_1.Role.Lead);
        this.transition(finding_state_1.FindingState.Approved);
    }
    park(lead) {
        lead.assertRole(user_1.Role.Lead);
        this.inFormal = false;
        this.transition(finding_state_1.FindingState.Parked);
    }
    reject(lead) {
        lead.assertRole(user_1.Role.Lead);
        this.inFormal = false;
        this.transition(finding_state_1.FindingState.Rejected);
    }
    /** Flag/unflag for the formal report. Only valid once approved. */
    setIncludeInFormal(lead, include) {
        lead.assertRole(user_1.Role.Lead);
        if (this.state !== finding_state_1.FindingState.Approved) {
            throw new errors_1.DomainError("Finding must be approved before flagging into the formal report");
        }
        this.inFormal = include;
    }
    /** Lead writes the plain-language summary during Compose. */
    writeFormalSummary(lead, text) {
        lead.assertRole(user_1.Role.Lead);
        if (!this.inFormal) {
            throw new errors_1.DomainError("Only findings flagged for the formal report get a summary");
        }
        this.formalSummary = text.trim();
    }
    get isInTechnicalReport() {
        return this.state === finding_state_1.FindingState.Approved;
    }
    get isInFormalReport() {
        return this.isInTechnicalReport && this.inFormal && this.formalSummary.length > 0;
    }
}
exports.Finding = Finding;
