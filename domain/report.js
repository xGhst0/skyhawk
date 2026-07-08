"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Report = void 0;
/** data x template x audience. The same class serves technical & formal. */
class Report {
    investigationId;
    policy;
    authorName;
    frozenBlocks = null;
    frozenAt;
    frozenBy;
    version = 0;
    constructor(investigationId, policy, authorName = (id) => id) {
        this.investigationId = investigationId;
        this.policy = policy;
        this.authorName = authorName;
    }
    /** Live view — recomputed from current findings every call. */
    render(findings) {
        if (this.frozenBlocks)
            return this.frozenBlocks;
        return this.policy
            .select(findings)
            .map((f) => this.policy.toBlock(f, this.authorName));
    }
    get isFrozen() {
        return this.frozenBlocks !== null;
    }
    /** Finalize = immutable, signed snapshot. Re-finalizing bumps the version. */
    finalize(findings, leadName) {
        this.frozenBlocks = this.policy
            .select(findings)
            .map((f) => this.policy.toBlock(f, this.authorName));
        this.frozenAt = new Date();
        this.frozenBy = leadName;
        this.version += 1;
    }
}
exports.Report = Report;
