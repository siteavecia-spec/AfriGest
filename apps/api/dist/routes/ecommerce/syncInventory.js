"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const stockService_1 = require("../../services/ecommerce/stockService");
const router = (0, express_1.Router)({ mergeParams: true });
// POST /api/tenants/:tenantId/ecommerce/sync-inventory
// Idempotent endpoint to apply stock deltas from storefront or external systems
const payloadSchema = zod_1.z.object({
    changes: zod_1.z.array(zod_1.z.object({ sku: zod_1.z.string(), delta: zod_1.z.number().int(), reason: zod_1.z.string().optional() }))
});
router.post('/', auth_1.requireAuth, async (req, res) => {
    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const { tenantId } = req.params;
    // Phase 1: in-memory shared stock (boutiqueId='bq-1')
    const { applied, failed } = (0, stockService_1.applyInventoryDeltas)(tenantId, parsed.data.changes);
    return res.json({ ok: true, tenantId, applied, failed });
});
exports.default = router;
