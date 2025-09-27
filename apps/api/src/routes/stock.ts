import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { requirePermission } from '../middleware/authorization'
import { boutiques, products } from '../stores/memory'
import * as svc from '../services/stock'

const router = Router()

// GET /stock/summary?boutiqueId=...
router.get('/summary', requireAuth, requirePermission('stock', 'read'), async (req, res) => {
  const boutiqueId = (req.query.boutiqueId || '').toString()
  if (!boutiqueId) return res.status(400).json({ error: 'Missing boutiqueId' })
  const out = await svc.getStockSummary(req, boutiqueId)
  res.json(out)
})

// POST /stock/entries
const entrySchema = z.object({
  boutiqueId: z.string().min(1),
  reference: z.string().optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive(), unitCost: z.number().nonnegative() })).min(1).max(100)
})

router.post('/entries', requireAuth, requireRole('super_admin', 'pdg', 'dg'), requirePermission('stock', 'update'), async (req, res) => {
  const parsed = entrySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const { boutiqueId } = parsed.data
  const bq = boutiques.find(b => b.id === boutiqueId)
  if (!bq) return res.status(404).json({ error: 'Boutique not found' })
  const out = await svc.createStockEntry(req, parsed.data)
  return res.status(201).json(out)
})

// POST /stock/adjust
const adjustSchema = z.object({
  boutiqueId: z.string().min(1),
  productId: z.string().min(1),
  delta: z.number().int(),
  reason: z.string().min(1)
})

router.post('/adjust', requireAuth, requireRole('super_admin', 'pdg', 'dg'), requirePermission('stock', 'update'), async (req, res) => {
  const parsed = adjustSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const { boutiqueId, productId, delta, reason } = parsed.data
  const bq = boutiques.find(b => b.id === boutiqueId)
  if (!bq) return res.status(404).json({ error: 'Boutique not found' })
  const prod = products.find(p => p.id === productId)
  if (!prod) return res.status(404).json({ error: 'Product not found' })
  const out = await svc.adjustStock(req, { boutiqueId, productId, delta, reason })
  return res.status(201).json(out)
})

// GET /stock/audit?productId=...&limit=...
router.get('/audit', requireAuth, requireRole('super_admin', 'pdg', 'dg'), requirePermission('stock', 'read'), async (req, res) => {
  const productId = (req.query.productId || '').toString()
  const rawLimit = Number((req.query.limit || 50).toString())
  const limit = Math.max(1, Math.min(200, Number.isFinite(rawLimit) ? rawLimit : 50))
  if (!productId) return res.status(400).json({ error: 'Missing productId' })
  const rows = await svc.getStockAudit(req, productId, limit)
  return res.json(rows)
})

export default router
