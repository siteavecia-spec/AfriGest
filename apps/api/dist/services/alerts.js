"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAlerts = computeAlerts;
const db_1 = require("../db");
const memory_1 = require("../stores/memory");
function parseDate(v) {
    if (!v)
        return null;
    try {
        return new Date(v);
    }
    catch {
        return null;
    }
}
async function computeAlerts(req, params) {
    const now = new Date();
    const soonDays = Math.max(1, Math.min(365, Number(params?.days ?? 30)));
    const sectorFilter = (params?.sector || '').trim();
    let items = [];
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (prisma?.product) {
        try {
            items = await prisma.product.findMany({ select: { id: true, sku: true, name: true, sector: true, attrs: true } });
        }
        catch {
            items = memory_1.products;
        }
    }
    else {
        items = memory_1.products;
    }
    if (sectorFilter && sectorFilter !== 'all')
        items = items.filter(p => (p.sector || 'generic') === sectorFilter);
    const expired = [];
    const expiringSoon = [];
    const warrantyExpiring = [];
    for (const p of items) {
        const a = p.attrs || {};
        // Expiry-based alerts (pharmacy, grocery, beauty cosmetics)
        const expiry = parseDate(a.expiry);
        if (expiry) {
            const diffDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
                expired.push({ id: p.id, sku: p.sku, name: p.name, sector: p.sector, reason: 'Produit expiré', date: expiry.toISOString() });
            }
            else if (diffDays <= soonDays) {
                expiringSoon.push({ id: p.id, sku: p.sku, name: p.name, sector: p.sector, reason: `Expire dans ${diffDays}j`, date: expiry.toISOString() });
            }
        }
        // Warranty-based alerts (electronics)
        const warrantyMonths = Number.isFinite(Number(a.warranty)) ? Number(a.warranty) : null;
        const purchaseDate = parseDate(a.purchaseDate || a.purchasedAt);
        if (warrantyMonths && purchaseDate) {
            const end = new Date(purchaseDate);
            end.setMonth(end.getMonth() + warrantyMonths);
            const diffDays = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= soonDays) {
                warrantyExpiring.push({ id: p.id, sku: p.sku, name: p.name, sector: p.sector, reason: `Garantie expire dans ${diffDays}j`, date: end.toISOString() });
            }
        }
    }
    // Sort by nearest date ascending
    const byDateAsc = (x, y) => (new Date(x.date || 0).getTime() - new Date(y.date || 0).getTime());
    expired.sort(byDateAsc);
    expiringSoon.sort(byDateAsc);
    warrantyExpiring.sort(byDateAsc);
    return { expired, expiringSoon, warrantyExpiring };
}
