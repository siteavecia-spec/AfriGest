"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProducts = listProducts;
exports.createProduct = createProduct;
const memory_1 = require("../stores/memory");
const db_1 = require("../db");
const useDb = (process.env.USE_DB || '').toLowerCase() === 'true';
async function listProducts(req, params) {
    const limit = params?.limit;
    const offset = params?.offset || 0;
    if (useDb) {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            try {
                const rows = await prisma.product.findMany({ orderBy: { name: 'asc' }, skip: offset || undefined, take: limit || undefined });
                return rows;
            }
            catch (e) {
                console.warn('[products.service] Prisma fetch failed, fallback to memory:', e);
            }
        }
    }
    const data = memory_1.products.slice();
    if (offset || limit)
        return data.slice(offset, limit ? offset + limit : undefined);
    return data;
}
async function createProduct(req, data) {
    if (useDb) {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            try {
                const created = await prisma.product.create({ data: { ...data, isActive: true, taxRate: data.taxRate ?? 0 } });
                return created;
            }
            catch (e) {
                console.warn('[products.service] Prisma create failed, fallback to memory:', e);
            }
        }
    }
    const id = `prod-${Date.now()}`;
    const product = { id, isActive: true, ...data };
    memory_1.products.push(product);
    return product;
}
