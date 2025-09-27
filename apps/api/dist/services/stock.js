"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStockSummary = getStockSummary;
exports.createStockEntry = createStockEntry;
exports.adjustStock = adjustStock;
exports.getStockAudit = getStockAudit;
const memory_1 = require("../stores/memory");
const db_1 = require("../db");
const useDb = (process.env.USE_DB || '').toLowerCase() === 'true';
async function getStockSummary(req, boutiqueId) {
    if (useDb) {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            try {
                const prods = await prisma.product.findMany({ orderBy: { name: 'asc' }, select: { id: true, sku: true, name: true } });
                const qtyByProd = new Map();
                if (boutiqueId === 'all') {
                    const stocks = await prisma.stock.findMany({});
                    for (const s of stocks)
                        qtyByProd.set(s.productId, (qtyByProd.get(s.productId) || 0) + Number(s.quantity));
                }
                else {
                    const stocks = await prisma.stock.findMany({ where: { boutiqueId } });
                    for (const s of stocks)
                        qtyByProd.set(s.productId, Number(s.quantity));
                }
                const summary = prods.map((p) => ({ productId: p.id, sku: p.sku, name: p.name, quantity: qtyByProd.get(p.id) ?? 0 }));
                return { boutiqueId, summary };
            }
            catch (e) {
                console.warn('[stock.service] Prisma summary failed, fallback to memory:', e);
            }
        }
    }
    if (boutiqueId === 'all') {
        const qtyByProd = new Map();
        for (const b of memory_1.boutiques) {
            for (const p of memory_1.products) {
                const q = (0, memory_1.getStock)(b.id, p.id);
                qtyByProd.set(p.id, (qtyByProd.get(p.id) || 0) + q);
            }
        }
        const summary = memory_1.products.map(p => ({ productId: p.id, sku: p.sku, name: p.name, quantity: qtyByProd.get(p.id) || 0 }));
        return { boutiqueId, summary };
    }
    const summary = memory_1.products.map(p => ({ productId: p.id, sku: p.sku, name: p.name, quantity: (0, memory_1.getStock)(boutiqueId, p.id) }));
    return { boutiqueId, summary };
}
async function createStockEntry(req, data) {
    if (useDb) {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            try {
                await prisma.$transaction(async (tx) => {
                    for (const it of data.items) {
                        const existing = await tx.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId: data.boutiqueId, productId: it.productId } } });
                        if (existing) {
                            const nextQty = Number(existing.quantity) + Number(it.quantity);
                            await tx.stock.update({ where: { boutiqueId_productId: { boutiqueId: data.boutiqueId, productId: it.productId } }, data: { quantity: nextQty } });
                        }
                        else {
                            await tx.stock.create({ data: { boutiqueId: data.boutiqueId, productId: it.productId, quantity: it.quantity } });
                        }
                        // Audit: DB first, fallback memory
                        try {
                            await tx.stockAudit.create({ data: { boutiqueId: data.boutiqueId, productId: it.productId, delta: it.quantity, reason: data.reference || 'entry', userId: req.auth?.sub || null } });
                        }
                        catch {
                            memory_1.stockAudits.push({ id: `audit-${Date.now()}`, boutiqueId: data.boutiqueId, productId: it.productId, delta: it.quantity, reason: data.reference || 'entry', userId: req.auth?.sub, createdAt: new Date().toISOString() });
                        }
                    }
                });
                // Global AuditLog (one entry for the whole stock entry)
                try {
                    await prisma.auditLog.create({ data: {
                            actorId: req.auth?.sub || null,
                            role: req.auth?.role || null,
                            action: 'stock.entry',
                            resourceId: data.boutiqueId,
                            metadata: { items: data.items, reference: data.reference || null },
                        } });
                }
                catch { }
                return { ok: true };
            }
            catch (e) {
                console.warn('[stock.service] Prisma entries failed, fallback to memory:', e);
            }
        }
    }
    // memory fallback
    const bq = memory_1.boutiques.find(b => b.id === data.boutiqueId);
    if (!bq)
        throw new Error('Boutique not found');
    data.items.forEach(it => (0, memory_1.upsertStock)(data.boutiqueId, it.productId, it.quantity));
    return { ok: true };
}
async function adjustStock(req, data) {
    if (useDb) {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            try {
                const existing = await prisma.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId: data.boutiqueId, productId: data.productId } } });
                if (existing) {
                    const nextQty = Number(existing.quantity) + Number(data.delta);
                    const updated = await prisma.stock.update({ where: { boutiqueId_productId: { boutiqueId: data.boutiqueId, productId: data.productId } }, data: { quantity: nextQty } });
                    try {
                        await prisma.stockAudit.create({ data: { boutiqueId: data.boutiqueId, productId: data.productId, delta: data.delta, reason: data.reason, userId: req.auth?.sub || null } });
                    }
                    catch {
                        memory_1.stockAudits.push({ id: `audit-${Date.now()}`, boutiqueId: data.boutiqueId, productId: data.productId, delta: data.delta, reason: data.reason, userId: req.auth?.sub, createdAt: new Date().toISOString() });
                    }
                    // Global AuditLog (adjust)
                    try {
                        await prisma.auditLog.create({ data: {
                                actorId: req.auth?.sub || null,
                                role: req.auth?.role || null,
                                action: 'stock.adjust',
                                resourceId: data.productId,
                                metadata: { boutiqueId: data.boutiqueId, delta: data.delta, reason: data.reason },
                            } });
                    }
                    catch { }
                    return { ok: true, quantity: Number(updated.quantity) };
                }
                else {
                    const created = await prisma.stock.create({ data: { boutiqueId: data.boutiqueId, productId: data.productId, quantity: data.delta } });
                    try {
                        await prisma.stockAudit.create({ data: { boutiqueId: data.boutiqueId, productId: data.productId, delta: data.delta, reason: data.reason, userId: req.auth?.sub || null } });
                    }
                    catch {
                        memory_1.stockAudits.push({ id: `audit-${Date.now()}`, boutiqueId: data.boutiqueId, productId: data.productId, delta: data.delta, reason: data.reason, userId: req.auth?.sub, createdAt: new Date().toISOString() });
                    }
                    // Global AuditLog (adjust create)
                    try {
                        await prisma.auditLog.create({ data: {
                                actorId: req.auth?.sub || null,
                                role: req.auth?.role || null,
                                action: 'stock.adjust',
                                resourceId: data.productId,
                                metadata: { boutiqueId: data.boutiqueId, delta: data.delta, reason: data.reason },
                            } });
                    }
                    catch { }
                    return { ok: true, quantity: Number(created.quantity) };
                }
            }
            catch (e) {
                console.warn('[stock.service] Prisma adjust failed, fallback to memory:', e);
            }
        }
    }
    const newQty = (0, memory_1.upsertStock)(data.boutiqueId, data.productId, data.delta);
    memory_1.stockAudits.push({ id: `audit-${Date.now()}`, boutiqueId: data.boutiqueId, productId: data.productId, delta: data.delta, reason: data.reason, userId: req.auth?.sub, createdAt: new Date().toISOString() });
    return { ok: true, quantity: newQty };
}
async function getStockAudit(req, productId, limit = 50) {
    if (useDb) {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            try {
                const rows = await prisma.stockAudit.findMany({ where: { productId }, orderBy: { createdAt: 'desc' }, take: limit });
                return rows;
            }
            catch (e) {
                console.warn('[stock.service] Prisma audit fetch failed, fallback to memory:', e);
            }
        }
    }
    return memory_1.stockAudits.filter(a => a.productId === productId).slice(-limit).reverse();
}
