"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const finding_1 = require("./finding");
const user_1 = require("./user");
const errors_1 = require("./errors");
const analyst = new user_1.User("a1", "A. Rivera", user_1.Role.Analyst);
const lead = new user_1.User("l1", "S. Morgan", user_1.Role.Lead);
function make() {
    return new finding_1.Finding("f1", "inc1", "Exposed RDP", "rdp detail", finding_1.Severity.High, "a1", ["T1133"]);
}
(0, node_test_1.test)("happy path: submit -> review -> approve -> in formal", () => {
    const f = make();
    f.submit(analyst);
    f.beginReview(lead);
    f.approve(lead);
    node_assert_1.default.equal(f.isInTechnicalReport, true);
    f.setIncludeInFormal(lead, true);
    f.writeFormalSummary(lead, "An exposed remote service was used to log in.");
    node_assert_1.default.equal(f.isInFormalReport, true);
});
(0, node_test_1.test)("analyst cannot approve", () => {
    const f = make();
    f.submit(analyst);
    f.beginReview(lead);
    node_assert_1.default.throws(() => f.approve(analyst), errors_1.DomainError);
});
(0, node_test_1.test)("illegal transition throws", () => {
    const f = make();
    node_assert_1.default.throws(() => f.approve(lead), errors_1.DomainError); // can't approve a draft
});
(0, node_test_1.test)("cannot flag formal before approval", () => {
    const f = make();
    node_assert_1.default.throws(() => f.setIncludeInFormal(lead, true), errors_1.DomainError);
});
