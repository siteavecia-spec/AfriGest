import { Request } from 'express'
import { boutiques as memoryBoutiques, getStock as memoryGetStock, products as memoryProducts, upsertStock as memoryUpsert, stockAudits as memoryAudits } from '../stores/memory'
import { getTenantClientFromReq } from '../db'

const useDb = (process.env.USE_DB || '').toLowerCase() === 'true'

export async function getStockSummary(req: Request, boutiqueId: string) {
  if (useDb) {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      try {
        const prods = await (prisma as any).product.findMany({ orderBy: { name: 'asc' }, select: { id: true, sku: true, name: true } })
        const qtyByProd = new Map<string, number>()
        if (boutiqueId === 'all') {
          const stocks = await (prisma as any).stock.findMany({})
          for (const s of stocks) qtyByProd.set(s.productId, (qtyByProd.get(s.productId) || 0) + Number(s.quantity))
        } else {
          const stocks = await (prisma as any).stock.findMany({ where: { boutiqueId } })
          for (const s of stocks) qtyByProd.set(s.productId, Number(s.quantity))
        }
        const summary = prods.map((p: any) => ({ productId: p.id, sku: p.sku, name: p.name, quantity: qtyByProd.get(p.id) ?? 0 }))
        return { boutiqueId, summary }
      } catch (e) {
        console.warn('[stock.service] Prisma summary failed, fallback to memory:', e)
      }
    }
  }
  if (boutiqueId === 'all') {
    const qtyByProd = new Map<string, number>()
    for (const b of memoryBoutiques) {
      for (const p of memoryProducts) {
        const q = memoryGetStock(b.id, p.id)
        qtyByProd.set(p.id, (qtyByProd.get(p.id) || 0) + q)
      }
    }
    const summary = memoryProducts.map(p => ({ productId: p.id, sku: p.sku, name: p.name, quantity: qtyByProd.get(p.id) || 0 }))
    return { boutiqueId, summary }
  }
  const summary = memoryProducts.map(p => ({ productId: p.id, sku: p.sku, name: p.name, quantity: memoryGetStock(boutiqueId, p.id) }))
  return { boutiqueId, summary }
}

export async function createStockEntry(req: Request, data: { boutiqueId: string; reference?: string; items: Array<{ productId: string; quantity: number; unitCost: number }> }) {
  if (useDb) {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      try {
        await prisma.$transaction(async (tx: any) => {
          for (const it of data.items) {
            const existing = await tx.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId: data.boutiqueId, productId: it.productId } } })
            if (existing) {
              const nextQty = Number(existing.quantity) + Number(it.quantity)
              await tx.stock.update({ where: { boutiqueId_productId: { boutiqueId: data.boutiqueId, productId: it.productId } }, data: { quantity: nextQty as any } })
            } else {
              await tx.stock.create({ data: { boutiqueId: data.boutiqueId, productId: it.productId, quantity: it.quantity as any } })
            }
            // Audit: DB first, fallback memory
            try {
              await (tx as any).stockAudit.create({ data: { boutiqueId: data.boutiqueId, productId: it.productId, delta: it.quantity, reason: data.reference || 'entry', userId: (req as any).auth?.sub || null } })
            } catch {
              memoryAudits.push({ id: `audit-${Date.now()}`, boutiqueId: data.boutiqueId, productId: it.productId, delta: it.quantity, reason: data.reference || 'entry', userId: (req as any).auth?.sub, createdAt: new Date().toISOString() })
            }
          }
        })
        // Global AuditLog (one entry for the whole stock entry)
        try {
          await (prisma as any).auditLog.create({ data: {
            actorId: (req as any).auth?.sub || null,
            role: (req as any).auth?.role || null,
            action: 'stock.entry',
            resourceId: data.boutiqueId,
            metadata: { items: data.items, reference: data.reference || null },
          } })
        } catch {}
        return { ok: true }
      } catch (e) {
        console.warn('[stock.service] Prisma entries failed, fallback to memory:', e)
      }
    }
  }
  // memory fallback
  const bq = memoryBoutiques.find(b => b.id === data.boutiqueId)
  if (!bq) throw new Error('Boutique not found')
  data.items.forEach(it => memoryUpsert(data.boutiqueId, it.productId, it.quantity))
  return { ok: true }
}

export async function adjustStock(req: Request, data: { boutiqueId: string; productId: string; delta: number; reason: string }) {
  if (useDb) {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      try {
        const existing = await prisma.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId: data.boutiqueId, productId: data.productId } } })
        if (existing) {
          const nextQty = Number(existing.quantity) + Number(data.delta)
          const updated = await prisma.stock.update({ where: { boutiqueId_productId: { boutiqueId: data.boutiqueId, productId: data.productId } }, data: { quantity: nextQty as any } })
          try {
            await (prisma as any).stockAudit.create({ data: { boutiqueId: data.boutiqueId, productId: data.productId, delta: data.delta, reason: data.reason, userId: (req as any).auth?.sub || null } })
          } catch {
            memoryAudits.push({ id: `audit-${Date.now()}`, boutiqueId: data.boutiqueId, productId: data.productId, delta: data.delta, reason: data.reason, userId: (req as any).auth?.sub, createdAt: new Date().toISOString() })
          }
          // Global AuditLog (adjust)
          try {
            await (prisma as any).auditLog.create({ data: {
              actorId: (req as any).auth?.sub || null,
              role: (req as any).auth?.role || null,
              action: 'stock.adjust',
              resourceId: data.productId,
              metadata: { boutiqueId: data.boutiqueId, delta: data.delta, reason: data.reason },
            } })
          } catch {}
          return { ok: true, quantity: Number(updated.quantity) }
        } else {
          const created = await prisma.stock.create({ data: { boutiqueId: data.boutiqueId, productId: data.productId, quantity: data.delta as any } })
          try {
            await (prisma as any).stockAudit.create({ data: { boutiqueId: data.boutiqueId, productId: data.productId, delta: data.delta, reason: data.reason, userId: (req as any).auth?.sub || null } })
          } catch {
            memoryAudits.push({ id: `audit-${Date.now()}`, boutiqueId: data.boutiqueId, productId: data.productId, delta: data.delta, reason: data.reason, userId: (req as any).auth?.sub, createdAt: new Date().toISOString() })
          }
          // Global AuditLog (adjust create)
          try {
            await (prisma as any).auditLog.create({ data: {
              actorId: (req as any).auth?.sub || null,
              role: (req as any).auth?.role || null,
              action: 'stock.adjust',
              resourceId: data.productId,
              metadata: { boutiqueId: data.boutiqueId, delta: data.delta, reason: data.reason },
            } })
          } catch {}
          return { ok: true, quantity: Number(created.quantity) }
        }
      } catch (e) {
        console.warn('[stock.service] Prisma adjust failed, fallback to memory:', e)
      }
    }
  }
  const newQty = memoryUpsert(data.boutiqueId, data.productId, data.delta)
  memoryAudits.push({ id: `audit-${Date.now()}`, boutiqueId: data.boutiqueId, productId: data.productId, delta: data.delta, reason: data.reason, userId: (req as any).auth?.sub, createdAt: new Date().toISOString() })
  return { ok: true, quantity: newQty }
}

export async function getStockAudit(req: Request, productId: string, limit = 50) {
  if (useDb) {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      try {
        const rows = await (prisma as any).stockAudit.findMany({ where: { productId }, orderBy: { createdAt: 'desc' }, take: limit })
        return rows
      } catch (e) {
        console.warn('[stock.service] Prisma audit fetch failed, fallback to memory:', e)
      }
    }
  }
  return memoryAudits.filter(a => a.productId === productId).slice(-limit).reverse()
}
