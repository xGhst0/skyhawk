"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const regulatory_1 = require("./regulatory");
const required_fields_1 = require("./required-fields");
const audit_1 = require("./audit");
const draft_assist_1 = require("./draft-assist");
const finding_1 = require("./finding");
(0, node_test_1.test)("business-days clock skips weekends (Fri + 4bd = Thu)", () => {
    const fri = new Date("2026-06-12T09:00:00Z"); // Friday
    const due = (0, regulatory_1.addBusinessDays)(fri, 4);
    node_assert_1.default.equal(due.getUTCDay(), 4); // Thursday
});
(0, node_test_1.test)("SEC 8-K clock reports warning under 24h", () => {
    const now = new Date("2026-06-18T10:00:00Z");
    const started = (0, regulatory_1.addBusinessDays)(now, -4); // due ~ now
    const clock = new regulatory_1.RegulatoryClock(regulatory_1.REGIMES["sec-8k"], started);
    node_assert_1.default.ok(["warning", "overdue", "ok"].includes(clock.status(now)));
});
(0, node_test_1.test)("GDPR 72h clock math", () => {
    const started = new Date("2026-06-14T00:00:00Z");
    const clock = new regulatory_1.RegulatoryClock(regulatory_1.REGIMES["gdpr-33"], started);
    node_assert_1.default.equal(clock.dueAt.toISOString(), "2026-06-17T00:00:00.000Z");
});
(0, node_test_1.test)("required-field validator flags missing fields", () => {
    const r = (0, required_fields_1.validateRequiredFields)(regulatory_1.REGIMES["gdpr-33"], { natureOfBreach: "x" });
    node_assert_1.default.equal(r.satisfied, false);
    node_assert_1.default.ok(r.missing.includes("dpoContact"));
});
(0, node_test_1.test)("audit chain verifies, and detects tampering", () => {
    const log = new audit_1.AuditLog();
    log.record("a1", "finding.created", "f1", { title: "x" });
    log.record("l1", "finding.approved", "f1", {});
    node_assert_1.default.equal(log.verify(), true);
    // tamper with a recorded event
    log.all()[0].action = "hacked";
    node_assert_1.default.equal(log.verify(), false);
});
(0, node_test_1.test)("offline draft assist needs no network and is deterministic", () => {
    const f = new finding_1.Finding("f1", "i1", "Exposed RDP brute force", "detail", finding_1.Severity.High, "a1", ["T1133"]);
    const assist = new draft_assist_1.OfflineDraftAssist();
    const a = assist.draftFormalSummary(f, "The actor logged in via exposed RDP.");
    const b = assist.draftFormalSummary(f, "The actor logged in via exposed RDP.");
    node_assert_1.default.equal(a, b);
    const noPhrase = assist.draftFormalSummary(f);
    node_assert_1.default.ok(noPhrase.includes("T1133"));
});
