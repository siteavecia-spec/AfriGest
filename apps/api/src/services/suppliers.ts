import { Request } from 'express'
import { suppliers as memorySuppliers, type Supplier } from '../stores/memory'
import { getTenantClientFromReq } from '../db'

const useDb = (process.env.USE_DB || '').toLowerCase() === 'true'

export async function listSuppliers(req: Request, params?: { limit?: number; offset?: number }): Promise<any[]> {
  const limit = params?.limit
  const offset = params?.offset || 0
  if (useDb) {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      try {
        const rows = await (prisma as any).supplier.findMany({ orderBy: { name: 'asc' }, skip: offset || undefined, take: limit || undefined })
        return rows
      } catch (e) {
        console.warn('[suppliers.service] Prisma list failed, fallback to memory:', e)
      }
    }
  }
  const data = memorySuppliers.slice()
  if (offset || limit) return data.slice(offset, limit ? offset + limit : undefined)
  return data
}

export async function createSupplier(req: Request, data: Omit<Supplier, 'id'>): Promise<any> {
  if (useDb) {
    // Note: creation does not need tenant from req besides the connected Prisma client
    // as Supplier is tenant-scoped by the DB connection.
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      try {
        const created = await (prisma as any).supplier.create({ data })
        try {
          await (prisma as any).auditLog.create({ data: {
            actorId: (req as any).auth?.sub || null,
            role: (req as any).auth?.role || null,
            action: 'supplier.create',
            resourceId: created.id,
            metadata: { after: created },
          } })
        } catch {}
        return created
      } catch (e) {
        console.warn('[suppliers.service] Prisma create failed, fallback to memory:', e)
      }
    }
  }
  const id = `sup-${Date.now()}`
  const supplier: Supplier = { id, ...data }
  memorySuppliers.push(supplier)
  return supplier
}

export async function updateSupplier(req: Request, id: string, patch: Partial<Omit<Supplier, 'id'>>): Promise<any | null> {
  if (useDb) {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      try {
        const exists = await (prisma as any).supplier.findUnique({ where: { id } })
        if (!exists) return null
        const updated = await (prisma as any).supplier.update({ where: { id }, data: patch })
        try {
          await (prisma as any).auditLog.create({ data: {
            actorId: (req as any).auth?.sub || null,
            role: (req as any).auth?.role || null,
            action: 'supplier.update',
            resourceId: id,
            metadata: { before: exists, patch, after: updated },
          } })
        } catch {}
        return updated
      } catch (e) {
        console.warn('[suppliers.service] Prisma update failed, fallback to memory:', e)
      }
    }
  }
  const s = memorySuppliers.find(x => x.id === id)
  if (!s) return null
  Object.assign(s, patch)
  return s
}

export async function deleteSupplier(req: Request, id: string): Promise<boolean> {
  if (useDb) {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      try {
        const exists = await (prisma as any).supplier.findUnique({ where: { id } })
        await (prisma as any).supplier.delete({ where: { id } })
        try {
          await (prisma as any).auditLog.create({ data: {
            actorId: (req as any).auth?.sub || null,
            role: (req as any).auth?.role || null,
            action: 'supplier.delete',
            resourceId: id,
            metadata: { before: exists },
          } })
        } catch {}
        return true
      } catch (e) {
        console.warn('[suppliers.service] Prisma delete failed, fallback to memory:', e)
      }
    }
  }
  const idx = memorySuppliers.findIndex(x => x.id === id)
  if (idx === -1) return false
  memorySuppliers.splice(idx, 1)
  return true
}
