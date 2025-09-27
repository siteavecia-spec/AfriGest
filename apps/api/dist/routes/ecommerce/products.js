"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const db_1 = require("../../db");
const catalogService_1 = require("../../services/ecommerce/catalogService");
const router = (0, express_1.Router)({ mergeParams: true });
// GET /api/tenants/:tenantId/ecommerce/products
router.get('/', auth_1.requireAuth, async (req, res) => {
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (!prisma)
        return res.json({ items: [], tenantId });
    try {
        const items = await (0, catalogService_1.listEcommerceProducts)(prisma, tenantId);
        return res.json({ items, tenantId });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to load ecommerce products' });
    }
});
// POST /api/tenants/:tenantId/ecommerce/products
const upsertSchema = zod_1.z.object({
    sku: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    price: zod_1.z.number().nonnegative(),
    currency: zod_1.z.string().default('GNF'),
    images: zod_1.z.array(zod_1.z.string().url()).optional().default([]),
    variants: zod_1.z.array(zod_1.z.record(zod_1.z.any())).optional().default([]),
    isOnlineAvailable: zod_1.z.boolean().default(true),
    onlineStockMode: zod_1.z.enum(['shared', 'dedicated']).default('shared'),
    onlineStockQty: zod_1.z.number().int().nonnegative().optional()
});
router.post('/', auth_1.requireAuth, async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    // TODO: create or update product in catalog for tenantId
    return res.status(201).json({ ok: true, tenantId });
});
// PATCH /api/tenants/:tenantId/ecommerce/products/:sku
router.patch('/:sku', auth_1.requireAuth, async (req, res) => {
    const { sku } = req.params;
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    // TODO: update fields
    return res.json({ ok: true, sku, tenantId });
});
// DELETE /api/tenants/:tenantId/ecommerce/products/:sku
router.delete('/:sku', auth_1.requireAuth, async (req, res) => {
    const { sku } = req.params;
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    // TODO: soft-delete or mark offline
    return res.json({ ok: true, sku, tenantId });
});
exports.default = router;
