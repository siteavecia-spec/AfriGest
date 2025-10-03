"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const memory_1 = require("../stores/memory");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const tenant_1 = require("../db/tenant");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
let lastSeedBasicAt = null;
let lastSeedSalesAt = null;
// POST /dev/seed/basic
// Seed minimal data for Phase 1 QA (in-memory): ensures stock quantities for demo products and adds a demo supplier
router.post('/seed/basic', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg'), (req, res) => {
    // Ensure boutique exists
    const bq = memory_1.boutiques.find(b => b.id === 'bq-1');
    if (!bq)
        return res.status(500).json({ error: 'Missing default boutique bq-1 in memory store' });
    // Ensure demo supplier
    let sup = memory_1.suppliers.find(s => s.name === 'Fournisseur Démo');
    if (!sup) {
        const id = `sup-${Date.now()}`;
        const supplier = { id, name: 'Fournisseur Démo', contactName: 'Mme. Demo', phone: '+224600000000' };
        memory_1.suppliers.push(supplier);
        sup = supplier;
    }
    // Ensure some stock for existing demo products
    const wanted = [
        { sku: 'SKU-TSHIRT', qty: 50 },
        { sku: 'SKU-SHOES', qty: 30 },
        { sku: 'SKU-SHAMPOO', qty: 100 }
    ];
    const applied = [];
    for (const w of wanted) {
        const p = memory_1.products.find(x => x.sku === w.sku);
        if (!p)
            continue;
        // Set absolute quantity by reading current and applying delta
        const currentKey = `bq-1:${p.id}`;
        // simulate a set by computing delta from current 0 (since getStock is in another module) — we will just add qty for demo
        (0, memory_1.upsertStock)('bq-1', p.id, w.qty);
        applied.push({ productId: p.id, sku: p.sku, qty: w.qty });
    }
    lastSeedBasicAt = new Date().toISOString();
    return res.json({ ok: true, supplier: sup, applied, at: lastSeedBasicAt });
});
exports.default = router;
// Seed a few sales for today using demo products
router.post('/seed/sales', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), (req, res) => {
    const bq = memory_1.boutiques.find(b => b.id === 'bq-1');
    if (!bq)
        return res.status(500).json({ error: 'Missing default boutique bq-1 in memory store' });
    const picks = [
        { sku: 'SKU-TSHIRT', qty: 2 },
        { sku: 'SKU-SHOES', qty: 1 },
        { sku: 'SKU-SHAMPOO', qty: 3 }
    ];
    const created = [];
    const now = new Date().toISOString();
    for (const p of picks) {
        const prod = memory_1.products.find(x => x.sku === p.sku);
        if (!prod)
            continue;
        // decrement stock
        (0, memory_1.upsertStock)('bq-1', prod.id, -p.qty);
        const item = { productId: prod.id, quantity: p.qty, unitPrice: prod.price, discount: 0 };
        const total = item.quantity * item.unitPrice;
        const sale = {
            id: `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            boutiqueId: 'bq-1',
            items: [item],
            total,
            paymentMethod: 'cash',
            currency: 'GNF',
            createdAt: now
        };
        memory_1.sales.push(sale);
        created.push(sale);
    }
    lastSeedSalesAt = new Date().toISOString();
    return res.json({ ok: true, created: created.map(s => ({ id: s.id, total: s.total })), at: lastSeedSalesAt });
});
// GET /dev/status — quick overview for QA
router.get('/status', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), (req, res) => {
    const productCount = memory_1.products.length;
    const supplierCount = memory_1.suppliers.length;
    const salesCount = memory_1.sales.length;
    const stockAuditCount = memory_1.stockAudits.length;
    const bq = memory_1.boutiques.find(b => b.id === 'bq-1');
    let lowAlerts = 0;
    if (bq) {
        const thresholds = new Map(); // default threshold 5; clients can override per-product later in DB
        for (const p of memory_1.products) {
            const qty = memory_1.stocks.get(`bq-1:${p.id}`) ?? 0;
            const th = thresholds.get(p.id) ?? 5;
            if (qty <= th)
                lowAlerts++;
        }
    }
    return res.json({ ok: true, counts: { products: productCount, suppliers: supplierCount, sales: salesCount, stockAudits: stockAuditCount, lowAlerts }, seeds: { basicAt: lastSeedBasicAt, salesAt: lastSeedSalesAt } });
});
// POST /dev/seed/users — seed demo users in current tenant DB (using TENANT_DATABASE_URL)
router.post('/seed/users', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg'), async (req, res) => {
    try {
        const prisma = (0, tenant_1.getTenantPrisma)(env_1.env.TENANT_DATABASE_URL);
        const desired = [
            { email: 'pdg@demo.local', fullName: 'PDG Démo', role: 'pdg', password: 'Admin123!' },
            { email: 'dg@demo.local', fullName: 'DG Démo', role: 'dg', password: 'Admin123!' },
            { email: 'caissier@demo.local', fullName: 'Caissier Démo', role: 'caissier', password: 'Admin123!' },
            { email: 'manager_stock@demo.local', fullName: 'Manager Stock Démo', role: 'manager_stock', password: 'Admin123!' },
            { email: 'ecom_manager@demo.local', fullName: 'E‑commerce Manager Démo', role: 'ecom_manager', password: 'Admin123!' },
            { email: 'ecom_ops@demo.local', fullName: 'E‑commerce Ops Démo', role: 'ecom_ops', password: 'Admin123!' },
            { email: 'marketing@demo.local', fullName: 'Marketing Démo', role: 'marketing', password: 'Admin123!' },
            { email: 'support@demo.local', fullName: 'Support Démo', role: 'support', password: 'Admin123!' },
            { email: 'employee@demo.local', fullName: 'Employé Démo', role: 'employee', password: 'Admin123!' }
        ];
        const results = [];
        for (const d of desired) {
            const exists = await prisma.user.findUnique({ where: { email: d.email.toLowerCase() } });
            if (exists) {
                results.push({ email: d.email, created: false });
                continue;
            }
            const passwordHash = await bcryptjs_1.default.hash(d.password, 10);
            await prisma.user.create({ data: { email: d.email.toLowerCase(), fullName: d.fullName, role: d.role, status: 'active', passwordHash } });
            results.push({ email: d.email, created: true });
        }
        return res.json({ ok: true, results });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to seed users' });
    }
});
