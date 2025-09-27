"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const memory_1 = require("../stores/memory");
const notify_1 = require("../services/notify");
const router = (0, express_1.Router)();
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || 'dev-reset-secret';
const WEB_URL = process.env.WEB_URL || 'http://localhost:5173';
const forceSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    tenant_id: zod_1.z.string().optional(),
    reason: zod_1.z.string().min(5)
});
router.post('/force-password-reset', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin'), async (req, res) => {
    const parsed = forceSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const { email, reason } = parsed.data;
    const now = new Date();
    const id = `prr-force-${now.getTime()}`;
    const token = jsonwebtoken_1.default.sign({ sub: email, type: 'password_reset' }, RESET_TOKEN_SECRET, { expiresIn: '15m', issuer: 'afrigest' });
    const reqObj = {
        id,
        userEmail: email,
        resetMethod: 'email',
        resetToken: token,
        used: false,
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
        ip: (req.ip || '').toString(),
        userAgent: (req.headers['user-agent'] || '').toString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
    };
    memory_1.passwordResetRequests.push(reqObj);
    const resetLink = `${WEB_URL}/reset-password?token=${encodeURIComponent(token)}`;
    try {
        await (0, notify_1.notifyNewLead)({
            id,
            name: email,
            company: 'Force Password Reset',
            email,
            createdAt: now.toISOString(),
            message: `Un administrateur a initié une réinitialisation: ${reason}\n\nLien: ${resetLink}`
        });
    }
    catch { }
    return res.json({ ok: true });
});
exports.default = router;
