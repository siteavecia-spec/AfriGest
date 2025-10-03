"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const authorization_1 = require("../middleware/authorization");
const memory_1 = require("../stores/memory");
const templates_1 = require("../services/templates");
const products_1 = require("../services/products");
const db_1 = require("../db");
const audit_1 = require("../services/audit");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, (0, authorization_1.requirePermission)('stock', 'read'), async (req, res) => {
    const limitRaw = (req.query.limit || '').toString();
    const offsetRaw = (req.query.offset || '').toString();
    const limit = limitRaw ? Math.max(1, Math.min(200, Number(limitRaw))) : undefined;
    const offset = offsetRaw ? Math.max(0, Number(offsetRaw)) : undefined;
    const rows = await (0, products_1.listProducts)(req, { limit, offset });
    // X-Total-Count header
    try {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            const total = await prisma.product.count();
            res.setHeader('X-Total-Count', String(total));
        }
        else {
            res.setHeader('X-Total-Count', String(memory_1.products.length));
        }
    }
    catch {
        res.setHeader('X-Total-Count', String(memory_1.products.length));
    }
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'products.read', resource: 'products', meta: { limit, offset } });
    }
    catch { }
    return res.json(rows);
});
const createSchema = zod_1.z.object({
    sku: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    price: zod_1.z.number().nonnegative(),
    cost: zod_1.z.number().nonnegative(),
    barcode: zod_1.z.string().optional(),
    taxRate: zod_1.z.number().min(0).max(100).optional(),
    sector: zod_1.z.string().optional(),
    attrs: zod_1.z.record(zod_1.z.any()).optional()
});
router.post('/', auth_1.requireAuth, (0, authorization_1.requirePermission)('stock', 'create'), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    // Dynamic per-sector validation using templates
    try {
        const templates = await (0, templates_1.listSectorTemplatesMerged)(req).catch(() => memory_1.sectorTemplates);
        const sectorKey = parsed.data.sector || 'generic';
        const tpl = templates.find((t) => t.key === sectorKey) || null;
        if (!tpl && sectorKey !== 'generic')
            return res.status(400).json({ error: `Unknown sector '${sectorKey}'` });
        const attrs = parsed.data.attrs || {};
        const errors = [];
        const checkType = (val, type) => {
            if (val == null)
                return true;
            switch (type) {
                case 'string': return typeof val === 'string';
                case 'text': return typeof val === 'string';
                case 'number': return typeof val === 'number' && Number.isFinite(val);
                case 'date': return typeof val === 'string' && !Number.isNaN(Date.parse(val));
                default: return true;
            }
        };
        if (tpl) {
            for (const a of (tpl.attributes || [])) {
                const present = attrs[a.key] !== undefined && attrs[a.key] !== null && attrs[a.key] !== '';
                if (a.required && !present)
                    errors.push(`Missing required attribute: ${a.key}`);
                if (attrs[a.key] !== undefined && !checkType(attrs[a.key], a.type))
                    errors.push(`Invalid type for attribute '${a.key}' (expected ${a.type})`);
            }
        }
        if (errors.length > 0)
            return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    catch (e) {
        return res.status(400).json({ error: e?.message || 'Sector validation error' });
    }
    const created = await (0, products_1.createProduct)(req, parsed.data);
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'product.create', resource: created.id, meta: { sku: parsed.data.sku, sector: parsed.data.sector } });
    }
    catch { }
    return res.status(201).json(created);
});
// Sector templates for multi-sector product attributes
router.get('/templates', auth_1.requireAuth, (0, authorization_1.requirePermission)('stock', 'read'), async (req, res) => {
    try {
        const data = await (0, templates_1.listSectorTemplatesMerged)(req);
        try {
            await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'products.templates.read', resource: 'templates' });
        }
        catch { }
        return res.json(data);
    }
    catch (e) {
        // fallback memory
        try {
            await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'products.templates.read', resource: 'templates' });
        }
        catch { }
        return res.json(memory_1.sectorTemplates);
    }
});
// Add custom attribute for a sector (PDG)
router.post('/templates/custom', auth_1.requireAuth, (0, authorization_1.requirePermission)('settings', 'update'), async (req, res) => {
    const schema = zod_1.z.object({ sectorKey: zod_1.z.string().min(1), key: zod_1.z.string().min(1), label: zod_1.z.string().min(1), type: zod_1.z.enum(['string', 'number', 'date', 'text']), required: zod_1.z.boolean().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    try {
        const created = await (0, templates_1.addTenantCustomAttribute)(req, parsed.data);
        try {
            await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'products.template.custom.add', resource: parsed.data.sectorKey, meta: { key: parsed.data.key } });
        }
        catch { }
        return res.status(201).json(created);
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to add custom attribute' });
    }
});
// Remove custom attribute for a sector
router.delete('/templates/custom', auth_1.requireAuth, (0, authorization_1.requirePermission)('settings', 'update'), async (req, res) => {
    const schema = zod_1.z.object({ sectorKey: zod_1.z.string().min(1), key: zod_1.z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    try {
        const removed = await (0, templates_1.removeTenantCustomAttribute)(req, parsed.data.sectorKey, parsed.data.key);
        try {
            await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'products.template.custom.remove', resource: parsed.data.sectorKey, meta: { key: parsed.data.key } });
        }
        catch { }
        return res.json(removed);
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to remove custom attribute' });
    }
});
// Export products as CSV for a given sector (flattening template attributes)
router.get('/export', auth_1.requireAuth, (0, authorization_1.requirePermission)('stock', 'export'), async (req, res) => {
    const sectorKey = (req.query.sector || '').toString() || 'all';
    try {
        const templates = await (0, templates_1.listSectorTemplatesMerged)(req).catch(() => memory_1.sectorTemplates);
        const tpl = sectorKey === 'all' ? null : templates.find((t) => t.key === sectorKey);
        const rows = await (0, products_1.listProducts)(req);
        const items = rows.filter((p) => sectorKey === 'all' || (p.sector || 'generic') === sectorKey);
        const attrKeys = tpl ? (tpl.attributes || []).map((a) => a.key) : Array.from(new Set(items.flatMap((p) => Object.keys(p.attrs || {}))));
        const header = ['id', 'sku', 'name', 'price', 'cost', 'barcode', 'taxRate', 'sector', ...attrKeys];
        const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""').replace(/\n/g, ' ') + '"';
        const lines = [header.join(',')];
        for (const p of items) {
            const row = [p.id, p.sku, p.name, p.price, p.cost, p.barcode ?? '', p.taxRate ?? '', p.sector ?? ''];
            for (const k of attrKeys)
                row.push((p.attrs || {})[k] ?? '');
            lines.push(row.map(esc).join(','));
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="products_${sectorKey}.csv"`);
        const out = lines.join('\n');
        try {
            await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'products.export', resource: 'products', meta: { sector: sectorKey, count: items.length } });
        }
        catch { }
        return res.send(out);
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to export products' });
    }
});
// Import products from JSON payload shaped by sector template
router.post('/import', auth_1.requireAuth, (0, authorization_1.requirePermission)('stock', 'create'), async (req, res) => {
    const schema = zod_1.z.object({ sectorKey: zod_1.z.string().min(1), items: zod_1.z.array(zod_1.z.record(zod_1.z.any())).min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const { sectorKey, items } = parsed.data;
    const created = [];
    const errors = [];
    for (const [idx, it] of items.entries()) {
        try {
            const payload = {
                sku: String(it.sku || '').trim(),
                name: String(it.name || '').trim(),
                price: Number(it.price || 0),
                cost: Number(it.cost || 0),
                barcode: it.barcode ? String(it.barcode) : undefined,
                taxRate: it.taxRate != null ? Number(it.taxRate) : undefined,
                sector: sectorKey,
                attrs: it.attrs || {}
            };
            if (!payload.sku || !payload.name)
                throw new Error('Missing sku/name');
            const row = await (0, products_1.createProduct)(req, payload);
            created.push({ id: row.id, sku: row.sku });
        }
        catch (e) {
            errors.push({ index: idx, error: e?.message || 'Failed to import row' });
        }
    }
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'products.import', resource: 'products', meta: { sectorKey, created: created.length, errors: errors.length } });
    }
    catch { }
    return res.json({ createdCount: created.length, errorCount: errors.length, created, errors });
});
// PATCH /products/:id — update product basic fields (name, price, cost, barcode, taxRate, sector, attrs)
router.patch('/:id', auth_1.requireAuth, (0, authorization_1.requirePermission)('stock', 'update'), async (req, res) => {
    const id = (req.params.id || '').toString();
    const schema = zod_1.z.object({
        name: zod_1.z.string().optional(),
        price: zod_1.z.number().nonnegative().optional(),
        cost: zod_1.z.number().nonnegative().optional(),
        barcode: zod_1.z.string().optional(),
        taxRate: zod_1.z.number().min(0).max(100).optional(),
        sector: zod_1.z.string().optional(),
        attrs: zod_1.z.record(zod_1.z.any()).optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    try {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma?.product) {
            const data = {};
            if (parsed.data.name !== undefined)
                data.name = parsed.data.name;
            if (parsed.data.price !== undefined)
                data.price = parsed.data.price;
            if (parsed.data.cost !== undefined)
                data.cost = parsed.data.cost;
            if (parsed.data.barcode !== undefined)
                data.barcode = parsed.data.barcode;
            if (parsed.data.taxRate !== undefined)
                data.taxRate = parsed.data.taxRate;
            if (parsed.data.sector !== undefined)
                data.sector = parsed.data.sector;
            if (parsed.data.attrs !== undefined)
                data.attrs = parsed.data.attrs;
            const updated = await prisma.product.update({ where: { id }, data });
            try {
                await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'product.update', resource: id, meta: parsed.data });
            }
            catch { }
            return res.json(updated);
        }
    }
    catch (e) {
        // fallback to memory
    }
    // Memory fallback
    const idx = memory_1.products.findIndex((p) => p.id === id);
    if (idx === -1)
        return res.status(404).json({ error: 'Not found' });
    const next = { ...(memory_1.products[idx]) };
    Object.assign(next, parsed.data);
    memory_1.products[idx] = next;
    try {
        await (0, audit_1.auditReq)(req, { userId: req.auth?.sub, action: 'product.update', resource: id, meta: parsed.data });
    }
    catch { }
    return res.json(next);
});
// Search with advanced filters (MVP: filter in memory/JS)
// GET /products/search?q=...&sector=pharmacy&expiryBefore=2025-12-31&warrantyLtDays=30&attr.color=Rouge
router.get('/search', auth_1.requireAuth, (0, authorization_1.requirePermission)('stock', 'read'), async (req, res) => {
    const q = (req.query.q || '').toString().toLowerCase().trim();
    const sectorKey = (req.query.sector || '').toString().trim() || 'all';
    const expiryBeforeRaw = (req.query.expiryBefore || '').toString().trim();
    const warrantyLtDaysRaw = (req.query.warrantyLtDays || '').toString().trim();
    const expiryBefore = expiryBeforeRaw ? new Date(expiryBeforeRaw) : null;
    const warrantyLtDays = warrantyLtDaysRaw ? Number(warrantyLtDaysRaw) : null;
    const now = new Date();
    try {
        const items = await (0, products_1.listProducts)(req);
        // Collect attr.* filters
        const attrFilters = {};
        Object.keys(req.query).forEach((k) => {
            if (k.startsWith('attr.'))
                attrFilters[k.slice(5)] = req.query[k].toString().toLowerCase();
        });
        const out = (items || []).filter((p) => {
            if (sectorKey !== 'all' && (p.sector || 'generic') !== sectorKey)
                return false;
            if (q) {
                const base = `${p.name || ''} ${p.sku || ''} ${(p.barcode || '')}`.toLowerCase();
                const attrsText = p.attrs ? Object.values(p.attrs).join(' ').toLowerCase() : '';
                if (!base.includes(q) && !attrsText.includes(q))
                    return false;
            }
            // expiryBefore
            if (expiryBefore) {
                const ed = p?.attrs?.expiry ? new Date(p.attrs.expiry) : null;
                if (!(ed && ed.getTime() <= expiryBefore.getTime()))
                    return false;
            }
            // warrantyLtDays
            if (warrantyLtDays != null && Number.isFinite(warrantyLtDays)) {
                const months = Number(p?.attrs?.warranty);
                const purchaseDate = p?.attrs?.purchaseDate || p?.attrs?.purchasedAt;
                if (Number.isFinite(months) && purchaseDate) {
                    const start = new Date(purchaseDate);
                    const end = new Date(start);
                    end.setMonth(end.getMonth() + Number(months));
                    const diffDays = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    if (!(diffDays >= 0 && diffDays <= Number(warrantyLtDays)))
                        return false;
                }
                else {
                    return false;
                }
            }
            // attr.* exact/contains match (case-insensitive contains)
            for (const [ak, av] of Object.entries(attrFilters)) {
                const val = p?.attrs?.[ak];
                if (val == null)
                    return false;
                if (typeof val === 'string') {
                    if (!val.toLowerCase().includes(av))
                        return false;
                }
                else if (typeof val === 'number') {
                    if (String(val).toLowerCase() !== av)
                        return false;
                }
                else {
                    if (String(val).toLowerCase().includes(av) === false)
                        return false;
                }
            }
            return true;
        });
        return res.json({ items: out });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Search failed' });
    }
});
exports.default = router;
