import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { boutiques, getStock, products, upsertStock, stockAudits } from '../stores/memory'

const router = Router()

// GET /stock/summary?boutiqueId=...
router.get('/summary', requireAuth, (req, res) => {
  const boutiqueId = (req.query.boutiqueId || '').toString()
  if (!boutiqueId) return res.status(400).json({ error: 'Missing boutiqueId' })
  const summary = products.map(p => ({
    productId: p.id,
    sku: p.sku,
    name: p.name,
    quantity: getStock(boutiqueId, p.id)
  }))
  res.json({ boutiqueId, summary })
})

// POST /stock/entries
const entrySchema = z.object({
  boutiqueId: z.string().min(1),
  reference: z.string().optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive(), unitCost: z.number().nonnegative() }))
})

router.post('/entries', requireAuth, requireRole('super_admin', 'pdg', 'dg'), (req, res) => {
  const parsed = entrySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const { boutiqueId, items } = parsed.data
  const bq = boutiques.find(b => b.id === boutiqueId)
  if (!bq) return res.status(404).json({ error: 'Boutique not found' })

  items.forEach(it => upsertStock(boutiqueId, it.productId, it.quantity))
  return res.status(201).json({ ok: true })
})

// POST /stock/adjust
const adjustSchema = z.object({
  boutiqueId: z.string().min(1),
  productId: z.string().min(1),
  delta: z.number().int(),
  reason: z.string().min(1)
})

router.post('/adjust', requireAuth, requireRole('super_admin', 'pdg', 'dg'), (req, res) => {
  const parsed = adjustSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const { boutiqueId, productId, delta, reason } = parsed.data
  const bq = boutiques.find(b => b.id === boutiqueId)
  if (!bq) return res.status(404).json({ error: 'Boutique not found' })
  const prod = products.find(p => p.id === productId)
  if (!prod) return res.status(404).json({ error: 'Product not found' })

  const newQty = upsertStock(boutiqueId, productId, delta)
  stockAudits.push({
    id: `audit-${Date.now()}`,
    boutiqueId,
    productId,
    delta,
    reason,
    userId: (req as any).auth?.sub,
    createdAt: new Date().toISOString()
  })
  return res.status(201).json({ ok: true, quantity: newQty })
})

// GET /stock/audit?productId=...&limit=...
router.get('/audit', requireAuth, requireRole('super_admin', 'pdg', 'dg'), (req, res) => {
  const productId = (req.query.productId || '').toString()
  const limit = Number((req.query.limit || 50).toString())
  if (!productId) return res.status(400).json({ error: 'Missing productId' })
  const rows = stockAudits.filter(a => a.productId === productId).slice(-limit).reverse()
  return res.json(rows)
})

export default router
