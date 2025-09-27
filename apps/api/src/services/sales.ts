import { Request } from 'express'
import { products as memoryProducts, sales as memorySales, getStock as memoryGetStock, upsertStock as memoryUpsertStock } from '../stores/memory'
import { getTenantClientFromReq } from '../db'

const useDb = (process.env.USE_DB || '').toLowerCase() === 'true'

export interface SaleItem { productId: string; quantity: number; unitPrice: number; discount?: number }
export interface SalePayment { method: 'cash' | 'mobile_money' | 'card'; amount: number; ref?: string }

export async function listSales(req: Request, limit = 50, offset = 0) {
  if (useDb) {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      try {
        // Return latest sales with items
        const rows = await (prisma as any).sale.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset || undefined,
          include: { items: true },
        })
        const mapped = rows.map((s: any) => ({
          id: s.id,
          boutiqueId: s.boutiqueId,
          items: (s.items || []).map((it: any) => ({ productId: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), discount: Number(it.discount || 0) })),
          total: Number(s.total || 0),
          paymentMethod: s.paymentMethod,
          currency: s.currency,
          createdAt: s.createdAt,
          offlineId: s.offlineId || null,
        }))
        return mapped
      } catch (e) {
        console.warn('[sales.service] Prisma list failed, fallback to memory:', e)
      }
    }
  }
  const data = memorySales.slice().reverse()
  return data.slice(offset, offset + limit)
}

export async function getSalesSummary(req: Request, boutiqueId?: string) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const start = new Date(y, m, d).getTime()
  const end = start + 24 * 60 * 60 * 1000

  if (useDb) {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      try {
        const where: any = { createdAt: { gte: new Date(start), lt: new Date(end) } }
        if (boutiqueId && boutiqueId !== 'all') where.boutiqueId = boutiqueId
        const rows = await (prisma as any).sale.findMany({
          where,
          include: { items: true },
        })
        const count = rows.length
        const total = rows.reduce((sum: number, s: any) => sum + Number(s.total || 0), 0)
        const qtyMap = new Map<string, { qty: number; amount: number }>()
        rows.forEach((s: any) => {
          (s.items || []).forEach((it: any) => {
            const v = qtyMap.get(it.productId) || { qty: 0, amount: 0 }
            v.qty += Number(it.quantity)
            v.amount += Number(it.quantity) * Number(it.unitPrice) - Number(it.discount || 0)
            qtyMap.set(it.productId, v)
          })
        })
        let topProduct: any = null
        qtyMap.forEach((v, pid) => {
          if (!topProduct || v.qty > topProduct.quantity) topProduct = { productId: pid, quantity: v.qty, total: v.amount }
        })
        // Optionally resolve sku/name from memory if needed (fast path); later, join Product if required
        if (topProduct) {
          const p = memoryProducts.find(p => p.id === topProduct.productId)
          if (p) topProduct = { ...topProduct, sku: p.sku, name: p.name }
        }
        return { today: { count, total }, topProduct }
      } catch (e) {
        console.warn('[sales.service] Prisma summary failed, fallback to memory:', e)
      }
    }
  }

  const todays = memorySales.filter(s => {
    const t = new Date(s.createdAt).getTime()
    return t >= start && t < end
  })
  const count = todays.length
  const total = todays.reduce((sum, s) => sum + (s.total || 0), 0)

  const qtyMap = new Map<string, { qty: number; amount: number }>()
  todays.forEach(s => {
    s.items.forEach(it => {
      const v = qtyMap.get(it.productId) || { qty: 0, amount: 0 }
      v.qty += it.quantity
      v.amount += it.quantity * it.unitPrice - (it.discount || 0)
      qtyMap.set(it.productId, v)
    })
  })
  let topProduct: any = null
  qtyMap.forEach((v, pid) => {
    if (!topProduct || v.qty > topProduct.quantity) topProduct = { productId: pid, quantity: v.qty, total: v.amount }
  })
  if (topProduct) {
    const p = memoryProducts.find(p => p.id === topProduct.productId)
    if (p) topProduct = { ...topProduct, sku: p.sku, name: p.name }
  }
  return { today: { count, total }, topProduct }
}

export async function createSale(req: Request, data: { boutiqueId: string; items: SaleItem[]; paymentMethod: string; payments?: SalePayment[]; currency: string; offlineId?: string | null }) {
  if (useDb) {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      try {
        // Idempotency
        if (data.offlineId) {
          const existing = await (prisma as any).sale.findFirst({ where: { offlineId: data.offlineId } })
          if (existing) {
            const withItems = await (prisma as any).sale.findUnique({ where: { id: existing.id }, include: { items: true } })
            return {
              id: existing.id,
              boutiqueId: existing.boutiqueId,
              items: (withItems.items || []).map((it: any) => ({ productId: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), discount: Number(it.discount || 0) })),
              total: Number(existing.total || 0),
              paymentMethod: existing.paymentMethod,
              currency: existing.currency,
              createdAt: existing.createdAt,
              offlineId: existing.offlineId || null,
            }
          }
        }
        // Transaction: validate + deduct + create sale + sale items
        const result = await (prisma as any).$transaction(async (tx: any) => {
          // Validate stock
          for (const it of data.items) {
            const stock = await tx.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId: data.boutiqueId, productId: it.productId } } })
            const available = Number(stock?.quantity || 0)
            if (available < it.quantity) throw new Error('Insufficient stock')
          }
          // Deduct stock
          for (const it of data.items) {
            const stock = await tx.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId: data.boutiqueId, productId: it.productId } } })
            const nextQty = Number(stock?.quantity || 0) - it.quantity
            if (stock) await tx.stock.update({ where: { boutiqueId_productId: { boutiqueId: data.boutiqueId, productId: it.productId } }, data: { quantity: nextQty as any } })
            else await tx.stock.create({ data: { boutiqueId: data.boutiqueId, productId: it.productId, quantity: (0 - it.quantity) as any } })
          }
          // Create sale + items
          const total = data.items.reduce((sum, it) => sum + (it.unitPrice * it.quantity - (it.discount || 0)), 0)
          // Validate payments if provided
          if (Array.isArray(data.payments) && data.payments.length > 0) {
            const sum = data.payments.reduce((s, p) => s + Number(p.amount || 0), 0)
            const ok = Math.abs(sum - Number(total)) < 0.01
            if (!ok) throw new Error('Payments total does not match sale total')
          }
          const created = await tx.sale.create({ data: { boutiqueId: data.boutiqueId, total: total as any, paymentMethod: data.paymentMethod, currency: data.currency, cashierUserId: (req as any).auth?.sub || null, createdAt: new Date(), offlineId: data.offlineId || null } })
          for (const it of data.items) {
            await tx.saleItem.create({ data: { saleId: created.id, productId: it.productId, quantity: it.quantity as any, unitPrice: it.unitPrice as any, discount: (it.discount || 0) as any } })
          }
          if (Array.isArray(data.payments)) {
            for (const pmt of data.payments) {
              await (tx as any).payment.create({ data: { saleId: created.id, method: pmt.method, amount: (pmt.amount || 0) as any, reference: pmt.ref || null } })
            }
          }
          return created.id
        })
        const saved = await (prisma as any).sale.findUnique({ where: { id: result }, include: { items: true, payments: true } })
        // Global AuditLog for sale.create
        try {
          await (prisma as any).auditLog.create({ data: {
            actorId: (req as any).auth?.sub || null,
            role: (req as any).auth?.role || null,
            action: 'sale.create',
            resourceId: saved.id,
            metadata: {
              boutiqueId: saved.boutiqueId,
              total: Number(saved.total || 0),
              paymentMethod: saved.paymentMethod,
              currency: saved.currency,
              items: (saved.items || []).map((it:any) => ({ productId: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), discount: Number(it.discount||0) })),
              offlineId: data.offlineId || null
            },
          } })
        } catch {}
        return {
          id: saved.id,
          boutiqueId: saved.boutiqueId,
          items: (saved.items || []).map((it: any) => ({ productId: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), discount: Number(it.discount || 0) })),
          total: Number(saved.total || 0),
          paymentMethod: saved.paymentMethod,
          currency: saved.currency,
          createdAt: saved.createdAt,
          offlineId: saved.offlineId || null,
          payments: (saved as any).payments ? (saved as any).payments.map((p: any) => ({ method: p.method, amount: Number(p.amount || 0), ref: p.reference || undefined })) : undefined,
        }
      } catch (e) {
        console.warn('[sales.service] Prisma create failed, fallback to memory:', e)
      }
    }
  }
  // Memory fallback
  // Validate products and stock
  for (const it of data.items) {
    const prod = memoryProducts.find(p => p.id === it.productId)
    if (!prod) throw new Error(`Invalid product ${it.productId}`)
    const available = memoryGetStock(data.boutiqueId, it.productId)
    if (available < it.quantity) throw new Error(`Insufficient stock for ${prod.name}`)
  }
  // Deduct stock
  data.items.forEach(it => memoryUpsertStock(data.boutiqueId, it.productId, -it.quantity))
  const total = data.items.reduce((sum, it) => sum + (it.unitPrice * it.quantity - (it.discount || 0)), 0)
  // Validate payments
  if (Array.isArray(data.payments) && data.payments.length > 0) {
    const sum = data.payments.reduce((s, p) => s + Number(p.amount || 0), 0)
    const ok = Math.abs(sum - Number(total)) < 0.01
    if (!ok) throw new Error('Payments total does not match sale total')
  }
  const sale = {
    id: `sale-${Date.now()}`,
    boutiqueId: data.boutiqueId,
    items: data.items,
    total,
    paymentMethod: data.paymentMethod,
    currency: data.currency,
    cashierUserId: (req as any).auth?.sub,
    createdAt: new Date().toISOString(),
    offlineId: data.offlineId || null
  }
  // Idempotency in memory
  if (data.offlineId) {
    const existing = memorySales.find(s => s.offlineId === data.offlineId)
    if (existing) return existing
  }
  memorySales.push(sale as any)
  return sale
}
