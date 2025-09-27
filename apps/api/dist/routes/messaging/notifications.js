"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const db_1 = require("../../db");
const router = (0, express_1.Router)({ mergeParams: true });
// GET /api/tenants/:tenantId/notifications
router.get('/', auth_1.requireAuth, async (req, res) => {
    const { tenantId } = req.params;
    const auth = req.auth;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (!prisma)
        return res.status(500).json({ error: 'Tenant DB not available' });
    try {
        const items = await prisma.notification.findMany({
            where: { userId: auth.sub },
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
            take: 200
        });
        return res.json({ items, tenantId });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to list notifications' });
    }
});
// PUT /api/tenants/:tenantId/notifications/:notificationId/read
router.put('/:notificationId/read', auth_1.requireAuth, async (req, res) => {
    const { notificationId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (!prisma)
        return res.status(500).json({ error: 'Tenant DB not available' });
    try {
        await prisma.notification.update({ where: { id: notificationId }, data: { status: 'read' } });
        return res.json({ ok: true });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to mark as read' });
    }
});
exports.default = router;
