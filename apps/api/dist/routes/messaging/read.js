"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const db_1 = require("../../db");
const ws_1 = require("../../ws");
const router = (0, express_1.Router)({ mergeParams: true });
// PUT /api/tenants/:tenantId/messaging/:messageId/read
router.put('/:messageId/read', auth_1.requireAuth, async (req, res) => {
    const { tenantId, messageId } = req.params;
    const auth = req.auth;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (!prisma)
        return res.status(500).json({ error: 'Tenant DB not available' });
    try {
        const msg = await prisma.message.update({ where: { id: messageId }, data: { read: true, readAt: new Date() } });
        // Broadcast read receipt
        const io = (0, ws_1.getIO)();
        if (io) {
            io.to(`tenant:${tenantId}`).emit('messaging:read', { messageId: msg.id, readAt: msg.readAt });
        }
        // Audit best-effort
        try {
            await prisma.messagingAuditLog.create({ data: { tenantId, userId: auth.sub, action: 'message.read', entityType: 'message', entityId: messageId, createdAt: new Date() } });
        }
        catch { }
        return res.json({ ok: true });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to mark as read' });
    }
});
exports.default = router;
