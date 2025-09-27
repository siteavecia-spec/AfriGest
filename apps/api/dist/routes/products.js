"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const memory_1 = require("../stores/memory");
const products_1 = require("../services/products");
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, async (req, res) => {
    const limitRaw = (req.query.limit || '').toString();
    const offsetRaw = (req.query.offset || '').toString();
    const limit = limitRaw ? Math.max(1, Math.min(200, Number(limitRaw))) : undefined;
    const offset = offsetRaw ? Math.max(0, Number(offsetRaw)) : undefined;
    const rows = await (0, products_1.listProducts)(req, { limit, offset });
    // X-Total-Count header
    try {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            const total = await prisma.product.count();
            res.setHeader('X-Total-Count', String(total));
        }
        else {
            res.setHeader('X-Total-Count', String(memory_1.products.length));
        }
    }
    catch {
        res.setHeader('X-Total-Count', String(memory_1.products.length));
    }
    return res.json(rows);
});
const createSchema = zod_1.z.object({
    sku: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    price: zod_1.z.number().nonnegative(),
    cost: zod_1.z.number().nonnegative(),
    barcode: zod_1.z.string().optional(),
    taxRate: zod_1.z.number().min(0).max(100).optional(),
    sector: zod_1.z.string().optional(),
    attrs: zod_1.z.record(zod_1.z.any()).optional()
});
router.post('/', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const created = await (0, products_1.createProduct)(req, parsed.data);
    return res.status(201).json(created);
});
// Sector templates for multi-sector product attributes
router.get('/templates', auth_1.requireAuth, (_req, res) => {
    res.json(memory_1.sectorTemplates);
});
exports.default = router;
