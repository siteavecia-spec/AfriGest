"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const db_1 = require("../../db");
const router = (0, express_1.Router)({ mergeParams: true });
// GET /api/tenants/:tenantId/ecommerce/customers
router.get('/', auth_1.requireAuth, async (req, res) => {
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (prisma?.ecommerceCustomer) {
        const items = await prisma.ecommerceCustomer.findMany({ orderBy: { createdAt: 'desc' } });
        return res.json({ items, tenantId });
    }
    return res.json({ items: [], tenantId });
});
// POST /api/tenants/:tenantId/ecommerce/customers
const createSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    addresses: zod_1.z.array(zod_1.z.object({ line1: zod_1.z.string(), city: zod_1.z.string(), country: zod_1.z.string().default('GN'), postalCode: zod_1.z.string().optional() })).optional().default([])
});
router.post('/', auth_1.requireAuth, async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (prisma?.ecommerceCustomer) {
        const created = await prisma.ecommerceCustomer.create({ data: { email: parsed.data.email, phone: parsed.data.phone, firstName: parsed.data.firstName, lastName: parsed.data.lastName } });
        return res.status(201).json(created);
    }
    return res.status(501).json({ error: 'Customers not available in in-memory mode', tenantId });
});
exports.default = router;
