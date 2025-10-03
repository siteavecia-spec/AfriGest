"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const authorization_1 = require("../middleware/authorization");
const db_1 = require("../db");
const audit_1 = require("../services/audit");
const memory_1 = require("../stores/memory");
const router = (0, express_1.Router)();
// GET /inventory/summary?boutiqueId=ID
router.get('/summary', auth_1.requireAuth, (0, authorization_1.requirePermission)('stock', 'read'), async (req, res) => {
    const boutiqueId = String(req.query.boutiqueId || '');
    if (!boutiqueId)
        return res.status(400).json({ error: 'Missing boutiqueId' });
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    try {
        if (prisma?.stock) {
            const rows = await prisma.stock.findMany({ where: { boutiqueId } });
            const payload = { boutiqueId, summary: rows.map((r) => ({ productId: r.productId, quantity: Number(r.quantity) })) };
            try {
                await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'inventory.summary.read', resource: boutiqueId });
            }
            catch { }
            return res.json(payload);
        }
        else {
            // Build summary from in-memory stocks map and mem products list
            const items = [];
            for (const p of memory_1.products) {
                const qty = (0, memory_1.getStock)(boutiqueId, p.id);
                if (qty !== 0)
                    items.push({ productId: p.id, sku: p.sku, name: p.name, quantity: qty });
            }
            // Also include explicit zero for products not yet in stock could be large; keep to existing only
            const payload = { boutiqueId, summary: items };
            try {
                await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'inventory.summary.read', resource: boutiqueId });
            }
            catch { }
            return res.json(payload);
        }
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to get inventory summary' });
    }
});
// POST /inventory/sessions — create an inventory session and compute variance (MVP)
// { boutiqueId, items: [{ productId, counted: number, unitPrice?: number }] }
const createSchema = zod_1.z.object({
    boutiqueId: zod_1.z.string().min(1),
    items: zod_1.z.array(zod_1.z.object({ productId: zod_1.z.string().min(1), counted: zod_1.z.number().finite().min(0), unitPrice: zod_1.z.number().finite().min(0).optional() })).min(1)
});
router.post('/sessions', auth_1.requireAuth, (0, authorization_1.requirePermission)('stock', 'update'), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const { boutiqueId, items } = parsed.data;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    try {
        const results = [];
        if (prisma?.stock) {
            // Read expected from DB; do not mutate stock in MVP
            for (const it of items) {
                const r = await prisma.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId, productId: it.productId } } });
                const expected = Number(r?.quantity || 0);
                const delta = it.counted - expected;
                const valueDelta = it.unitPrice ? delta * it.unitPrice : undefined;
                results.push({ productId: it.productId, expected, counted: it.counted, delta, unitPrice: it.unitPrice, valueDelta });
            }
        }
        else {
            for (const it of items) {
                const expected = memory_1.stocks.get(`${boutiqueId}:${it.productId}`) ?? 0;
                const delta = it.counted - expected;
                const valueDelta = it.unitPrice ? delta * it.unitPrice : undefined;
                results.push({ productId: it.productId, expected, counted: it.counted, delta, unitPrice: it.unitPrice, valueDelta });
            }
        }
        const id = 'inv-' + Date.now();
        const createdAt = new Date().toISOString();
        const payload = { id, boutiqueId, createdAt, items: results, totalDelta: results.reduce((s, r) => s + r.delta, 0), totalValueDelta: results.reduce((s, r) => s + (r.valueDelta || 0), 0) };
        try {
            await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'inventory.session.create', resource: boutiqueId, meta: { items: items.length } });
        }
        catch { }
        return res.status(201).json(payload);
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to create inventory session' });
    }
});
exports.default = router;
