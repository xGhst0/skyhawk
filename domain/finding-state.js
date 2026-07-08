"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSITIONS = exports.FindingState = void 0;
var FindingState;
(function (FindingState) {
    FindingState["Draft"] = "draft";
    FindingState["Submitted"] = "submitted";
    FindingState["UnderReview"] = "under_review";
    FindingState["Approved"] = "approved";
    FindingState["Parked"] = "parked";
    FindingState["Rejected"] = "rejected";
})(FindingState || (exports.FindingState = FindingState = {}));
/** Allowed transitions. Everything else throws. */
exports.TRANSITIONS = {
    [FindingState.Draft]: [FindingState.Submitted],
    [FindingState.Submitted]: [FindingState.UnderReview],
    [FindingState.UnderReview]: [
        FindingState.Approved,
        FindingState.Parked,
        FindingState.Rejected,
    ],
    [FindingState.Approved]: [FindingState.Parked, FindingState.Rejected],
    [FindingState.Parked]: [FindingState.UnderReview],
    [FindingState.Rejected]: [FindingState.UnderReview],
};
