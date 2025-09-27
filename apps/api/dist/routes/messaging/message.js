"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const db_1 = require("../../db");
const messageService_1 = require("../../services/messaging/messageService");
const ws_1 = require("../../ws");
const router = (0, express_1.Router)({ mergeParams: true });
// POST /api/tenants/:tenantId/messaging/message
router.post('/', auth_1.requireAuth, async (req, res) => {
    const { tenantId } = req.params;
    const auth = req.auth;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (!prisma)
        return res.status(500).json({ error: 'Tenant DB not available' });
    const { toUserId, content, related } = req.body || {};
    if (!toUserId || !content)
        return res.status(400).json({ error: 'Missing toUserId or content' });
    try {
        // Permissions matrix (MVP): employee cannot initiate to PDG
        if (auth.role === 'employee') {
            try {
                const target = await prisma.user.findUnique({ where: { id: toUserId }, select: { role: true } });
                if (target?.role === 'pdg') {
                    try {
                        await prisma.messagingAuditLog.create({ data: { tenantId, userId: auth.sub, action: 'forbidden_attempt', entityType: 'message', entityId: null, details: { toUserId, reason: 'employee_to_pdg' }, createdAt: new Date() } });
                    }
                    catch { }
                    return res.status(403).json({ error: 'Forbidden: employees cannot initiate to PDG' });
                }
            }
            catch { }
        }
        const { message } = await (0, messageService_1.sendMessage)(prisma, { tenantId, fromUserId: auth.sub, toUserId, content, related });
        // Broadcast WS
        const io = (0, ws_1.getIO)();
        if (io) {
            io.to(`user:${toUserId}`).emit('messaging:new', { conversationId: message.conversationId, message });
            io.to(`user:${auth.sub}`).emit('messaging:new', { conversationId: message.conversationId, message });
        }
        return res.status(201).json({ ok: true, message });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to send message' });
    }
});
exports.default = router;
