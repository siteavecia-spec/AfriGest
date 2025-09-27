"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMasterClient = getMasterClient;
exports.getTenantClientFromReq = getTenantClientFromReq;
const master_1 = require("./master");
const tenant_1 = require("./tenant");
function getMasterClient() {
    return (0, master_1.getMasterPrisma)();
}
function getTenantClientFromReq(req) {
    const dbUrl = req.tenantDbUrl;
    if (!dbUrl)
        return null;
    return (0, tenant_1.getTenantPrisma)(dbUrl);
}
