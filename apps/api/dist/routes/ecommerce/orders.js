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
const auth_1 = require("../../middleware/auth");
const authorization_1 = require("../../middleware/authorization");
const orderService_1 = require("../../services/ecommerce/orderService");
const db_1 = require("../../db");
const stockService_1 = require("../../services/ecommerce/stockService");
const notify_1 = require("../../services/notify");
const inventoryService_1 = require("../../services/ecommerce/inventoryService");
const memory_1 = require("../../stores/memory");
const router = (0, express_1.Router)({ mergeParams: true });
// GET /api/tenants/:tenantId/ecommerce/orders/:orderId/public
// Public tracking endpoint: returns limited order info if requester provides matching email (best-effort)
router.get('/:orderId/public', async (req, res) => {
    const { tenantId, orderId } = req.params;
    const email = req.query?.email?.trim().toLowerCase();
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    try {
        if (prisma?.ecommerceOrder) {
            const full = await prisma.ecommerceOrder.findUnique({ where: { id: orderId }, include: { customer: true, items: true } });
            if (!full)
                return res.status(404).json({ error: 'Order not found', tenantId });
            const orderEmail = (full.customer?.email || '').toLowerCase();
            if (orderEmail && email && orderEmail !== email)
                return res.status(403).json({ error: 'Email does not match', tenantId });
            return res.json({ id: full.id, status: full.status, paymentStatus: full.paymentStatus || 'pending', total: Number(full.total || 0), currency: full.currency || 'GNF', createdAt: full.createdAt, items: full.items?.map((it) => ({ sku: it.sku, quantity: Number(it.quantity || 0), price: Number(it.price || 0) })), tenantId });
        }
        // Memory fallback
        const mem = (memory_1.ecommerceOrders || []).find(o => o.id === orderId);
        if (!mem)
            return res.status(404).json({ error: 'Order not found', tenantId });
        // In memory, we don't keep customer email bound to order reliably; allow if no email provided
        if (email)
            return res.status(403).json({ error: 'Email verification unavailable in memory mode', tenantId });
        return res.json({ id: mem.id, status: mem.status, total: Number(mem.total || 0), currency: mem.currency || 'GNF', createdAt: mem.createdAt, items: mem.items || [], tenantId });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to fetch order', tenantId });
    }
});
// GET /api/tenants/:tenantId/ecommerce/orders
router.get('/', auth_1.requireAuth, (0, authorization_1.requirePermission)('ecommerce.orders', 'read'), async (req, res) => {
    const { tenantId } = req.params;
    const { limit = '50', offset = '0' } = req.query;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    const { items, total } = await (0, orderService_1.listOrders)(tenantId, Number(limit), Number(offset), prisma);
    return res.json({ items, total, limit: Number(limit), offset: Number(offset), tenantId });
});
// POST /api/tenants/:tenantId/ecommerce/orders (create order from storefront)
const createSchema = zod_1.z.object({
    customer: zod_1.z.object({ email: zod_1.z.string().email().optional(), phone: zod_1.z.string().optional(), firstName: zod_1.z.string().optional(), lastName: zod_1.z.string().optional() }).optional(),
    items: zod_1.z.array(zod_1.z.object({ sku: zod_1.z.string(), quantity: zod_1.z.number().int().positive(), price: zod_1.z.number().nonnegative(), currency: zod_1.z.string().default('GNF') })),
    shippingAddress: zod_1.z.object({ line1: zod_1.z.string(), city: zod_1.z.string(), country: zod_1.z.string().default('GN'), postalCode: zod_1.z.string().optional() }).optional(),
    payment: zod_1.z.object({ provider: zod_1.z.enum(['stripe', 'paypal', 'mtn_momo', 'orange_momo', 'cod']).default('cod') }).optional(),
    notes: zod_1.z.string().optional()
});
router.post('/', async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    const provider = parsed.data.payment?.provider || 'cod';
    // --- Stock enforcement before creating order/payment ---
    try {
        const items = parsed.data.items || [];
        if (prisma?.product) {
            // DB mode: enforce dedicated online stock; shared stock enforcement TBD in core inventory
            const skus = Array.from(new Set(items.map(it => it.sku)));
            const rows = await prisma.product.findMany({ where: { sku: { in: skus } }, select: { id: true, sku: true, attrs: true } });
            const bySku = new Map(rows.map((r) => [r.sku, r]));
            // Validate availability
            for (const it of items) {
                const r = bySku.get(it.sku);
                if (!r)
                    return res.status(404).json({ error: `SKU not found: ${it.sku}` });
                const mode = (r.attrs?.onlineStockMode === 'dedicated' ? 'dedicated' : 'shared');
                if (mode === 'dedicated') {
                    const qty = Number(r.attrs?.onlineStockQty ?? 0);
                    if (qty < Number(it.quantity || 0)) {
                        return res.status(409).json({ error: `Insufficient online stock for ${it.sku}`, code: 'OUT_OF_STOCK', sku: it.sku });
                    }
                }
            }
            // Reserve/update dedicated stock in a transaction
            await prisma.$transaction(items.map((it) => {
                const r = bySku.get(it.sku);
                const mode = (r?.attrs?.onlineStockMode === 'dedicated' ? 'dedicated' : 'shared');
                if (mode === 'dedicated') {
                    const nextQty = Math.max(0, Number(r?.attrs?.onlineStockQty ?? 0) - Number(it.quantity || 0));
                    const nextAttrs = { ...(r?.attrs || {}), onlineStockQty: nextQty };
                    return prisma.product.update({ where: { sku: it.sku }, data: { attrs: nextAttrs } });
                }
                // Shared mode: no immediate DB change here (assumed handled by core inventory on fulfillment)
                return prisma.product.update({ where: { sku: it.sku }, data: {} });
            }));
        }
        else {
            // Memory mode: apply deltas against shared stock (default boutique 'bq-1')
            const changes = items.map(it => ({ sku: it.sku, delta: -Number(it.quantity || 0), reason: 'ecom_order' }));
            (0, stockService_1.applyInventoryDeltas)(tenantId, changes, { boutiqueId: 'bq-1' });
        }
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Stock enforcement failed' });
    }
    // Best-effort boutique assignment (non-persistent for now)
    let assignedBoutique = null;
    try {
        const city = parsed.data.shippingAddress?.city;
        if (prisma?.boutique) {
            const byCity = city ? await prisma.boutique.findFirst({ where: { city: { equals: city, mode: 'insensitive' } } }) : null;
            assignedBoutique = byCity || await prisma.boutique.findFirst({ orderBy: { name: 'asc' } });
        }
        else {
            if (city)
                assignedBoutique = memory_1.boutiques.find((b) => String(b.city || '').toLowerCase() === String(city).toLowerCase()) || null;
            if (!assignedBoutique)
                assignedBoutique = memory_1.boutiques.find((b) => b.id === 'bq-1') || memory_1.boutiques[0] || null;
        }
    }
    catch { }
    if (provider === 'cod') {
        const order = await (0, orderService_1.createOrder)({ tenantId, items: parsed.data.items, customerEmail: parsed.data.customer?.email, customerPhone: parsed.data.customer?.phone, currency: parsed.data.items[0]?.currency, boutiqueId: assignedBoutique?.id }, prisma);
        // Notify DG/PDG and customer (best-effort)
        try {
            const total = Number(order.total || 0);
            const assignText = assignedBoutique ? `\nBoutique assignée: ${assignedBoutique.code ? assignedBoutique.code + ' — ' : ''}${assignedBoutique.name || assignedBoutique.id || ''}` : '';
            await (0, notify_1.notifyEvent)(`[E‑commerce] Nouvelle commande COD — ${tenantId}`, `Commande ${order.id} reçue (total ${total} ${order.currency || 'GNF'}).${assignText}`);
            const email = order?.customer?.email || order?.customerEmail;
            if (email) {
                await (0, notify_1.notifyEvent)('Votre commande a été reçue', `Merci pour votre commande ${order.id}. Statut: reçue.`, email);
            }
        }
        catch { }
        return res.status(201).json(order);
    }
    if (provider === 'stripe') {
        try {
            const { createStripePaymentIntent, isStripeEnabled } = await Promise.resolve().then(() => __importStar(require('../../services/ecommerce/paymentService')));
            if (!isStripeEnabled())
                return res.status(400).json({ error: 'Stripe not configured' });
            const total = (parsed.data.items || []).reduce((s, it) => s + it.price * it.quantity, 0);
            const currency = parsed.data.items[0]?.currency || 'GNF';
            // If Prisma is available, create a pending order to reconcile on webhook
            let orderId;
            if (prisma?.ecommerceOrder) {
                const created = await prisma.ecommerceOrder.create({
                    data: {
                        total,
                        currency,
                        status: 'received',
                        paymentStatus: 'pending',
                        ...(assignedBoutique?.id ? { boutiqueId: assignedBoutique.id } : {}),
                        customer: parsed.data.customer?.email ? { connectOrCreate: { where: { email: parsed.data.customer.email }, create: { email: parsed.data.customer.email, phone: parsed.data.customer.phone, firstName: parsed.data.customer.firstName, lastName: parsed.data.customer.lastName } } } : undefined,
                        items: { create: parsed.data.items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })) }
                    },
                    select: { id: true }
                });
                orderId = created.id;
            }
            const intent = await createStripePaymentIntent(Math.round(total), currency, { tenantId, ...(orderId ? { orderId } : {}) });
            // Notify DG/PDG that an online order intent was created (pending payment)
            try {
                const assignText = assignedBoutique ? `\nBoutique pressentie: ${assignedBoutique.code ? assignedBoutique.code + ' — ' : ''}${assignedBoutique.name || assignedBoutique.id || ''}` : '';
                await (0, notify_1.notifyEvent)(`[E‑commerce] Intention de paiement Stripe — ${tenantId}`, `Commande en attente de paiement. Montant: ${total} ${currency}.${orderId ? `\nOrderId: ${orderId}` : ''}${assignText}`);
            }
            catch { }
            return res.status(200).json({ payment: { provider: 'stripe', clientSecret: intent.clientSecret }, orderId });
        }
        catch (e) {
            return res.status(500).json({ error: e?.message || 'Stripe error' });
        }
    }
    if (provider === 'mtn_momo' || provider === 'orange_momo') {
        try {
            const total = (parsed.data.items || []).reduce((s, it) => s + it.price * it.quantity, 0);
            const currency = parsed.data.items[0]?.currency || 'GNF';
            const providerKey = provider;
            let orderId;
            if (prisma?.ecommerceOrder) {
                const created = await prisma.ecommerceOrder.create({
                    data: {
                        total,
                        currency,
                        status: 'received',
                        paymentStatus: 'pending',
                        paymentProvider: providerKey,
                        ...(assignedBoutique?.id ? { boutiqueId: assignedBoutique.id } : {}),
                        customer: parsed.data.customer?.phone || parsed.data.customer?.email ? {
                            connectOrCreate: {
                                where: parsed.data.customer?.email ? { email: parsed.data.customer.email } : { phone: parsed.data.customer?.phone },
                                create: { email: parsed.data.customer?.email || null, phone: parsed.data.customer?.phone || null, firstName: parsed.data.customer?.firstName, lastName: parsed.data.customer?.lastName }
                            }
                        } : undefined,
                        items: { create: parsed.data.items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })) }
                    },
                    select: { id: true }
                });
                orderId = created.id;
            }
            // Best-effort notification
            try {
                const assignText = assignedBoutique ? `\nBoutique pressentie: ${assignedBoutique.code ? assignedBoutique.code + ' — ' : ''}${assignedBoutique.name || assignedBoutique.id || ''}` : '';
                await (0, notify_1.notifyEvent)(`[E‑commerce] Demande paiement MoMo — ${tenantId}`, `Commande en attente de paiement via ${providerKey}. Montant: ${total} ${currency}.${orderId ? `\nOrderId: ${orderId}` : ''}${assignText}`);
            }
            catch { }
            // Return a simple reference for FE to continue (real integration pending)
            const ref = `${providerKey}-${Date.now()}`;
            return res.status(202).json({ payment: { provider: providerKey, status: 'pending', ref }, orderId });
        }
        catch (e) {
            return res.status(500).json({ error: e?.message || 'Mobile Money error' });
        }
    }
    return res.status(400).json({ error: 'Unsupported payment provider' });
});
// PATCH /api/tenants/:tenantId/ecommerce/orders/:orderId (update status)
const statusSchema = zod_1.z.object({ status: zod_1.z.enum(['received', 'prepared', 'shipped', 'delivered', 'returned']) });
router.patch('/:orderId', auth_1.requireAuth, (0, authorization_1.requirePermission)('ecommerce.orders', 'status_change'), async (req, res) => {
    const { orderId } = req.params;
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    const newStatus = parsed.data.status;
    // If returning, restock inventory depending on stock mode
    if (newStatus === 'returned') {
        try {
            if (prisma?.ecommerceOrder && prisma?.product) {
                const full = await prisma.ecommerceOrder.findUnique({ where: { id: orderId }, include: { items: true } });
                const skus = Array.from(new Set((full?.items || []).map((it) => it.sku)));
                const prows = await prisma.product.findMany({ where: { sku: { in: skus } }, select: { sku: true, attrs: true } });
                const bySku = new Map(prows.map((r) => [r.sku, r]));
                const sharedItems = [];
                await prisma.$transaction((full?.items || []).map((it) => {
                    const prod = bySku.get(it.sku);
                    const mode = (prod?.attrs?.onlineStockMode === 'dedicated' ? 'dedicated' : 'shared');
                    if (mode === 'dedicated') {
                        const nextQty = Math.max(0, Number(prod?.attrs?.onlineStockQty ?? 0) + Number(it.quantity || 0));
                        const nextAttrs = { ...(prod?.attrs || {}), onlineStockQty: nextQty };
                        return prisma.product.update({ where: { sku: it.sku }, data: { attrs: nextAttrs } });
                    }
                    // shared mode: collect for shared release
                    sharedItems.push({ sku: it.sku, quantity: Number(it.quantity || 0) });
                    return prisma.product.update({ where: { sku: it.sku }, data: {} });
                }));
                if (sharedItems.length > 0) {
                    await (0, inventoryService_1.releaseSharedStock)(prisma, { orderId, items: sharedItems, boutiqueId: full?.boutiqueId || undefined });
                }
            }
            else {
                // Memory mode: restock shared inventory by reversing item quantities
                const mem = (memory_1.ecommerceOrders || []).find(o => o.id === orderId);
                if (mem && Array.isArray(mem.items)) {
                    const changes = mem.items.map((it) => ({ sku: it.sku, delta: +Number(it.quantity || 0), reason: 'ecom_return' }));
                    const { tenantId } = req.params;
                    (0, stockService_1.applyInventoryDeltas)(tenantId, changes, { boutiqueId: 'bq-1' });
                }
            }
        }
        catch { }
    }
    // If prepared, reserve/decrement shared inventory in DB mode; memory handled below
    if (newStatus === 'prepared') {
        try {
            if (prisma?.ecommerceOrder && prisma?.product) {
                const full = await prisma.ecommerceOrder.findUnique({ where: { id: orderId }, include: { items: true } });
                const skus = Array.from(new Set((full?.items || []).map((it) => it.sku)));
                const prows = await prisma.product.findMany({ where: { sku: { in: skus } }, select: { sku: true, attrs: true } });
                const bySku = new Map(prows.map((r) => [r.sku, r]));
                const sharedItems = (full?.items || []).filter((it) => (bySku.get(it.sku)?.attrs?.onlineStockMode !== 'dedicated')).map((it) => ({ sku: it.sku, quantity: Number(it.quantity || 0) }));
                if (sharedItems.length > 0) {
                    await (0, inventoryService_1.reserveSharedStock)(prisma, { orderId, items: sharedItems, boutiqueId: full?.boutiqueId || undefined });
                }
            }
            else {
                // Memory mode: decrement shared inventory
                const mem = (memory_1.ecommerceOrders || []).find(o => o.id === orderId);
                if (mem && Array.isArray(mem.items)) {
                    const changes = mem.items.map((it) => ({ sku: it.sku, delta: -Number(it.quantity || 0), reason: 'ecom_prepare' }));
                    const { tenantId } = req.params;
                    (0, stockService_1.applyInventoryDeltas)(tenantId, changes, { boutiqueId: 'bq-1' });
                }
            }
        }
        catch { }
    }
    const updated = await (0, orderService_1.updateOrderStatus)(orderId, newStatus, prisma);
    if (!updated)
        return res.status(404).json({ error: 'Order not found' });
    // Notifications: DG/PDG + customer email if available
    try {
        const status = newStatus;
        await (0, notify_1.notifyEvent)(`[E‑commerce] Statut commande mis à jour`, `Commande ${orderId}: ${status}`);
        if (prisma?.ecommerceOrder) {
            const full = await prisma.ecommerceOrder.findUnique({ where: { id: orderId }, include: { customer: true } });
            const email = full?.customer?.email || full?.customerEmail;
            if (email) {
                await (0, notify_1.notifyEvent)(`Mise à jour de votre commande`, `Votre commande ${orderId} est maintenant: ${status}`, email);
            }
        }
    }
    catch { }
    return res.json(updated);
});
exports.default = router;
