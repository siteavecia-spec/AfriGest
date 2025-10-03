"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../../db");
const router = (0, express_1.Router)({ mergeParams: true });
// GET /api/tenants/:tenantId/ecommerce/overview?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
    const schema = zod_1.z.object({ from: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
    const parsed = schema.safeParse({ from: req.query.from, to: req.query.to });
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid or missing from/to (YYYY-MM-DD)' });
    const { from, to } = parsed.data;
    const [fy, fm, fd] = from.split('-').map(Number);
    const [ty, tm, td] = to.split('-').map(Number);
    const start = new Date(fy, fm - 1, fd).getTime();
    const end = new Date(ty, tm - 1, td).getTime() + 24 * 60 * 60 * 1000;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    try {
        let rows;
        if (prisma?.ecommerceOrder) {
            const found = await prisma.ecommerceOrder.findMany({ where: { createdAt: { gte: new Date(start), lt: new Date(end) } }, include: { items: true } });
            rows = (found || []).map((o) => ({ createdAt: o.createdAt?.toISOString?.() || o.createdAt, items: (o.items || []).map((it) => ({ sku: it.sku, quantity: Number(it.quantity), price: Number(it.price), currency: it.currency })), total: Number(o.total || 0), paymentStatus: o.paymentStatus }));
        }
        else {
            // In-memory fallback — rely on sales overview if no separate ecommerce store; return empty structure
            rows = [];
        }
        const payments = {};
        const dailyMap = {};
        const prodMap = {};
        let count = 0;
        let revenue = 0;
        rows.forEach(r => {
            count += 1;
            revenue += Number(r.total || 0);
            const d = (r.createdAt || '').slice(0, 10);
            const dm = (dailyMap[d] = dailyMap[d] || { count: 0, revenue: 0 });
            dm.count += 1;
            dm.revenue += Number(r.total || 0);
            (r.items || []).forEach(it => {
                const pm = (prodMap[it.sku] = prodMap[it.sku] || { quantity: 0, revenue: 0 });
                pm.quantity += Number(it.quantity);
                pm.revenue += Number(it.price) * Number(it.quantity);
            });
        });
        const dailySeries = Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, count: v.count, revenue: v.revenue }));
        const topProducts = Object.entries(prodMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 50).map(([sku, v]) => ({ sku, quantity: v.quantity, revenue: v.revenue }));
        // Payment mix by provider when payments table exists
        let paymentMix = {};
        try {
            if (prisma?.ecommercePayment) {
                const payRows = await prisma.ecommercePayment.findMany({ where: { createdAt: { gte: new Date(start), lt: new Date(end) } }, select: { provider: true, amount: true } });
                for (const p of (payRows || [])) {
                    const key = String(p.provider || 'unknown');
                    paymentMix[key] = (paymentMix[key] || 0) + Number(p.amount || 0);
                }
            }
        }
        catch { }
        const averageOrderValue = count > 0 ? revenue / count : 0;
        return res.json({ from, to, periodTotals: { count, revenue, payments, averageOrderValue }, dailySeries, topProducts, paymentMix });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to compute ecommerce overview' });
    }
});
exports.default = router;
