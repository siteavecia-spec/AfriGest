"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const memory_1 = require("../stores/memory");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// List demo requests (leads) - Super Admin only (MVP)
router.get('/', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin'), (_req, res) => {
    // Most recent first
    const rows = [...memory_1.demoRequests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(rows);
});
exports.default = router;
const patchSchema = zod_1.z.object({
    contacted: zod_1.z.boolean().optional(),
    notes: zod_1.z.string().optional()
});
// Update a lead
router.patch('/:id', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin'), (req, res) => {
    const { id } = req.params;
    const idx = memory_1.demoRequests.findIndex(d => d.id === id);
    if (idx === -1)
        return res.status(404).json({ error: 'Lead not found' });
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const prev = memory_1.demoRequests[idx];
    const next = { ...prev, ...parsed.data };
    // Timestamps
    next.updatedAt = new Date().toISOString();
    const operator = (req.headers['x-user-name'] || '').toString().trim() || 'Operator';
    next.updatedBy = operator;
    if (typeof parsed.data.contacted === 'boolean') {
        if (parsed.data.contacted && !prev.contacted)
            next.contactedAt = new Date().toISOString();
        if (!parsed.data.contacted)
            next.contactedAt = undefined;
    }
    memory_1.demoRequests[idx] = next;
    return res.json(memory_1.demoRequests[idx]);
});
