"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const authorization_1 = require("../middleware/authorization");
const svc = __importStar(require("../services/sales"));
const memory_1 = require("../stores/memory");
const db_1 = require("../db");
const audit_1 = require("../services/audit");
const router = (0, express_1.Router)();
// GET /sales?limit=...
router.get('/', auth_1.requireAuth, (0, authorization_1.requirePermission)('pos', 'read'), async (req, res) => {
    const limit = Math.max(1, Math.min(200, Number((req.query.limit || 50).toString())));
    const rawOffset = Number((req.query.offset || 0).toString());
    const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.max(0, rawOffset) : 0;
    const rows = await svc.listSales(req, limit, offset);
    try {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            const total = await prisma.sale.count();
            res.setHeader('X-Total-Count', String(total));
        }
        else {
            res.setHeader('X-Total-Count', String(memory_1.sales.length));
        }
    }
    catch {
        res.setHeader('X-Total-Count', String(memory_1.sales.length));
    }
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'sales.read', resource: 'sales', meta: { limit, offset } });
    }
    catch { }
    res.json(rows);
});
// GET /sales/summary — simple KPIs for today (in-memory)
router.get('/summary', auth_1.requireAuth, (0, authorization_1.requirePermission)('pos', 'read'), async (req, res) => {
    const boutiqueId = (req.query.boutiqueId || '').toString() || undefined;
    const out = await svc.getSalesSummary(req, boutiqueId);
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'sales.summary.read', resource: boutiqueId || 'all' });
    }
    catch { }
    return res.json(out);
});
// GET /sales/eod?date=YYYY-MM-DD&boutiqueId=ID|all — End-of-day report
router.get('/eod', auth_1.requireAuth, (0, authorization_1.requirePermission)('reports', 'read'), async (req, res) => {
    const dateStr = (req.query.date || '').toString();
    const boutiqueId = (req.query.boutiqueId || '').toString() || undefined;
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr))
        return res.status(400).json({ error: 'Invalid or missing date (YYYY-MM-DD)' });
    const [y, m, d] = dateStr.split('-').map(n => Number(n));
    const start = new Date(y, m - 1, d).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    try {
        let rows;
        if (prisma?.sale) {
            const where = { createdAt: { gte: new Date(start), lt: new Date(end) } };
            if (boutiqueId && boutiqueId !== 'all')
                where.boutiqueId = boutiqueId;
            const found = await prisma.sale.findMany({ where, include: { items: true } });
            rows = (found || []).map((s) => ({ id: s.id, boutiqueId: s.boutiqueId, createdAt: s.createdAt?.toISOString?.() || s.createdAt, paymentMethod: s.paymentMethod, currency: s.currency, total: Number(s.total), items: (s.items || []).map((it) => ({ productId: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), discount: Number(it.discount || 0) })) }));
        }
        else {
            rows = (memory_1.sales || []).filter((r) => {
                const t = new Date(r.createdAt).getTime();
                return t >= start && t < end && (!boutiqueId || boutiqueId === 'all' || r.boutiqueId === boutiqueId);
            }).map((r) => ({ id: r.id, boutiqueId: r.boutiqueId, createdAt: r.createdAt, paymentMethod: r.paymentMethod, currency: r.currency, total: Number(r.total), items: r.items || [] }));
        }
        const payments = {};
        let count = 0;
        let revenue = 0;
        rows.forEach(r => { count += 1; revenue += Number(r.total || 0); payments[r.paymentMethod] = (payments[r.paymentMethod] || 0) + Number(r.total || 0); });
        const lines = rows.map(r => ({
            id: r.id,
            boutiqueId: r.boutiqueId,
            createdAt: r.createdAt,
            paymentMethod: r.paymentMethod,
            currency: r.currency,
            total: r.total,
            items: (r.items || []).map((it) => `${it.productId}:${it.quantity}x${(it.unitPrice - (it.discount || 0))}`).join('|')
        }));
        const payload = { date: dateStr, boutiqueId: boutiqueId || 'all', totals: { count, revenue, payments }, lines };
        try {
            await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'sales.eod.read', resource: payload.boutiqueId, meta: { date: dateStr } });
        }
        catch { }
        return res.json(payload);
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to compute EOD' });
    }
});
// GET /sales/overview?from=YYYY-MM-DD&to=YYYY-MM-DD&boutiqueId=ID|all — Period aggregates for PDG
router.get('/overview', auth_1.requireAuth, (0, authorization_1.requirePermission)('reports', 'read'), async (req, res) => {
    const from = (req.query.from || '').toString();
    const to = (req.query.to || '').toString();
    const boutiqueId = (req.query.boutiqueId || '').toString() || undefined;
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))
        return res.status(400).json({ error: 'Invalid or missing from/to (YYYY-MM-DD)' });
    const [fy, fm, fd] = from.split('-').map(n => Number(n));
    const [ty, tm, td] = to.split('-').map(n => Number(n));
    const start = new Date(fy, fm - 1, fd).getTime();
    const end = new Date(ty, tm - 1, td).getTime() + 24 * 60 * 60 * 1000;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    try {
        let rows;
        if (prisma?.sale) {
            const where = { createdAt: { gte: new Date(start), lt: new Date(end) } };
            if (boutiqueId && boutiqueId !== 'all')
                where.boutiqueId = boutiqueId;
            const found = await prisma.sale.findMany({ where, include: { items: true } });
            rows = (found || []).map((s) => ({ id: s.id, boutiqueId: s.boutiqueId, createdAt: s.createdAt?.toISOString?.() || s.createdAt, paymentMethod: s.paymentMethod, currency: s.currency, total: Number(s.total), items: (s.items || []).map((it) => ({ productId: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), discount: Number(it.discount || 0) })) }));
        }
        else {
            rows = (memory_1.sales || []).filter((r) => {
                const t = new Date(r.createdAt).getTime();
                return t >= start && t < end && (!boutiqueId || boutiqueId === 'all' || r.boutiqueId === boutiqueId);
            }).map((r) => ({ id: r.id, boutiqueId: r.boutiqueId, createdAt: r.createdAt, paymentMethod: r.paymentMethod, currency: r.currency, total: Number(r.total), items: r.items || [] }));
        }
        // Aggregates
        const payments = {};
        const dailyMap = {};
        const prodMap = {};
        let count = 0;
        let revenue = 0;
        rows.forEach(r => {
            count += 1;
            revenue += Number(r.total || 0);
            payments[r.paymentMethod] = (payments[r.paymentMethod] || 0) + Number(r.total || 0);
            const d = (r.createdAt || '').slice(0, 10);
            const dm = (dailyMap[d] = dailyMap[d] || { count: 0, revenue: 0 });
            dm.count += 1;
            dm.revenue += Number(r.total || 0);
            (r.items || []).forEach((it) => {
                const key = it.productId;
                const pm = (prodMap[key] = prodMap[key] || { quantity: 0, revenue: 0 });
                const net = Number(it.unitPrice) - Number(it.discount || 0);
                pm.quantity += Number(it.quantity);
                pm.revenue += net * Number(it.quantity);
            });
        });
        const dailySeries = Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, count: v.count, revenue: v.revenue }));
        const topProducts = Object.entries(prodMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 20).map(([productId, v]) => ({ productId, quantity: v.quantity, revenue: v.revenue }));
        const payload = { boutiqueId: boutiqueId || 'all', from, to, periodTotals: { count, revenue, payments }, dailySeries, topProducts };
        try {
            await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'sales.overview.read', resource: payload.boutiqueId, meta: { from, to } });
        }
        catch { }
        return res.json(payload);
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to compute overview' });
    }
});
const createSchema = zod_1.z.object({
    boutiqueId: zod_1.z.string().min(1),
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.string().min(1),
        quantity: zod_1.z.number().int().positive(),
        unitPrice: zod_1.z.number().nonnegative(),
        discount: zod_1.z.number().nonnegative().optional()
    })).min(1).max(100),
    paymentMethod: zod_1.z.enum(['cash', 'mobile_money', 'card', 'mixed']).default('cash'),
    payments: zod_1.z.array(zod_1.z.object({ method: zod_1.z.enum(['cash', 'mobile_money', 'card']), amount: zod_1.z.number().nonnegative(), ref: zod_1.z.string().optional() })).optional(),
    currency: zod_1.z.string().min(3).max(3).default('GNF'),
    offlineId: zod_1.z.string().max(120).optional()
});
// POST /sales (supports offlineId for idempotency)
router.post('/', auth_1.requireAuth, (0, authorization_1.requirePermission)('pos', 'create'), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    try {
        const created = await svc.createSale(req, {
            boutiqueId: parsed.data.boutiqueId,
            items: parsed.data.items,
            paymentMethod: parsed.data.paymentMethod,
            payments: parsed.data.payments,
            currency: parsed.data.currency,
            offlineId: parsed.data.offlineId || null
        });
        try {
            await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'sales.create', resource: created.id, meta: { boutiqueId: parsed.data.boutiqueId, items: parsed.data.items.length, paymentMethod: parsed.data.paymentMethod } });
        }
        catch { }
        return res.status(201).json(created);
    }
    catch (e) {
        return res.status(400).json({ error: e?.message || 'Failed to create sale' });
    }
});
exports.default = router;
