"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const db_1 = require("../../db");
const router = (0, express_1.Router)({ mergeParams: true });
// GET /api/tenants/:tenantId/messaging/conversation/:userId
// Returns recent messages (desc) between auth user and :userId
router.get('/:userId', auth_1.requireAuth, async (req, res) => {
    const { tenantId, userId } = req.params;
    const auth = req.auth;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (!prisma)
        return res.status(500).json({ error: 'Tenant DB not available' });
    try {
        const [a, b] = [auth.sub, userId].sort();
        const convo = await prisma.conversation.findFirst({ where: { tenantId, userOneId: a, userTwoId: b } });
        if (!convo)
            return res.json({ items: [], conversationId: null, tenantId });
        const limit = Math.min(100, Number(req.query.limit || '50'));
        const before = req.query.before ? new Date(String(req.query.before)) : undefined;
        const messages = await prisma.message.findMany({
            where: { conversationId: convo.id, ...(before ? { createdAt: { lt: before } } : {}) },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
        return res.json({ items: messages, conversationId: convo.id, tenantId });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to fetch conversation' });
    }
});
exports.default = router;
