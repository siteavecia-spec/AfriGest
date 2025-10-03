"use strict";
// Minimal audit log utility with optional Prisma persistence.
// Usage example:
//   await audit({ userId, tenantId, action: 'update', resource: 'stock', meta: { sku, qty } })
//   await auditReq(req, { userId, action: 'user.update', resource: userId, meta: {...} })
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.audit = audit;
exports.auditReq = auditReq;
async function audit(entry) {
    try {
        const payload = {
            ...entry,
            at: entry.at || new Date().toISOString(),
        };
        // For now, console; replace with DB insert or external log pipeline
        // eslint-disable-next-line no-console
        console.info('[AUDIT]', JSON.stringify(payload));
    }
    catch {
        // ignore
    }
}
// Persist audit to tenant DB if Prisma is available; fallback to console
async function auditReq(req, entry) {
    try {
        const at = entry.at || new Date().toISOString();
        const prisma = await (async () => {
            try {
                const { getTenantClientFromReq } = await Promise.resolve().then(() => __importStar(require('../db')));
                return getTenantClientFromReq(req);
            }
            catch {
                return null;
            }
        })();
        if (prisma && prisma.auditLog) {
            const ip = (req.headers?.['x-forwarded-for'] || req.ip || '').toString();
            await prisma.auditLog.create({ data: {
                    actorId: entry.userId || req?.auth?.sub || null,
                    role: req?.auth?.role || null,
                    action: entry.action,
                    resourceId: entry.resource,
                    metadata: { ...(entry.meta || {}), module: entry.meta?.module },
                    ip,
                    at
                } });
            return;
        }
    }
    catch {
        // fall through to console
    }
    return audit(entry);
}
