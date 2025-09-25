import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { getStock, products, sales, upsertStock } from '../stores/memory'

const router = Router()

// GET /sales?limit=...
router.get('/', requireAuth, (req, res) => {
  const limit = Number((req.query.limit || 50).toString())
  res.json(sales.slice(-limit).reverse())
})

// GET /sales/summary — simple KPIs for today (in-memory)
router.get('/summary', requireAuth, (_req, res) => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const start = new Date(y, m, d).getTime()
  const end = start + 24 * 60 * 60 * 1000

  const todays = sales.filter(s => {
    const t = new Date(s.createdAt).getTime()
    return t >= start && t < end
  })
  const count = todays.length
  const total = todays.reduce((sum, s) => sum + (s.total || 0), 0)

  // Aggregate quantities by product
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
    const p = products.find(p => p.id === topProduct.productId)
    if (p) topProduct = { ...topProduct, sku: p.sku, name: p.name }
  }

  return res.json({ today: { count, total }, topProduct })
})

const createSchema = z.object({
  boutiqueId: z.string().min(1),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive(), unitPrice: z.number().nonnegative(), discount: z.number().nonnegative().optional() })),
  paymentMethod: z.string().min(1),
  currency: z.string().default('GNF'),
  offlineId: z.string().optional()
})

// POST /sales (supports offlineId for idempotency)
router.post('/', requireAuth, requireRole('super_admin', 'pdg', 'dg', 'employee'), (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const { boutiqueId, items, paymentMethod, currency, offlineId } = parsed.data

  // idempotency for offline sync
  if (offlineId) {
    const existing = sales.find(s => s.offlineId === offlineId)
    if (existing) return res.json(existing)
  }

  // validate products and stock
  for (const it of items) {
    const prod = products.find(p => p.id === it.productId)
    if (!prod) return res.status(400).json({ error: `Invalid product ${it.productId}` })
    const available = getStock(boutiqueId, it.productId)
    if (available < it.quantity) return res.status(400).json({ error: `Insufficient stock for ${prod.name}` })
  }

  // apply stock deduction
  items.forEach(it => upsertStock(boutiqueId, it.productId, -it.quantity))

  const total = items.reduce((sum, it) => sum + (it.unitPrice * it.quantity - (it.discount || 0)), 0)
  const sale = {
    id: `sale-${Date.now()}`,
    boutiqueId,
    items,
    total,
    paymentMethod,
    currency,
    cashierUserId: (req as any).auth?.sub,
    createdAt: new Date().toISOString(),
    offlineId: offlineId || null
  }
  sales.push(sale)
  res.status(201).json(sale)
})

export default router
