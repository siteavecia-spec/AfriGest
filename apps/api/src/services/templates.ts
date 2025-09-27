import { Request } from 'express'
import { getTenantClientFromReq } from '../db'
import { sectorTemplates as memoryTemplates } from '../stores/memory'

export async function ensureDefaultSectorTemplates(req: Request) {
  const prisma: any = getTenantClientFromReq(req)
  if (!prisma?.sectorTemplate) return { seeded: false }
  const count = await prisma.sectorTemplate.count().catch(() => 0)
  if (count > 0) return { seeded: false }
  // Seed from memory templates as system defaults
  for (const t of memoryTemplates) {
    const created = await prisma.sectorTemplate.create({ data: { key: t.key, name: t.name, isSystem: true } })
    for (const a of (t.attributes || [])) {
      await prisma.sectorAttribute.create({ data: { templateId: created.id, key: a.key, label: a.label, type: a.type.toLowerCase() } as any })
    }
  }
  return { seeded: true }
}

export async function listSectorTemplatesMerged(req: Request) {
  const prisma: any = getTenantClientFromReq(req)
  if (!prisma?.sectorTemplate) {
    // fallback to memory
    return memoryTemplates
  }
  await ensureDefaultSectorTemplates(req)
  const templates = await prisma.sectorTemplate.findMany({ include: { attributes: true } })
  const customs = await prisma.tenantCustomAttribute.findMany().catch(() => [])
  // Merge customs by sectorKey
  const bySector: Record<string, any[]> = {}
  for (const c of customs) {
    if (!bySector[c.sectorKey]) bySector[c.sectorKey] = []
    bySector[c.sectorKey].push({ key: c.key, label: c.label, type: c.type })
  }
  return templates.map((t: any) => ({
    key: t.key,
    name: t.name,
    attributes: [
      ...((t.attributes || []).map((a: any) => ({ key: a.key, label: a.label, type: a.type, required: !!a.required }))),
      ...((bySector[t.key] || []).map((a: any) => ({ ...a, required: !!a.required })))
    ]
  }))
}

export async function addTenantCustomAttribute(req: Request, data: { sectorKey: string; key: string; label: string; type: 'string'|'number'|'date'|'text'; required?: boolean }) {
  const prisma: any = getTenantClientFromReq(req)
  if (!prisma?.tenantCustomAttribute) throw new Error('DB not available')
  // Upsert by composite unique (sectorKey, key)
  return prisma.tenantCustomAttribute.upsert({
    where: { sectorKey_key: { sectorKey: data.sectorKey, key: data.key } },
    update: { label: data.label, type: data.type, required: !!data.required },
    create: { ...data, required: !!data.required }
  })
}

export async function removeTenantCustomAttribute(req: Request, sectorKey: string, key: string) {
  const prisma: any = getTenantClientFromReq(req)
  if (!prisma?.tenantCustomAttribute) throw new Error('DB not available')
  return prisma.tenantCustomAttribute.delete({ where: { sectorKey_key: { sectorKey, key } } })
}
