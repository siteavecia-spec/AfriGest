import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { products, upsertStock, boutiques, suppliers, type Supplier, sales, type Sale, stocks, stockAudits } from '../stores/memory'

const router = Router()
let lastSeedBasicAt: string | null = null
let lastSeedSalesAt: string | null = null

// POST /dev/seed/basic
// Seed minimal data for Phase 1 QA (in-memory): ensures stock quantities for demo products and adds a demo supplier
router.post('/seed/basic', requireAuth, requireRole('super_admin', 'pdg'), (req, res) => {
  // Ensure boutique exists
  const bq = boutiques.find(b => b.id === 'bq-1')
  if (!bq) return res.status(500).json({ error: 'Missing default boutique bq-1 in memory store' })

  // Ensure demo supplier
  let sup = suppliers.find(s => s.name === 'Fournisseur Démo')
  if (!sup) {
    const id = `sup-${Date.now()}`
    const supplier: Supplier = { id, name: 'Fournisseur Démo', contactName: 'Mme. Demo', phone: '+224600000000' }
    suppliers.push(supplier)
    sup = supplier
  }

  // Ensure some stock for existing demo products
  const wanted: Array<{ sku: string; qty: number }> = [
    { sku: 'SKU-TSHIRT', qty: 50 },
    { sku: 'SKU-SHOES', qty: 30 },
    { sku: 'SKU-SHAMPOO', qty: 100 }
  ]
  const applied: Array<{ productId: string; sku: string; qty: number }> = []
  for (const w of wanted) {
    const p = products.find(x => x.sku === w.sku)
    if (!p) continue
    // Set absolute quantity by reading current and applying delta
    const currentKey = `bq-1:${p.id}`
    // simulate a set by computing delta from current 0 (since getStock is in another module) — we will just add qty for demo
    upsertStock('bq-1', p.id, w.qty)
    applied.push({ productId: p.id, sku: p.sku, qty: w.qty })
  }

  lastSeedBasicAt = new Date().toISOString()
  return res.json({ ok: true, supplier: sup, applied, at: lastSeedBasicAt })
})

export default router

// Seed a few sales for today using demo products
router.post('/seed/sales', requireAuth, requireRole('super_admin', 'pdg', 'dg'), (req, res) => {
  const bq = boutiques.find(b => b.id === 'bq-1')
  if (!bq) return res.status(500).json({ error: 'Missing default boutique bq-1 in memory store' })
  const picks = [
    { sku: 'SKU-TSHIRT', qty: 2 },
    { sku: 'SKU-SHOES', qty: 1 },
    { sku: 'SKU-SHAMPOO', qty: 3 }
  ]
  const created: Sale[] = []
  const now = new Date().toISOString()
  for (const p of picks) {
    const prod = products.find(x => x.sku === p.sku)
    if (!prod) continue
    // decrement stock
    upsertStock('bq-1', prod.id, -p.qty)
    const item = { productId: prod.id, quantity: p.qty, unitPrice: prod.price, discount: 0 }
    const total = item.quantity * item.unitPrice
    const sale: Sale = {
      id: `sale-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      boutiqueId: 'bq-1',
      items: [item],
      total,
      paymentMethod: 'cash',
      currency: 'GNF',
      createdAt: now
    }
    sales.push(sale)
    created.push(sale)
  }
  lastSeedSalesAt = new Date().toISOString()
  return res.json({ ok: true, created: created.map(s => ({ id: s.id, total: s.total })), at: lastSeedSalesAt })
})

// GET /dev/status — quick overview for QA
router.get('/status', requireAuth, requireRole('super_admin', 'pdg', 'dg'), (req, res) => {
  const productCount = products.length
  const supplierCount = suppliers.length
  const salesCount = sales.length
  const stockAuditCount = stockAudits.length
  const bq = boutiques.find(b => b.id === 'bq-1')
  let lowAlerts = 0
  if (bq) {
    const thresholds = new Map<string, number>() // default threshold 5; clients can override per-product later in DB
    for (const p of products) {
      const qty = stocks.get(`bq-1:${p.id}`) ?? 0
      const th = thresholds.get(p.id) ?? 5
      if (qty <= th) lowAlerts++
    }
  }
  return res.json({ ok: true, counts: { products: productCount, suppliers: supplierCount, sales: salesCount, stockAudits: stockAuditCount, lowAlerts }, seeds: { basicAt: lastSeedBasicAt, salesAt: lastSeedSalesAt } })
})
