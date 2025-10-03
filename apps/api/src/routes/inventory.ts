import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorization'
import { getTenantClientFromReq } from '../db'
import { auditReq } from '../services/audit'
import { getStock, stocks, products as memProducts } from '../stores/memory'

const router = Router()

// GET /inventory/summary?boutiqueId=ID
router.get('/summary', requireAuth, requirePermission('stock', 'read'), async (req, res) => {
  const boutiqueId = String(req.query.boutiqueId || '')
  if (!boutiqueId) return res.status(400).json({ error: 'Missing boutiqueId' })
  const prisma: any = getTenantClientFromReq(req)
  try {
    if (prisma?.stock) {
      const rows = await prisma.stock.findMany({ where: { boutiqueId } })
      const payload = { boutiqueId, summary: rows.map((r: any) => ({ productId: r.productId, quantity: Number(r.quantity) })) }
      try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'inventory.summary.read', resource: boutiqueId }) } catch {}
      return res.json(payload)
    } else {
      // Build summary from in-memory stocks map and mem products list
      const items: Array<{ productId: string; sku?: string; name?: string; quantity: number }> = []
      for (const p of memProducts) {
        const qty = getStock(boutiqueId, p.id)
        if (qty !== 0) items.push({ productId: p.id, sku: (p as any).sku, name: (p as any).name, quantity: qty })
      }
      // Also include explicit zero for products not yet in stock could be large; keep to existing only
      const payload = { boutiqueId, summary: items }
      try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'inventory.summary.read', resource: boutiqueId }) } catch {}
      return res.json(payload)
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to get inventory summary' })
  }
})

// POST /inventory/sessions — create an inventory session and compute variance (MVP)
// { boutiqueId, items: [{ productId, counted: number, unitPrice?: number }] }
const createSchema = z.object({
  boutiqueId: z.string().min(1),
  items: z.array(z.object({ productId: z.string().min(1), counted: z.number().finite().min(0), unitPrice: z.number().finite().min(0).optional() })).min(1)
})

router.post('/sessions', requireAuth, requirePermission('stock', 'update'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const { boutiqueId, items } = parsed.data
  const prisma: any = getTenantClientFromReq(req)
  try {
    const results: Array<{ productId: string; expected: number; counted: number; delta: number; unitPrice?: number; valueDelta?: number }> = []
    if (prisma?.stock) {
      // Read expected from DB; do not mutate stock in MVP
      for (const it of items) {
        const r = await prisma.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId, productId: it.productId } } })
        const expected = Number(r?.quantity || 0)
        const delta = it.counted - expected
        const valueDelta = it.unitPrice ? delta * it.unitPrice : undefined
        results.push({ productId: it.productId, expected, counted: it.counted, delta, unitPrice: it.unitPrice, valueDelta })
      }
    } else {
      for (const it of items) {
        const expected = stocks.get(`${boutiqueId}:${it.productId}`) ?? 0
        const delta = it.counted - expected
        const valueDelta = it.unitPrice ? delta * it.unitPrice : undefined
        results.push({ productId: it.productId, expected, counted: it.counted, delta, unitPrice: it.unitPrice, valueDelta })
      }
    }
    const id = 'inv-' + Date.now()
    const createdAt = new Date().toISOString()
    const payload = { id, boutiqueId, createdAt, items: results, totalDelta: results.reduce((s, r) => s + r.delta, 0), totalValueDelta: results.reduce((s, r) => s + (r.valueDelta || 0), 0) }
    try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'inventory.session.create', resource: boutiqueId, meta: { items: items.length } }) } catch {}
    return res.status(201).json(payload)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to create inventory session' })
  }
})

export default router
