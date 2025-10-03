"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const authorization_1 = require("../middleware/authorization");
const db_1 = require("../db");
const memory_1 = require("../stores/memory");
const audit_1 = require("../services/audit");
const notify_1 = require("../services/notify");
const router = (0, express_1.Router)();
// GET /transfers
router.get('/', auth_1.requireAuth, (0, authorization_1.requirePermission)('stock', 'read'), async (req, res) => {
    const rows = memory_1.transfers.slice().reverse();
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'transfers.read', resource: 'transfers', meta: { count: rows.length } });
    }
    catch { }
    return res.json(rows);
});
// POST /transfers — create transfer draft
const createSchema = zod_1.z.object({
    sourceBoutiqueId: zod_1.z.string().min(1),
    destBoutiqueId: zod_1.z.string().min(1),
    reference: zod_1.z.string().optional(),
    items: zod_1.z.array(zod_1.z.object({ productId: zod_1.z.string().min(1), quantity: zod_1.z.number().int().positive() })).min(1)
});
router.post('/', auth_1.requireAuth, (0, authorization_1.requirePermission)('stock', 'create'), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const id = 'tr-' + Date.now();
    const token = id + '-' + Math.floor(Math.random() * 1e6);
    const t = {
        id,
        sourceBoutiqueId: parsed.data.sourceBoutiqueId,
        destBoutiqueId: parsed.data.destBoutiqueId,
        reference: parsed.data.reference,
        items: parsed.data.items,
        status: 'created',
        token,
        createdAt: new Date().toISOString(),
    };
    memory_1.transfers.push(t);
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'transfers.create', resource: t.id, meta: { source: t.sourceBoutiqueId, dest: t.destBoutiqueId, items: t.items.length } });
    }
    catch { }
    return res.status(201).json({ id: t.id, status: t.status, token: t.token });
});
// POST /transfers/:id/send — mark in_transit and decrement source stock
router.post('/:id/send', auth_1.requireAuth, (0, authorization_1.requirePermission)('stock', 'update'), async (req, res) => {
    const { id } = req.params;
    const t = memory_1.transfers.find(x => x.id === id);
    if (!t)
        return res.status(404).json({ error: 'Not found' });
    if (t.status !== 'created')
        return res.status(400).json({ error: 'Invalid status' });
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    try {
        if (prisma?.stock) {
            await prisma.$transaction(async (tx) => {
                for (const it of t.items) {
                    const existing = await tx.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId: t.sourceBoutiqueId, productId: it.productId } } });
                    const qty = Number(existing?.quantity || 0);
                    if (qty < it.quantity)
                        throw new Error('Insufficient stock at source');
                    await tx.stock.update({ where: { boutiqueId_productId: { boutiqueId: t.sourceBoutiqueId, productId: it.productId } }, data: { quantity: (qty - it.quantity) } });
                }
            });
        }
        else {
            for (const it of t.items)
                (0, memory_1.upsertStock)(t.sourceBoutiqueId, it.productId, -it.quantity);
        }
        t.status = 'in_transit';
        t.sentAt = new Date().toISOString();
        try {
            await (0, notify_1.notifyEvent)('[AfriGest] Transfert envoyé', `Transfert ${t.id} envoyé: ${t.sourceBoutiqueId} -> ${t.destBoutiqueId}\nRef: ${t.reference || '-'}\nItems: ${t.items.map(i => i.productId + ':' + i.quantity).join(', ')}`);
        }
        catch { }
        try {
            await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'transfers.send', resource: t.id });
        }
        catch { }
        return res.json({ ok: true, id: t.id, status: t.status });
    }
    catch (e) {
        return res.status(400).json({ error: e?.message || 'Failed to send transfer' });
    }
});
// POST /transfers/:id/receive — increment destination stock
router.post('/:id/receive', auth_1.requireAuth, (0, authorization_1.requirePermission)('stock', 'update'), async (req, res) => {
    const { id } = req.params;
    const t = memory_1.transfers.find(x => x.id === id);
    if (!t)
        return res.status(404).json({ error: 'Not found' });
    if (t.status !== 'in_transit')
        return res.status(400).json({ error: 'Invalid status' });
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    try {
        if (prisma?.stock) {
            await prisma.$transaction(async (tx) => {
                for (const it of t.items) {
                    const existing = await tx.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId: t.destBoutiqueId, productId: it.productId } } });
                    if (existing)
                        await tx.stock.update({ where: { boutiqueId_productId: { boutiqueId: t.destBoutiqueId, productId: it.productId } }, data: { quantity: (Number(existing.quantity) + it.quantity) } });
                    else
                        await tx.stock.create({ data: { boutiqueId: t.destBoutiqueId, productId: it.productId, quantity: it.quantity } });
                }
            });
        }
        else {
            for (const it of t.items)
                (0, memory_1.upsertStock)(t.destBoutiqueId, it.productId, it.quantity);
        }
        t.status = 'received';
        t.receivedAt = new Date().toISOString();
        try {
            await (0, notify_1.notifyEvent)('[AfriGest] Transfert reçu', `Transfert ${t.id} reçu par ${t.destBoutiqueId}\nRef: ${t.reference || '-'}\nItems: ${t.items.map(i => i.productId + ':' + i.quantity).join(', ')}`);
        }
        catch { }
        try {
            await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'transfers.receive', resource: t.id });
        }
        catch { }
        return res.json({ ok: true, id: t.id, status: t.status });
    }
    catch (e) {
        return res.status(400).json({ error: e?.message || 'Failed to receive transfer' });
    }
});
exports.default = router;
