import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorization'
import * as svc from '../services/sales'
import { products, sales as memorySales } from '../stores/memory'
import { getTenantClientFromReq } from '../db'
import { auditReq } from '../services/audit'

const router = Router()

// GET /sales?limit=...
router.get('/', requireAuth, requirePermission('pos', 'read'), async (req, res) => {
  const limit = Math.max(1, Math.min(200, Number((req.query.limit || 50).toString())))
  const rawOffset = Number((req.query.offset || 0).toString())
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.max(0, rawOffset) : 0
  const rows = await svc.listSales(req, limit, offset)
  try {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      const total = await (prisma as any).sale.count()
      res.setHeader('X-Total-Count', String(total))
    } else {
      res.setHeader('X-Total-Count', String(memorySales.length))
    }
  } catch {
    res.setHeader('X-Total-Count', String(memorySales.length))
  }
  try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'sales.read', resource: 'sales', meta: { limit, offset } }) } catch {}
  res.json(rows)
})

// GET /sales/summary — simple KPIs for today (in-memory)
router.get('/summary', requireAuth, requirePermission('pos', 'read'), async (req, res) => {
  const boutiqueId = (req.query.boutiqueId || '').toString() || undefined
  const out = await svc.getSalesSummary(req, boutiqueId)
  try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'sales.summary.read', resource: boutiqueId || 'all' }) } catch {}
  return res.json(out)
})

// GET /sales/eod?date=YYYY-MM-DD&boutiqueId=ID|all — End-of-day report
router.get('/eod', requireAuth, requirePermission('reports', 'read'), async (req, res) => {
  const dateStr = (req.query.date || '').toString()
  const boutiqueId = (req.query.boutiqueId || '').toString() || undefined
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return res.status(400).json({ error: 'Invalid or missing date (YYYY-MM-DD)' })
  const [y, m, d] = dateStr.split('-').map(n => Number(n))
  const start = new Date(y, m - 1, d).getTime()
  const end = start + 24 * 60 * 60 * 1000
  const prisma: any = getTenantClientFromReq(req)
  try {
    let rows: Array<{ id: string; boutiqueId: string; createdAt: string; paymentMethod: string; currency: string; total: number; items: Array<{ productId: string; quantity: number; unitPrice: number; discount?: number }> }>
    if (prisma?.sale) {
      const where: any = { createdAt: { gte: new Date(start), lt: new Date(end) } }
      if (boutiqueId && boutiqueId !== 'all') where.boutiqueId = boutiqueId
      const found = await prisma.sale.findMany({ where, include: { items: true } })
      rows = (found || []).map((s: any) => ({ id: s.id, boutiqueId: s.boutiqueId, createdAt: s.createdAt?.toISOString?.() || s.createdAt, paymentMethod: s.paymentMethod, currency: s.currency, total: Number(s.total), items: (s.items || []).map((it: any) => ({ productId: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), discount: Number(it.discount || 0) })) }))
    } else {
      rows = (memorySales || []).filter((r: any) => {
        const t = new Date(r.createdAt).getTime()
        return t >= start && t < end && (!boutiqueId || boutiqueId === 'all' || r.boutiqueId === boutiqueId)
      }).map((r: any) => ({ id: r.id, boutiqueId: r.boutiqueId, createdAt: r.createdAt, paymentMethod: r.paymentMethod, currency: r.currency, total: Number(r.total), items: r.items || [] }))
    }
    const payments: Record<string, number> = {}
    let count = 0; let revenue = 0
    rows.forEach(r => { count += 1; revenue += Number(r.total || 0); payments[r.paymentMethod] = (payments[r.paymentMethod] || 0) + Number(r.total || 0) })
    const lines = rows.map(r => ({
      id: r.id,
      boutiqueId: r.boutiqueId,
      createdAt: r.createdAt,
      paymentMethod: r.paymentMethod,
      currency: r.currency,
      total: r.total,
      items: (r.items || []).map((it: any) => `${it.productId}:${it.quantity}x${(it.unitPrice - (it.discount || 0))}`).join('|')
    }))
    const payload = { date: dateStr, boutiqueId: boutiqueId || 'all', totals: { count, revenue, payments }, lines }
    try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'sales.eod.read', resource: payload.boutiqueId, meta: { date: dateStr } }) } catch {}
    return res.json(payload)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to compute EOD' })
  }
})

// GET /sales/overview?from=YYYY-MM-DD&to=YYYY-MM-DD&boutiqueId=ID|all — Period aggregates for PDG
router.get('/overview', requireAuth, requirePermission('reports', 'read'), async (req, res) => {
  const from = (req.query.from || '').toString()
  const to = (req.query.to || '').toString()
  const boutiqueId = (req.query.boutiqueId || '').toString() || undefined
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return res.status(400).json({ error: 'Invalid or missing from/to (YYYY-MM-DD)' })
  const [fy, fm, fd] = from.split('-').map(n => Number(n))
  const [ty, tm, td] = to.split('-').map(n => Number(n))
  const start = new Date(fy, fm - 1, fd).getTime()
  const end = new Date(ty, tm - 1, td).getTime() + 24 * 60 * 60 * 1000
  const prisma: any = getTenantClientFromReq(req)
  try {
    let rows: Array<{ id: string; boutiqueId: string; createdAt: string; paymentMethod: string; currency: string; total: number; items: Array<{ productId: string; quantity: number; unitPrice: number; discount?: number }>; skuName?: Record<string, string> }>
    if (prisma?.sale) {
      const where: any = { createdAt: { gte: new Date(start), lt: new Date(end) } }
      if (boutiqueId && boutiqueId !== 'all') where.boutiqueId = boutiqueId
      const found = await prisma.sale.findMany({ where, include: { items: true } })
      rows = (found || []).map((s: any) => ({ id: s.id, boutiqueId: s.boutiqueId, createdAt: s.createdAt?.toISOString?.() || s.createdAt, paymentMethod: s.paymentMethod, currency: s.currency, total: Number(s.total), items: (s.items || []).map((it: any) => ({ productId: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), discount: Number(it.discount || 0) })) }))
    } else {
      rows = (memorySales || []).filter((r: any) => {
        const t = new Date(r.createdAt).getTime()
        return t >= start && t < end && (!boutiqueId || boutiqueId === 'all' || r.boutiqueId === boutiqueId)
      }).map((r: any) => ({ id: r.id, boutiqueId: r.boutiqueId, createdAt: r.createdAt, paymentMethod: r.paymentMethod, currency: r.currency, total: Number(r.total), items: r.items || [] }))
    }
    // Aggregates
    const payments: Record<string, number> = {}
    const dailyMap: Record<string, { count: number; revenue: number }> = {}
    const prodMap: Record<string, { quantity: number; revenue: number }> = {}
    let count = 0; let revenue = 0
    rows.forEach(r => {
      count += 1; revenue += Number(r.total || 0)
      payments[r.paymentMethod] = (payments[r.paymentMethod] || 0) + Number(r.total || 0)
      const d = (r.createdAt || '').slice(0, 10)
      const dm = (dailyMap[d] = dailyMap[d] || { count: 0, revenue: 0 })
      dm.count += 1; dm.revenue += Number(r.total || 0)
      ;(r.items || []).forEach((it: any) => {
        const key = it.productId
        const pm = (prodMap[key] = prodMap[key] || { quantity: 0, revenue: 0 })
        const net = Number(it.unitPrice) - Number(it.discount || 0)
        pm.quantity += Number(it.quantity)
        pm.revenue += net * Number(it.quantity)
      })
    })
    const dailySeries = Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, count: v.count, revenue: v.revenue }))
    const topProducts = Object.entries(prodMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 20).map(([productId, v]) => ({ productId, quantity: v.quantity, revenue: v.revenue }))
    const payload = { boutiqueId: boutiqueId || 'all', from, to, periodTotals: { count, revenue, payments }, dailySeries, topProducts }
    try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'sales.overview.read', resource: payload.boutiqueId, meta: { from, to } }) } catch {}
    return res.json(payload)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to compute overview' })
  }
})

const createSchema = z.object({
  boutiqueId: z.string().min(1),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPrice: z.number().nonnegative(),
      discount: z.number().nonnegative().optional()
    })
  ).min(1).max(100),
  paymentMethod: z.enum(['cash','mobile_money','card','mixed']).default('cash'),
  payments: z.array(z.object({ method: z.enum(['cash','mobile_money','card']), amount: z.number().nonnegative(), ref: z.string().optional() })).optional(),
  currency: z.string().min(3).max(3).default('GNF'),
  offlineId: z.string().max(120).optional()
})

// POST /sales (supports offlineId for idempotency)
router.post('/', requireAuth, requirePermission('pos', 'create'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  try {
    const created = await svc.createSale(req, {
      boutiqueId: parsed.data.boutiqueId,
      items: parsed.data.items,
      paymentMethod: parsed.data.paymentMethod,
      payments: parsed.data.payments,
      currency: parsed.data.currency,
      offlineId: parsed.data.offlineId || null
    })
    try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'sales.create', resource: created.id, meta: { boutiqueId: parsed.data.boutiqueId, items: parsed.data.items.length, paymentMethod: parsed.data.paymentMethod } }) } catch {}
    return res.status(201).json(created)
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Failed to create sale' })
  }
})

export default router
