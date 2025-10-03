"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDefaultSectorTemplates = ensureDefaultSectorTemplates;
exports.listSectorTemplatesMerged = listSectorTemplatesMerged;
exports.addTenantCustomAttribute = addTenantCustomAttribute;
exports.removeTenantCustomAttribute = removeTenantCustomAttribute;
const db_1 = require("../db");
const memory_1 = require("../stores/memory");
async function ensureDefaultSectorTemplates(req) {
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (!prisma?.sectorTemplate)
        return { seeded: false };
    const count = await prisma.sectorTemplate.count().catch(() => 0);
    if (count > 0)
        return { seeded: false };
    // Seed from memory templates as system defaults
    for (const t of memory_1.sectorTemplates) {
        const created = await prisma.sectorTemplate.create({ data: { key: t.key, name: t.name, isSystem: true } });
        for (const a of (t.attributes || [])) {
            await prisma.sectorAttribute.create({ data: { templateId: created.id, key: a.key, label: a.label, type: a.type.toLowerCase() } });
        }
    }
    return { seeded: true };
}
async function listSectorTemplatesMerged(req) {
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (!prisma?.sectorTemplate) {
        // fallback to memory
        return memory_1.sectorTemplates;
    }
    await ensureDefaultSectorTemplates(req);
    const templates = await prisma.sectorTemplate.findMany({ include: { attributes: true } });
    const customs = await prisma.tenantCustomAttribute.findMany().catch(() => []);
    // Merge customs by sectorKey
    const bySector = {};
    for (const c of customs) {
        if (!bySector[c.sectorKey])
            bySector[c.sectorKey] = [];
        bySector[c.sectorKey].push({ key: c.key, label: c.label, type: c.type });
    }
    return templates.map((t) => ({
        key: t.key,
        name: t.name,
        attributes: [
            ...((t.attributes || []).map((a) => ({ key: a.key, label: a.label, type: a.type, required: !!a.required }))),
            ...((bySector[t.key] || []).map((a) => ({ ...a, required: !!a.required })))
        ]
    }));
}
async function addTenantCustomAttribute(req, data) {
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (!prisma?.tenantCustomAttribute)
        throw new Error('DB not available');
    // Upsert by composite unique (sectorKey, key)
    return prisma.tenantCustomAttribute.upsert({
        where: { sectorKey_key: { sectorKey: data.sectorKey, key: data.key } },
        update: { label: data.label, type: data.type, required: !!data.required },
        create: { ...data, required: !!data.required }
    });
}
async function removeTenantCustomAttribute(req, sectorKey, key) {
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    if (!prisma?.tenantCustomAttribute)
        throw new Error('DB not available');
    return prisma.tenantCustomAttribute.delete({ where: { sectorKey_key: { sectorKey, key } } });
}
