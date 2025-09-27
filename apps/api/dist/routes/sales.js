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
const rbac_1 = require("../middleware/rbac");
const svc = __importStar(require("../services/sales"));
const memory_1 = require("../stores/memory");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// GET /sales?limit=...
router.get('/', auth_1.requireAuth, async (req, res) => {
    const limit = Math.max(1, Math.min(200, Number((req.query.limit || 50).toString())));
    const rawOffset = Number((req.query.offset || 0).toString());
    const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.max(0, rawOffset) : 0;
    const rows = await svc.listSales(req, limit, offset);
    try {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            const total = await prisma.sale.count();
            res.setHeader('X-Total-Count', String(total));
        }
        else {
            res.setHeader('X-Total-Count', String(memory_1.sales.length));
        }
    }
    catch {
        res.setHeader('X-Total-Count', String(memory_1.sales.length));
    }
    res.json(rows);
});
// GET /sales/summary — simple KPIs for today (in-memory)
router.get('/summary', auth_1.requireAuth, async (req, res) => {
    const boutiqueId = (req.query.boutiqueId || '').toString() || undefined;
    const out = await svc.getSalesSummary(req, boutiqueId);
    return res.json(out);
});
const createSchema = zod_1.z.object({
    boutiqueId: zod_1.z.string().min(1),
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.string().min(1),
        quantity: zod_1.z.number().int().positive(),
        unitPrice: zod_1.z.number().nonnegative(),
        discount: zod_1.z.number().nonnegative().optional()
    })).min(1).max(100),
    paymentMethod: zod_1.z.enum(['cash', 'mobile_money', 'card']),
    currency: zod_1.z.enum(['GNF']).default('GNF'),
    offlineId: zod_1.z.string().max(120).optional()
});
// POST /sales (supports offlineId for idempotency)
router.post('/', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg', 'employee'), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    try {
        const created = await svc.createSale(req, {
            boutiqueId: parsed.data.boutiqueId,
            items: parsed.data.items,
            paymentMethod: parsed.data.paymentMethod,
            currency: parsed.data.currency,
            offlineId: parsed.data.offlineId || null
        });
        return res.status(201).json(created);
    }
    catch (e) {
        return res.status(400).json({ error: e?.message || 'Failed to create sale' });
    }
});
exports.default = router;
