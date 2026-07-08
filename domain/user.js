"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.Role = void 0;
const errors_1 = require("./errors");
var Role;
(function (Role) {
    Role["Analyst"] = "analyst";
    Role["Lead"] = "lead";
    Role["Reviewer"] = "reviewer";
})(Role || (exports.Role = Role = {}));
/** A roster member acting within an investigation. */
class User {
    id;
    displayName;
    role;
    constructor(id, displayName, role) {
        this.id = id;
        this.displayName = displayName;
        this.role = role;
    }
    assertRole(required) {
        if (this.role !== required) {
            throw new errors_1.DomainError(`Action requires role '${required}', but user is '${this.role}'`);
        }
    }
}
exports.User = User;
