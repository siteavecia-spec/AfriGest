"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSales = listSales;
exports.getSalesSummary = getSalesSummary;
exports.createSale = createSale;
const memory_1 = require("../stores/memory");
const db_1 = require("../db");
const useDb = (process.env.USE_DB || '').toLowerCase() === 'true';
async function listSales(req, limit = 50, offset = 0) {
    if (useDb) {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            try {
                // Return latest sales with items
                const rows = await prisma.sale.findMany({
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset || undefined,
                    include: { items: true },
                });
                const mapped = rows.map((s) => ({
                    id: s.id,
                    boutiqueId: s.boutiqueId,
                    items: (s.items || []).map((it) => ({ productId: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), discount: Number(it.discount || 0) })),
                    total: Number(s.total || 0),
                    paymentMethod: s.paymentMethod,
                    currency: s.currency,
                    createdAt: s.createdAt,
                    offlineId: s.offlineId || null,
                }));
                return mapped;
            }
            catch (e) {
                console.warn('[sales.service] Prisma list failed, fallback to memory:', e);
            }
        }
    }
    const data = memory_1.sales.slice().reverse();
    return data.slice(offset, offset + limit);
}
async function getSalesSummary(req, boutiqueId) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const start = new Date(y, m, d).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    if (useDb) {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            try {
                const where = { createdAt: { gte: new Date(start), lt: new Date(end) } };
                if (boutiqueId && boutiqueId !== 'all')
                    where.boutiqueId = boutiqueId;
                const rows = await prisma.sale.findMany({
                    where,
                    include: { items: true },
                });
                const count = rows.length;
                const total = rows.reduce((sum, s) => sum + Number(s.total || 0), 0);
                const qtyMap = new Map();
                rows.forEach((s) => {
                    (s.items || []).forEach((it) => {
                        const v = qtyMap.get(it.productId) || { qty: 0, amount: 0 };
                        v.qty += Number(it.quantity);
                        v.amount += Number(it.quantity) * Number(it.unitPrice) - Number(it.discount || 0);
                        qtyMap.set(it.productId, v);
                    });
                });
                let topProduct = null;
                qtyMap.forEach((v, pid) => {
                    if (!topProduct || v.qty > topProduct.quantity)
                        topProduct = { productId: pid, quantity: v.qty, total: v.amount };
                });
                // Optionally resolve sku/name from memory if needed (fast path); later, join Product if required
                if (topProduct) {
                    const p = memory_1.products.find(p => p.id === topProduct.productId);
                    if (p)
                        topProduct = { ...topProduct, sku: p.sku, name: p.name };
                }
                return { today: { count, total }, topProduct };
            }
            catch (e) {
                console.warn('[sales.service] Prisma summary failed, fallback to memory:', e);
            }
        }
    }
    const todays = memory_1.sales.filter(s => {
        const t = new Date(s.createdAt).getTime();
        return t >= start && t < end;
    });
    const count = todays.length;
    const total = todays.reduce((sum, s) => sum + (s.total || 0), 0);
    const qtyMap = new Map();
    todays.forEach(s => {
        s.items.forEach(it => {
            const v = qtyMap.get(it.productId) || { qty: 0, amount: 0 };
            v.qty += it.quantity;
            v.amount += it.quantity * it.unitPrice - (it.discount || 0);
            qtyMap.set(it.productId, v);
        });
    });
    let topProduct = null;
    qtyMap.forEach((v, pid) => {
        if (!topProduct || v.qty > topProduct.quantity)
            topProduct = { productId: pid, quantity: v.qty, total: v.amount };
    });
    if (topProduct) {
        const p = memory_1.products.find(p => p.id === topProduct.productId);
        if (p)
            topProduct = { ...topProduct, sku: p.sku, name: p.name };
    }
    return { today: { count, total }, topProduct };
}
async function createSale(req, data) {
    if (useDb) {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            try {
                // Idempotency
                if (data.offlineId) {
                    const existing = await prisma.sale.findFirst({ where: { offlineId: data.offlineId } });
                    if (existing) {
                        const withItems = await prisma.sale.findUnique({ where: { id: existing.id }, include: { items: true } });
                        return {
                            id: existing.id,
                            boutiqueId: existing.boutiqueId,
                            items: (withItems.items || []).map((it) => ({ productId: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), discount: Number(it.discount || 0) })),
                            total: Number(existing.total || 0),
                            paymentMethod: existing.paymentMethod,
                            currency: existing.currency,
                            createdAt: existing.createdAt,
                            offlineId: existing.offlineId || null,
                        };
                    }
                }
                // Transaction: validate + deduct + create sale + sale items
                const result = await prisma.$transaction(async (tx) => {
                    // Validate stock
                    for (const it of data.items) {
                        const stock = await tx.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId: data.boutiqueId, productId: it.productId } } });
                        const available = Number(stock?.quantity || 0);
                        if (available < it.quantity)
                            throw new Error('Insufficient stock');
                    }
                    // Deduct stock
                    for (const it of data.items) {
                        const stock = await tx.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId: data.boutiqueId, productId: it.productId } } });
                        const nextQty = Number(stock?.quantity || 0) - it.quantity;
                        if (stock)
                            await tx.stock.update({ where: { boutiqueId_productId: { boutiqueId: data.boutiqueId, productId: it.productId } }, data: { quantity: nextQty } });
                        else
                            await tx.stock.create({ data: { boutiqueId: data.boutiqueId, productId: it.productId, quantity: (0 - it.quantity) } });
                    }
                    // Create sale + items
                    const total = data.items.reduce((sum, it) => sum + (it.unitPrice * it.quantity - (it.discount || 0)), 0);
                    const created = await tx.sale.create({ data: { boutiqueId: data.boutiqueId, total: total, paymentMethod: data.paymentMethod, currency: data.currency, cashierUserId: req.auth?.sub || null, createdAt: new Date(), offlineId: data.offlineId || null } });
                    for (const it of data.items) {
                        await tx.saleItem.create({ data: { saleId: created.id, productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice, discount: (it.discount || 0) } });
                    }
                    return created.id;
                });
                const saved = await prisma.sale.findUnique({ where: { id: result }, include: { items: true } });
                // Global AuditLog for sale.create
                try {
                    await prisma.auditLog.create({ data: {
                            actorId: req.auth?.sub || null,
                            role: req.auth?.role || null,
                            action: 'sale.create',
                            resourceId: saved.id,
                            metadata: {
                                boutiqueId: saved.boutiqueId,
                                total: Number(saved.total || 0),
                                paymentMethod: saved.paymentMethod,
                                currency: saved.currency,
                                items: (saved.items || []).map((it) => ({ productId: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), discount: Number(it.discount || 0) })),
                                offlineId: data.offlineId || null
                            },
                        } });
                }
                catch { }
                return {
                    id: saved.id,
                    boutiqueId: saved.boutiqueId,
                    items: (saved.items || []).map((it) => ({ productId: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), discount: Number(it.discount || 0) })),
                    total: Number(saved.total || 0),
                    paymentMethod: saved.paymentMethod,
                    currency: saved.currency,
                    createdAt: saved.createdAt,
                    offlineId: saved.offlineId || null,
                };
            }
            catch (e) {
                console.warn('[sales.service] Prisma create failed, fallback to memory:', e);
            }
        }
    }
    // Memory fallback
    // Validate products and stock
    for (const it of data.items) {
        const prod = memory_1.products.find(p => p.id === it.productId);
        if (!prod)
            throw new Error(`Invalid product ${it.productId}`);
        const available = (0, memory_1.getStock)(data.boutiqueId, it.productId);
        if (available < it.quantity)
            throw new Error(`Insufficient stock for ${prod.name}`);
    }
    // Deduct stock
    data.items.forEach(it => (0, memory_1.upsertStock)(data.boutiqueId, it.productId, -it.quantity));
    const total = data.items.reduce((sum, it) => sum + (it.unitPrice * it.quantity - (it.discount || 0)), 0);
    const sale = {
        id: `sale-${Date.now()}`,
        boutiqueId: data.boutiqueId,
        items: data.items,
        total,
        paymentMethod: data.paymentMethod,
        currency: data.currency,
        cashierUserId: req.auth?.sub,
        createdAt: new Date().toISOString(),
        offlineId: data.offlineId || null
    };
    // Idempotency in memory
    if (data.offlineId) {
        const existing = memory_1.sales.find(s => s.offlineId === data.offlineId);
        if (existing)
            return existing;
    }
    memory_1.sales.push(sale);
    return sale;
}
