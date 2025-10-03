"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const db_1 = require("../db");
const memory_1 = require("../stores/memory");
const router = (0, express_1.Router)();
// GET /boutiques
router.get('/', auth_1.requireAuth, async (req, res) => {
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (prisma?.boutique) {
        try {
            const rows = await prisma.boutique.findMany({ orderBy: { name: 'asc' } });
            return res.json(rows);
        }
        catch { }
    }
    return res.json(memory_1.boutiques);
});
// POST /boutiques
const createSchema = zod_1.z.object({ name: zod_1.z.string().min(1), code: zod_1.z.string().min(1), address: zod_1.z.string().optional(), city: zod_1.z.string().optional(), country: zod_1.z.string().optional() });
router.post('/', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg'), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (prisma?.boutique) {
        try {
            const created = await prisma.boutique.create({ data: parsed.data });
            return res.status(201).json(created);
        }
        catch (e) {
            return res.status(500).json({ error: e?.message || 'Failed to create boutique' });
        }
    }
    // memory fallback: push into memory, generate id
    const id = 'bq-' + Date.now();
    const row = { id, name: parsed.data.name, code: parsed.data.code, address: parsed.data.address, city: parsed.data.city, country: parsed.data.country };
    memory_1.boutiques.push(row);
    return res.status(201).json(row);
});
exports.default = router;
