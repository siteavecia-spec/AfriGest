"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSuppliers = listSuppliers;
exports.createSupplier = createSupplier;
exports.updateSupplier = updateSupplier;
exports.deleteSupplier = deleteSupplier;
const memory_1 = require("../stores/memory");
const db_1 = require("../db");
const useDb = (process.env.USE_DB || '').toLowerCase() === 'true';
async function listSuppliers(req, params) {
    const limit = params?.limit;
    const offset = params?.offset || 0;
    if (useDb) {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            try {
                const rows = await prisma.supplier.findMany({ orderBy: { name: 'asc' }, skip: offset || undefined, take: limit || undefined });
                return rows;
            }
            catch (e) {
                console.warn('[suppliers.service] Prisma list failed, fallback to memory:', e);
            }
        }
    }
    const data = memory_1.suppliers.slice();
    if (offset || limit)
        return data.slice(offset, limit ? offset + limit : undefined);
    return data;
}
async function createSupplier(req, data) {
    if (useDb) {
        // Note: creation does not need tenant from req besides the connected Prisma client
        // as Supplier is tenant-scoped by the DB connection.
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            try {
                const created = await prisma.supplier.create({ data });
                try {
                    await prisma.auditLog.create({ data: {
                            actorId: req.auth?.sub || null,
                            role: req.auth?.role || null,
                            action: 'supplier.create',
                            resourceId: created.id,
                            metadata: { after: created },
                        } });
                }
                catch { }
                return created;
            }
            catch (e) {
                console.warn('[suppliers.service] Prisma create failed, fallback to memory:', e);
            }
        }
    }
    const id = `sup-${Date.now()}`;
    const supplier = { id, ...data };
    memory_1.suppliers.push(supplier);
    return supplier;
}
async function updateSupplier(req, id, patch) {
    if (useDb) {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            try {
                const exists = await prisma.supplier.findUnique({ where: { id } });
                if (!exists)
                    return null;
                const updated = await prisma.supplier.update({ where: { id }, data: patch });
                try {
                    await prisma.auditLog.create({ data: {
                            actorId: req.auth?.sub || null,
                            role: req.auth?.role || null,
                            action: 'supplier.update',
                            resourceId: id,
                            metadata: { before: exists, patch, after: updated },
                        } });
                }
                catch { }
                return updated;
            }
            catch (e) {
                console.warn('[suppliers.service] Prisma update failed, fallback to memory:', e);
            }
        }
    }
    const s = memory_1.suppliers.find(x => x.id === id);
    if (!s)
        return null;
    Object.assign(s, patch);
    return s;
}
async function deleteSupplier(req, id) {
    if (useDb) {
        const prisma = (0, db_1.getTenantClientFromReq)(req);
        if (prisma) {
            try {
                const exists = await prisma.supplier.findUnique({ where: { id } });
                await prisma.supplier.delete({ where: { id } });
                try {
                    await prisma.auditLog.create({ data: {
                            actorId: req.auth?.sub || null,
                            role: req.auth?.role || null,
                            action: 'supplier.delete',
                            resourceId: id,
                            metadata: { before: exists },
                        } });
                }
                catch { }
                return true;
            }
            catch (e) {
                console.warn('[suppliers.service] Prisma delete failed, fallback to memory:', e);
            }
        }
    }
    const idx = memory_1.suppliers.findIndex(x => x.id === id);
    if (idx === -1)
        return false;
    memory_1.suppliers.splice(idx, 1);
    return true;
}
