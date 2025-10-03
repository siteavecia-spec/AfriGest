"use strict";
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
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const authorization_1 = require("../middleware/authorization");
const memory_1 = require("../stores/memory");
const db_1 = require("../db");
const svc = __importStar(require("../services/suppliers"));
const audit_1 = require("../services/audit");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, (0, authorization_1.requirePermission)('suppliers', 'read'), async (req, res) => {
    const limitRaw = (req.query.limit || '').toString();
    const offsetRaw = (req.query.offset || '').toString();
    const limit = limitRaw ? Math.max(1, Math.min(200, Number(limitRaw))) : undefined;
    const offset = offsetRaw ? Math.max(0, Number(offsetRaw)) : undefined;
    const rows = await svc.listSuppliers(req, { limit, offset });
    try {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            const total = await prisma.supplier.count();
            res.setHeader('X-Total-Count', String(total));
        }
        else {
            res.setHeader('X-Total-Count', String(memory_1.suppliers.length));
        }
    }
    catch {
        res.setHeader('X-Total-Count', String(memory_1.suppliers.length));
    }
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'suppliers.read', resource: 'suppliers', meta: { limit, offset } });
    }
    catch { }
    res.json(rows);
});
const createSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    contactName: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    address: zod_1.z.string().optional()
});
router.post('/', auth_1.requireAuth, (0, authorization_1.requirePermission)('suppliers', 'create'), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const created = await svc.createSupplier(req, parsed.data);
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'supplier.create', resource: created.id, meta: { name: created.name } });
    }
    catch { }
    res.status(201).json(created);
});
// Update supplier
const updateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    contactName: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    address: zod_1.z.string().optional()
});
router.put('/:id', auth_1.requireAuth, (0, authorization_1.requirePermission)('suppliers', 'update'), async (req, res) => {
    const { id } = req.params;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const updated = await svc.updateSupplier(req, id, parsed.data);
    if (!updated)
        return res.status(404).json({ error: 'Supplier not found' });
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'supplier.update', resource: id, meta: parsed.data });
    }
    catch { }
    return res.json(updated);
});
// Delete supplier
router.delete('/:id', auth_1.requireAuth, (0, authorization_1.requirePermission)('suppliers', 'delete'), async (req, res) => {
    const { id } = req.params;
    const ok = await svc.deleteSupplier(req, id);
    if (!ok)
        return res.status(404).json({ error: 'Supplier not found' });
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'supplier.delete', resource: id });
    }
    catch { }
    return res.status(204).send();
});
exports.default = router;
