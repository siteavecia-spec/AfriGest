"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const tenant_1 = require("../db/tenant");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
// Helpers
function prismaFrom(req) {
    const dbUrl = req.tenantDbUrl || env_1.env.TENANT_DATABASE_URL;
    return (0, tenant_1.getTenantPrisma)(dbUrl);
}
// GET /users?query=&limit=&offset=
router.get('/', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), async (req, res) => {
    const q = (req.query.query || '').toString().trim();
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const prisma = prismaFrom(req);
    const where = q
        ? {
            OR: [
                { email: { contains: q, mode: 'insensitive' } },
                { fullName: { contains: q, mode: 'insensitive' } }
            ]
        }
        : {};
    const [items, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: { id: true, email: true, fullName: true, role: true, status: true, lastLoginAt: true },
            orderBy: { email: 'asc' },
            take: limit,
            skip: offset
        }),
        prisma.user.count({ where })
    ]);
    res.json({ items, total, limit, offset });
});
// GET /users/:id
router.get('/:id', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), async (req, res) => {
    const prisma = prismaFrom(req);
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user)
        return res.status(404).json({ error: 'Not found' });
    const { passwordHash, ...safe } = user;
    res.json(safe);
});
const createSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    fullName: zod_1.z.string().min(1),
    role: zod_1.z.enum(['super_admin', 'pdg', 'dg', 'employee']).default('employee')
});
// POST /users
router.post('/', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const { email, password, fullName, role } = parsed.data;
    const prisma = prismaFrom(req);
    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists)
        return res.status(409).json({ error: 'Email already exists' });
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const created = await prisma.user.create({
        data: { email: email.toLowerCase(), passwordHash, fullName, role: role, status: 'active' },
        select: { id: true, email: true, fullName: true, role: true, status: true }
    });
    // Best-effort audit
    try {
        const actor = req.auth;
        await prisma.auditLog.create({ data: {
                actorId: actor?.sub,
                role: actor?.role,
                action: 'user.create',
                resourceId: created.id,
                metadata: { email: created.email, role: created.role },
                ip: (req.headers['x-forwarded-for'] || req.ip || '').toString()
            } });
    }
    catch { }
    res.status(201).json(created);
});
const updateSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1).optional(),
    role: zod_1.z.enum(['super_admin', 'pdg', 'dg', 'employee']).optional(),
    status: zod_1.z.enum(['active', 'disabled']).optional(),
    password: zod_1.z.string().min(8).optional()
});
// PATCH /users/:id
router.patch('/:id', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const prisma = prismaFrom(req);
    const data = {};
    if (parsed.data.fullName !== undefined)
        data.fullName = parsed.data.fullName;
    if (parsed.data.role !== undefined)
        data.role = parsed.data.role;
    if (parsed.data.status !== undefined)
        data.status = parsed.data.status;
    if (parsed.data.password)
        data.passwordHash = await bcryptjs_1.default.hash(parsed.data.password, 10);
    try {
        const updated = await prisma.user.update({ where: { id: req.params.id }, data, select: { id: true, email: true, fullName: true, role: true, status: true } });
        // Audit
        try {
            const actor = req.auth;
            await prisma.auditLog.create({ data: {
                    actorId: actor?.sub,
                    role: actor?.role,
                    action: 'user.update',
                    resourceId: updated.id,
                    metadata: data,
                    ip: (req.headers['x-forwarded-for'] || req.ip || '').toString()
                } });
        }
        catch { }
        res.json(updated);
    }
    catch {
        res.status(404).json({ error: 'Not found' });
    }
});
// DELETE /users/:id  (soft delete -> status = disabled)
router.delete('/:id', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), async (req, res) => {
    const prisma = prismaFrom(req);
    try {
        const updated = await prisma.user.update({ where: { id: req.params.id }, data: { status: 'disabled' }, select: { id: true, email: true, status: true } });
        try {
            const actor = req.auth;
            await prisma.auditLog.create({ data: {
                    actorId: actor?.sub,
                    role: actor?.role,
                    action: 'user.deactivate',
                    resourceId: updated.id,
                    metadata: { email: updated.email },
                    ip: (req.headers['x-forwarded-for'] || req.ip || '').toString()
                } });
        }
        catch { }
        res.json({ ok: true });
    }
    catch {
        res.status(404).json({ error: 'Not found' });
    }
});
exports.default = router;
