"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const authorization_1 = require("../../middleware/authorization");
const db_1 = require("../../db");
const catalogService_1 = require("../../services/ecommerce/catalogService");
const router = (0, express_1.Router)({ mergeParams: true });
// GET /api/tenants/:tenantId/ecommerce/products
// Supports query params: q, limit, offset, approved, onlineOnly, sort (name_asc|name_desc|price_asc|price_desc)
router.get('/', auth_1.requireAuth, (0, authorization_1.requirePermission)('ecommerce.products', 'read'), async (req, res) => {
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    const { q = '', limit = '100', offset = '0', approved, onlineOnly, sort } = (req.query || {});
    if (!prisma)
        return res.json({ items: [], tenantId, limit: Number(limit), offset: Number(offset), total: 0 });
    try {
        // If Prisma has product, apply server-side filtering/pagination; else fallback to service mapping
        if (prisma.product) {
            const where = { isActive: true };
            if (q && q.trim()) {
                const s = q.trim();
                where.OR = [
                    { name: { contains: s, mode: 'insensitive' } },
                    { sku: { contains: s, mode: 'insensitive' } }
                ];
            }
            // attrs-based filters
            if (approved === 'true')
                where.attrs = { ...(where.attrs || {}), approved: true };
            if (approved === 'false')
                where.attrs = { ...(where.attrs || {}), approved: false };
            if (onlineOnly === 'true')
                where.attrs = { ...(where.attrs || {}), isOnlineAvailable: true };
            let orderBy = { name: 'asc' };
            if (sort === 'name_desc')
                orderBy = { name: 'desc' };
            if (sort === 'price_asc')
                orderBy = { price: 'asc' };
            if (sort === 'price_desc')
                orderBy = { price: 'desc' };
            const take = Math.min(500, Math.max(0, Number(limit) || 100));
            const skip = Math.max(0, Number(offset) || 0);
            const [rows, total] = await Promise.all([
                prisma.product.findMany({ where, orderBy, skip, take }),
                prisma.product.count({ where })
            ]);
            const items = rows.map((r) => ({
                sku: r.sku || r.id,
                title: r.name,
                description: r.attrs?.description ?? undefined,
                price: Number(r.price ?? 0),
                currency: r.attrs?.currency ?? 'GNF',
                images: Array.isArray(r.attrs?.images) ? r.attrs.images : [],
                variants: Array.isArray(r.attrs?.variants) ? r.attrs.variants : [],
                isOnlineAvailable: r.attrs?.isOnlineAvailable ?? true,
                onlineStockMode: (r.attrs?.onlineStockMode === 'dedicated' ? 'dedicated' : 'shared'),
                onlineStockQty: typeof r.attrs?.onlineStockQty === 'number' ? r.attrs.onlineStockQty : undefined,
                approved: r.attrs?.approved === true
            }));
            return res.json({ items, tenantId, total, limit: take, offset: skip });
        }
        // Fallback to existing mapping function (no DB)
        const items = await (0, catalogService_1.listEcommerceProducts)(prisma, tenantId);
        return res.json({ items, tenantId, total: items.length, limit: Number(limit), offset: Number(offset) });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to load ecommerce products' });
    }
});
// POST /api/tenants/:tenantId/ecommerce/products
const upsertSchema = zod_1.z.object({
    sku: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    price: zod_1.z.number().nonnegative(),
    currency: zod_1.z.string().default('GNF'),
    images: zod_1.z.array(zod_1.z.string().url()).optional().default([]),
    variants: zod_1.z.array(zod_1.z.record(zod_1.z.any())).optional().default([]),
    isOnlineAvailable: zod_1.z.boolean().default(true),
    onlineStockMode: zod_1.z.enum(['shared', 'dedicated']).default('shared'),
    onlineStockQty: zod_1.z.number().int().nonnegative().optional()
});
router.post('/', auth_1.requireAuth, (0, authorization_1.requirePermission)('ecommerce.products', 'create'), async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    // If DB is available, upsert product with attrs including images and flags
    if (prisma?.product) {
        try {
            const p = prisma;
            const existing = await p.product.findUnique({ where: { sku: parsed.data.sku } }).catch(() => null);
            const attrs = {
                ...(existing?.attrs || {}),
                description: parsed.data.description,
                currency: parsed.data.currency,
                images: parsed.data.images || [],
                variants: parsed.data.variants || [],
                isOnlineAvailable: parsed.data.isOnlineAvailable,
                onlineStockMode: parsed.data.onlineStockMode,
                ...(parsed.data.onlineStockQty != null ? { onlineStockQty: parsed.data.onlineStockQty } : {})
            };
            const data = existing
                ? await p.product.update({ where: { sku: parsed.data.sku }, data: { name: parsed.data.title, price: parsed.data.price, attrs } })
                : await p.product.create({ data: { sku: parsed.data.sku, name: parsed.data.title, price: parsed.data.price, attrs, isActive: true } });
            return res.status(existing ? 200 : 201).json({ id: data.id, sku: data.sku, title: data.name, price: Number(data.price || 0), attrs: data.attrs, tenantId });
        }
        catch (e) {
            return res.status(500).json({ error: e?.message || 'Failed to upsert product' });
        }
    }
    // Fallback: memory mode not supported for persistence in this MVP
    return res.status(501).json({ error: 'Persistence not available in memory mode', tenantId });
});
// PATCH /api/tenants/:tenantId/ecommerce/products/:sku
router.patch('/:sku', auth_1.requireAuth, (0, authorization_1.requirePermission)('ecommerce.products', 'update'), async (req, res) => {
    const { sku } = req.params;
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    const patchSchema = zod_1.z.object({
        title: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        price: zod_1.z.number().nonnegative().optional(),
        currency: zod_1.z.string().optional(),
        images: zod_1.z.array(zod_1.z.string().url()).optional(),
        variants: zod_1.z.array(zod_1.z.record(zod_1.z.any())).optional(),
        isOnlineAvailable: zod_1.z.boolean().optional(),
        onlineStockMode: zod_1.z.enum(['shared', 'dedicated']).optional(),
        onlineStockQty: zod_1.z.number().int().nonnegative().optional()
    });
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    if (prisma?.product) {
        try {
            const p = prisma;
            const existing = await p.product.findUnique({ where: { sku } });
            if (!existing)
                return res.status(404).json({ error: 'Product not found' });
            const nextAttrs = { ...(existing.attrs || {}) };
            if (parsed.data.description !== undefined)
                nextAttrs.description = parsed.data.description;
            if (parsed.data.currency !== undefined)
                nextAttrs.currency = parsed.data.currency;
            if (parsed.data.images !== undefined)
                nextAttrs.images = parsed.data.images;
            if (parsed.data.variants !== undefined)
                nextAttrs.variants = parsed.data.variants;
            if (parsed.data.isOnlineAvailable !== undefined)
                nextAttrs.isOnlineAvailable = parsed.data.isOnlineAvailable;
            if (parsed.data.onlineStockMode !== undefined)
                nextAttrs.onlineStockMode = parsed.data.onlineStockMode;
            if (parsed.data.onlineStockQty !== undefined)
                nextAttrs.onlineStockQty = parsed.data.onlineStockQty;
            const data = await p.product.update({
                where: { sku },
                data: {
                    ...(parsed.data.title !== undefined ? { name: parsed.data.title } : {}),
                    ...(parsed.data.price !== undefined ? { price: parsed.data.price } : {}),
                    attrs: nextAttrs
                }
            });
            return res.json({ id: data.id, sku: data.sku, title: data.name, price: Number(data.price || 0), attrs: data.attrs, tenantId });
        }
        catch (e) {
            return res.status(500).json({ error: e?.message || 'Failed to update product' });
        }
    }
    return res.status(501).json({ error: 'Persistence not available in memory mode', tenantId });
});
// DELETE /api/tenants/:tenantId/ecommerce/products/:sku
router.delete('/:sku', auth_1.requireAuth, (0, authorization_1.requirePermission)('ecommerce.products', 'delete'), async (req, res) => {
    const { sku } = req.params;
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    // Soft-delete: mark product inactive when DB available
    if (prisma?.product) {
        try {
            const p = prisma;
            const existing = await p.product.findUnique({ where: { sku } });
            if (!existing)
                return res.status(404).json({ error: 'Product not found' });
            const data = await p.product.update({ where: { sku }, data: { isActive: false } });
            return res.json({ ok: true, sku: data.sku, tenantId, isActive: false });
        }
        catch (e) {
            return res.status(500).json({ error: e?.message || 'Failed to delete product' });
        }
    }
    return res.status(501).json({ error: 'Delete not available in memory mode', tenantId });
});
// PATCH /api/tenants/:tenantId/ecommerce/products/:sku/images/add
router.patch('/:sku/images/add', auth_1.requireAuth, (0, authorization_1.requirePermission)('ecommerce.products', 'update'), async (req, res) => {
    const { sku } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    const schema = zod_1.z.object({ url: zod_1.z.string().url() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    if (prisma?.product) {
        try {
            const p = prisma;
            const existing = await p.product.findUnique({ where: { sku } });
            if (!existing)
                return res.status(404).json({ error: 'Product not found' });
            const imgs = Array.isArray(existing.attrs?.images) ? existing.attrs.images.slice() : [];
            if (!imgs.includes(parsed.data.url))
                imgs.push(parsed.data.url);
            const attrs = { ...(existing.attrs || {}), images: imgs };
            const data = await p.product.update({ where: { sku }, data: { attrs } });
            return res.json({ ok: true, images: data.attrs?.images || [] });
        }
        catch (e) {
            return res.status(500).json({ error: e?.message || 'Failed to add image' });
        }
    }
    return res.status(501).json({ error: 'Persistence not available in memory mode' });
});
// PATCH /api/tenants/:tenantId/ecommerce/products/:sku/images/remove
router.patch('/:sku/images/remove', auth_1.requireAuth, (0, authorization_1.requirePermission)('ecommerce.products', 'update'), async (req, res) => {
    const { sku } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    const schema = zod_1.z.object({ url: zod_1.z.string().url() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    if (prisma?.product) {
        try {
            const p = prisma;
            const existing = await p.product.findUnique({ where: { sku } });
            if (!existing)
                return res.status(404).json({ error: 'Product not found' });
            const imgs = Array.isArray(existing.attrs?.images) ? existing.attrs.images.slice() : [];
            const next = imgs.filter((u) => u !== parsed.data.url);
            const attrs = { ...(existing.attrs || {}), images: next };
            const data = await p.product.update({ where: { sku }, data: { attrs } });
            return res.json({ ok: true, images: data.attrs?.images || [] });
        }
        catch (e) {
            return res.status(500).json({ error: e?.message || 'Failed to remove image' });
        }
    }
    return res.status(501).json({ error: 'Persistence not available in memory mode' });
});
// PATCH /api/tenants/:tenantId/ecommerce/products/:sku/images/cover
router.patch('/:sku/images/cover', auth_1.requireAuth, (0, authorization_1.requirePermission)('ecommerce.products', 'update'), async (req, res) => {
    const { sku } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    const schema = zod_1.z.object({ url: zod_1.z.string().url() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    if (prisma?.product) {
        try {
            const p = prisma;
            const existing = await p.product.findUnique({ where: { sku } });
            if (!existing)
                return res.status(404).json({ error: 'Product not found' });
            const imgs = Array.isArray(existing.attrs?.images) ? existing.attrs.images.slice() : [];
            const rest = imgs.filter(u => u !== parsed.data.url);
            const next = [parsed.data.url, ...rest];
            const attrs = { ...(existing.attrs || {}), images: next };
            const data = await p.product.update({ where: { sku }, data: { attrs } });
            return res.json({ ok: true, images: data.attrs?.images || [] });
        }
        catch (e) {
            return res.status(500).json({ error: e?.message || 'Failed to set cover image' });
        }
    }
    return res.status(501).json({ error: 'Persistence not available in memory mode' });
});
// PATCH /api/tenants/:tenantId/ecommerce/products/:sku/approve
router.patch('/:sku/approve', auth_1.requireAuth, (0, authorization_1.requirePermission)('ecommerce.products', 'approve'), async (req, res) => {
    const { sku } = req.params;
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (prisma?.product) {
        try {
            const p = prisma;
            const existing = await p.product.findUnique({ where: { sku } });
            if (!existing)
                return res.status(404).json({ error: 'Product not found' });
            const attrs = { ...(existing.attrs || {}), approved: true };
            const data = await p.product.update({ where: { sku }, data: { attrs } });
            return res.json({ ok: true, sku: data.sku, tenantId, approved: true });
        }
        catch (e) {
            return res.status(500).json({ error: e?.message || 'Failed to approve product' });
        }
    }
    return res.status(501).json({ error: 'Persistence not available in memory mode', tenantId });
});
exports.default = router;
