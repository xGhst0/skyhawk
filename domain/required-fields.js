"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequiredFields = void 0;
/** Blocks finalizing a regulatory notification until every mandated field is present. */
function validateRequiredFields(regime, provided) {
    const missing = regime.requiredFields.filter((f) => provided[f] === undefined || provided[f] === null || provided[f] === "");
    return { regimeId: regime.id, satisfied: missing.length === 0, missing };
}
exports.validateRequiredFields = validateRequiredFields;
