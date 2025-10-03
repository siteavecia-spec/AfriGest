"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reserveSharedStock = reserveSharedStock;
exports.releaseSharedStock = releaseSharedStock;
async function ensureBoutique(prisma, preferredId) {
    if (preferredId) {
        const b = await prisma.boutique.findUnique({ where: { id: preferredId } }).catch(() => null);
        if (b)
            return b;
    }
    const first = await prisma.boutique.findFirst({ orderBy: { name: 'asc' } });
    if (!first)
        throw new Error('No boutique configured');
    return first;
}
async function getProductsBySku(prisma, skus) {
    const rows = await prisma.product.findMany({ where: { sku: { in: skus } }, select: { id: true, sku: true } });
    const map = new Map();
    for (const r of rows)
        map.set(r.sku, r.id);
    return map;
}
async function reserveSharedStock(prisma, params) {
    const boutique = await ensureBoutique(prisma, params.boutiqueId);
    const skus = Array.from(new Set((params.items || []).map(i => i.sku)));
    const bySku = await getProductsBySku(prisma, skus);
    // Idempotence (best-effort): if an audit exists for this orderId and action reserve, skip
    const already = await prisma.auditLog.findFirst({ where: { action: 'inventory.reserve.shared', resourceId: params.orderId } });
    if (already)
        return { ok: true, skipped: true };
    await prisma.$transaction(async (tx) => {
        for (const it of params.items) {
            const productId = bySku.get(it.sku);
            if (!productId)
                throw new Error(`SKU not found: ${it.sku}`);
            // Update or create Stock row and decrement
            const stock = await tx.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId: boutique.id, productId } } });
            const current = Number(stock?.quantity || 0);
            const next = current - Number(it.quantity || 0);
            if (stock) {
                await tx.stock.update({ where: { boutiqueId_productId: { boutiqueId: boutique.id, productId } }, data: { quantity: next } });
            }
            else {
                await tx.stock.create({ data: { boutiqueId: boutique.id, productId, quantity: Math.max(0, next) } });
            }
            await tx.stockAudit.create({ data: { boutiqueId: boutique.id, productId, delta: -Number(it.quantity || 0), reason: `ecom_prepare:${params.orderId}`, userId: params.actorUserId || null } });
        }
        await tx.auditLog.create({ data: { action: 'inventory.reserve.shared', resourceId: params.orderId, metadata: { count: params.items.length }, createdAt: new Date() } });
    });
    return { ok: true };
}
async function releaseSharedStock(prisma, params) {
    const boutique = await ensureBoutique(prisma, params.boutiqueId);
    const skus = Array.from(new Set((params.items || []).map(i => i.sku)));
    const bySku = await getProductsBySku(prisma, skus);
    // Idempotence (best-effort): if an audit exists for this orderId and action release, skip
    const already = await prisma.auditLog.findFirst({ where: { action: 'inventory.release.shared', resourceId: params.orderId } });
    if (already)
        return { ok: true, skipped: true };
    await prisma.$transaction(async (tx) => {
        for (const it of params.items) {
            const productId = bySku.get(it.sku);
            if (!productId)
                throw new Error(`SKU not found: ${it.sku}`);
            const stock = await tx.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId: boutique.id, productId } } });
            const current = Number(stock?.quantity || 0);
            const next = current + Number(it.quantity || 0);
            if (stock) {
                await tx.stock.update({ where: { boutiqueId_productId: { boutiqueId: boutique.id, productId } }, data: { quantity: next } });
            }
            else {
                await tx.stock.create({ data: { boutiqueId: boutique.id, productId, quantity: next } });
            }
            await tx.stockAudit.create({ data: { boutiqueId: boutique.id, productId, delta: +Number(it.quantity || 0), reason: `ecom_return:${params.orderId}`, userId: params.actorUserId || null } });
        }
        await tx.auditLog.create({ data: { action: 'inventory.release.shared', resourceId: params.orderId, metadata: { count: params.items.length }, createdAt: new Date() } });
    });
    return { ok: true };
}
