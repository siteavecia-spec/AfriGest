"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const authorization_1 = require("../../middleware/authorization");
const db_1 = require("../../db");
const conversationService_1 = require("../../services/messaging/conversationService");
const router = (0, express_1.Router)({ mergeParams: true });
// GET /api/tenants/:tenantId/messaging/conversations
router.get('/', auth_1.requireAuth, (0, authorization_1.requirePermission)('messaging', 'read'), async (req, res) => {
    const { tenantId } = req.params;
    const auth = req.auth;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (!prisma)
        return res.status(500).json({ error: 'Tenant DB not available' });
    try {
        const items = await (0, conversationService_1.listConversations)(prisma, tenantId, auth.sub);
        return res.json({ items, tenantId });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to list conversations' });
    }
});
exports.default = router;
