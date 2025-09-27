"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantResolver = tenantResolver;
const env_1 = require("../config/env");
// For MVP: read tenant key from header 'x-company' or query 'company'
function tenantResolver(req, _res, next) {
    const key = (req.headers['x-company'] || req.query.company || '').toString();
    req.tenantKey = key || null;
    // Attach a tenant DB URL for the demo flow; later we will resolve from master DB
    if (key && key.toLowerCase() === 'demo') {
        ;
        req.tenantDbUrl = env_1.env.TENANT_DATABASE_URL;
    }
    next();
}
