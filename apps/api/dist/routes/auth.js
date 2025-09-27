"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const tokens_1 = require("../services/tokens");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const tenant_1 = require("../db/tenant");
const env_1 = require("../config/env");
const crypto_1 = __importDefault(require("crypto"));
const notify_1 = require("../services/notify");
const router = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(4),
    company: zod_1.z.string().min(1)
});
router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const { email, password, company } = parsed.data;
    // Resolve tenant DB URL (MVP: support demo tenant)
    const headerDbUrl = req.tenantDbUrl;
    const dbUrl = headerDbUrl || (company.toLowerCase() === 'demo' ? env_1.env.TENANT_DATABASE_URL : undefined);
    if (!dbUrl)
        return res.status(400).json({ error: 'Unknown company/tenant' });
    try {
        const prisma = (0, tenant_1.getTenantPrisma)(dbUrl);
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user)
            return res.status(401).json({ error: 'Invalid credentials' });
        if (user.status && user.status !== 'active')
            return res.status(403).json({ error: 'User disabled' });
        const ok = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!ok)
            return res.status(401).json({ error: 'Invalid credentials' });
        // Update last login (best-effort)
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => { });
        const role = user.role;
        const accessToken = (0, tokens_1.signAccessToken)(user.id, role);
        const refreshToken = (0, tokens_1.signRefreshToken)(user.id, role);
        // Create refresh session (30 days)
        const ua = (req.headers['user-agent'] || '').toString();
        const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await prisma.refreshSession.create({ data: { userId: user.id, refreshToken, userAgent: ua, ip, expiresAt } });
        return res.json({ accessToken, refreshToken, role });
    }
    catch (e) {
        return res.status(500).json({ error: 'Login failed' });
    }
});
const refreshSchema = zod_1.z.object({ refreshToken: zod_1.z.string().min(10) });
router.post('/refresh', async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    try {
        const token = parsed.data.refreshToken;
        const payload = (0, tokens_1.verifyRefreshToken)(token);
        // Check session in tenant DB
        const dbUrl = req.tenantDbUrl || env_1.env.TENANT_DATABASE_URL;
        const prisma = (0, tenant_1.getTenantPrisma)(dbUrl);
        const session = await prisma.refreshSession.findUnique({ where: { refreshToken: token } });
        if (!session || session.revokedAt)
            return res.status(401).json({ error: 'Invalid refresh token' });
        if (session.expiresAt.getTime() < Date.now())
            return res.status(401).json({ error: 'Refresh token expired' });
        // Rotate: revoke old and issue new
        const newAccess = (0, tokens_1.signAccessToken)(payload.sub, payload.role);
        const newRefresh = (0, tokens_1.signRefreshToken)(payload.sub, payload.role);
        const ua = (req.headers['user-agent'] || '').toString();
        const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await prisma.$transaction([
            prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } }),
            prisma.refreshSession.create({ data: { userId: payload.sub, refreshToken: newRefresh, userAgent: ua, ip, expiresAt } })
        ]);
        return res.json({ accessToken: newAccess, refreshToken: newRefresh });
    }
    catch (e) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }
});
const logoutSchema = zod_1.z.object({ refreshToken: zod_1.z.string().min(10).optional() });
router.post('/logout', async (req, res) => {
    // Prefer revoking the refresh token if provided; still respond ok if not
    const parsed = logoutSchema.safeParse(req.body || {});
    const token = parsed.success ? parsed.data.refreshToken : undefined;
    if (token) {
        try {
            const dbUrl = req.tenantDbUrl || env_1.env.TENANT_DATABASE_URL;
            const prisma = (0, tenant_1.getTenantPrisma)(dbUrl);
            await prisma.refreshSession.update({ where: { refreshToken: token }, data: { revokedAt: new Date() } });
        }
        catch { }
    }
    return res.json({ ok: true });
});
// Admin-only register, with bootstrap when tenant has no users yet
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    fullName: zod_1.z.string().min(1),
    role: zod_1.z.enum(['super_admin', 'pdg', 'dg', 'employee']).optional().default('employee'),
    company: zod_1.z.string().min(1)
});
router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const { email, password, fullName, role, company } = parsed.data;
    const dbUrl = req.tenantDbUrl || (company.toLowerCase() === 'demo' ? env_1.env.TENANT_DATABASE_URL : undefined);
    if (!dbUrl)
        return res.status(400).json({ error: 'Unknown company/tenant' });
    try {
        const prisma = (0, tenant_1.getTenantPrisma)(dbUrl);
        const count = await prisma.user.count();
        // Authorization: allow bootstrap if no users exist; otherwise require admin roles from JWT
        let canCreate = false;
        let desiredRole = role;
        if (count === 0) {
            // First user becomes super_admin by default
            desiredRole = 'super_admin';
            canCreate = true;
        }
        else {
            const auth = req.auth;
            if (auth && ['super_admin', 'pdg', 'dg'].includes(auth.role)) {
                canCreate = true;
            }
        }
        if (!canCreate)
            return res.status(403).json({ error: 'Forbidden' });
        const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (exists)
            return res.status(409).json({ error: 'Email already registered' });
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const created = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                passwordHash,
                fullName,
                role: desiredRole,
                status: 'active'
            },
            select: { id: true, email: true, fullName: true, role: true }
        });
        // Create email verification token (24h) and send email
        try {
            const token = crypto_1.default.randomBytes(24).toString('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await prisma.emailVerification.create({ data: { userId: created.id, email: created.email, token, expiresAt } });
            const webUrl = process.env.WEB_URL || 'http://localhost:5173';
            const link = `${webUrl}/verify-email?token=${encodeURIComponent(token)}`;
            await (0, notify_1.sendEmailVerification)(created.email, link);
        }
        catch { }
        return res.status(201).json(created);
    }
    catch (e) {
        return res.status(500).json({ error: 'Registration failed' });
    }
});
// Verify email by token
const verifyQuery = zod_1.z.object({ token: zod_1.z.string().min(10) });
router.get('/verify-email', async (req, res) => {
    const parsed = verifyQuery.safeParse({ token: req.query.token });
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid token' });
    const token = parsed.data.token;
    const dbUrl = req.tenantDbUrl || env_1.env.TENANT_DATABASE_URL;
    const prisma = (0, tenant_1.getTenantPrisma)(dbUrl);
    try {
        const rec = await prisma.emailVerification.findUnique({ where: { token } });
        if (!rec || rec.usedAt)
            return res.status(400).json({ error: 'Invalid token' });
        if (rec.expiresAt.getTime() < Date.now())
            return res.status(400).json({ error: 'Token expired' });
        await prisma.$transaction([
            prisma.emailVerification.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
            prisma.user.update({ where: { id: rec.userId }, data: { emailVerifiedAt: new Date() } })
        ]);
        return res.json({ ok: true });
    }
    catch {
        return res.status(400).json({ error: 'Invalid token' });
    }
});
exports.default = router;
