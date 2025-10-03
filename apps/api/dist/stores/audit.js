"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditEvents = void 0;
exports.pushAudit = pushAudit;
exports.auditEvents = [];
function pushAudit(e) {
    exports.auditEvents.push(e);
    // Trim to last 10k events to avoid unbounded growth
    if (exports.auditEvents.length > 10000)
        exports.auditEvents.splice(0, exports.auditEvents.length - 10000);
}
