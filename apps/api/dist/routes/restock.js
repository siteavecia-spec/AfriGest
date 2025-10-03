"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const authorization_1 = require("../middleware/authorization");
const memory_1 = require("../stores/memory");
const notify_1 = require("../services/notify");
const audit_1 = require("../services/audit");
const router = (0, express_1.Router)();
// GET /restock
router.get('/', auth_1.requireAuth, (0, authorization_1.requirePermission)('purchase_orders', 'read'), async (req, res) => {
    const rows = memory_1.restockRequests.slice().reverse();
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'restock.read', resource: 'restock', meta: { count: rows.length } });
    }
    catch { }
    return res.json(rows);
});
// POST /restock
const createSchema = zod_1.z.object({ boutiqueId: zod_1.z.string().min(1), productId: zod_1.z.string().min(1), quantity: zod_1.z.number().int().positive() });
router.post('/', auth_1.requireAuth, (0, authorization_1.requirePermission)('purchase_orders', 'create'), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const id = 'rr-' + Date.now();
    const row = { id, ...parsed.data, status: 'pending', createdAt: new Date().toISOString() };
    memory_1.restockRequests.push(row);
    try {
        await (0, notify_1.notifyEvent)('[AfriGest] Demande de réappro', `Demande ${row.id} — Boutique: ${row.boutiqueId} — Produit: ${row.productId} — Qté: ${row.quantity}`);
    }
    catch { }
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'restock.create', resource: row.id, meta: { boutiqueId: row.boutiqueId, productId: row.productId, quantity: row.quantity } });
    }
    catch { }
    return res.status(201).json({ id, status: row.status });
});
exports.default = router;
// PATCH /restock/:id/approve
router.patch('/:id/approve', auth_1.requireAuth, (0, authorization_1.requirePermission)('purchase_orders', 'status_change'), async (req, res) => {
    const { id } = req.params;
    const row = memory_1.restockRequests.find(r => r.id === id);
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    if (row.status !== 'pending')
        return res.status(400).json({ error: 'Not pending' });
    row.status = 'approved';
    try {
        await (0, notify_1.notifyEvent)('[AfriGest] Réappro approuvé', `Demande ${row.id} approuvée — Boutique: ${row.boutiqueId} — Produit: ${row.productId} — Qté: ${row.quantity}`);
    }
    catch { }
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'restock.approve', resource: row.id });
    }
    catch { }
    return res.json({ id: row.id, status: row.status });
});
// PATCH /restock/:id/reject
router.patch('/:id/reject', auth_1.requireAuth, (0, authorization_1.requirePermission)('purchase_orders', 'status_change'), async (req, res) => {
    const { id } = req.params;
    const row = memory_1.restockRequests.find(r => r.id === id);
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    if (row.status !== 'pending')
        return res.status(400).json({ error: 'Not pending' });
    row.status = 'rejected';
    try {
        await (0, notify_1.notifyEvent)('[AfriGest] Réappro rejeté', `Demande ${row.id} rejetée — Boutique: ${row.boutiqueId} — Produit: ${row.productId} — Qté: ${row.quantity}`);
    }
    catch { }
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'restock.reject', resource: row.id });
    }
    catch { }
    return res.json({ id: row.id, status: row.status });
});
// PATCH /restock/:id/fulfill
router.patch('/:id/fulfill', auth_1.requireAuth, (0, authorization_1.requirePermission)('purchase_orders', 'status_change'), async (req, res) => {
    const { id } = req.params;
    const row = memory_1.restockRequests.find(r => r.id === id);
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    if (row.status !== 'approved')
        return res.status(400).json({ error: 'Must be approved first' });
    row.status = 'fulfilled';
    try {
        await (0, notify_1.notifyEvent)('[AfriGest] Réappro livré', `Demande ${row.id} livrée — Boutique: ${row.boutiqueId} — Produit: ${row.productId} — Qté: ${row.quantity}`);
    }
    catch { }
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'restock.fulfill', resource: row.id });
    }
    catch { }
    return res.json({ id: row.id, status: row.status });
});
