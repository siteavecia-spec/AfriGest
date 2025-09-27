import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { Product, sectorTemplates, products as memoryProducts } from '../stores/memory'
import { listSectorTemplatesMerged, addTenantCustomAttribute, removeTenantCustomAttribute } from '../services/templates'
import { listProducts as svcListProducts, createProduct as svcCreateProduct } from '../services/products'
import { getTenantClientFromReq } from '../db'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const limitRaw = (req.query.limit || '').toString()
  const offsetRaw = (req.query.offset || '').toString()
  const limit = limitRaw ? Math.max(1, Math.min(200, Number(limitRaw))) : undefined
  const offset = offsetRaw ? Math.max(0, Number(offsetRaw)) : undefined
  const rows = await svcListProducts(req, { limit, offset })
  // X-Total-Count header
  try {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      const total = await prisma.product.count()
      res.setHeader('X-Total-Count', String(total))
    } else {
      res.setHeader('X-Total-Count', String(memoryProducts.length))
    }
  } catch {
    res.setHeader('X-Total-Count', String(memoryProducts.length))
  }
  return res.json(rows)
})

const createSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  cost: z.number().nonnegative(),
  barcode: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  sector: z.string().optional(),
  attrs: z.record(z.any()).optional()
})

router.post('/', requireAuth, requireRole('super_admin', 'pdg', 'dg'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  // Dynamic per-sector validation using templates
  try {
    const templates = await listSectorTemplatesMerged(req).catch(() => sectorTemplates)
    const sectorKey = parsed.data.sector || 'generic'
    const tpl = templates.find((t: any) => t.key === sectorKey) || null
    if (!tpl && sectorKey !== 'generic') return res.status(400).json({ error: `Unknown sector '${sectorKey}'` })
    const attrs = parsed.data.attrs || {}
    const errors: string[] = []
    const checkType = (val: any, type: string) => {
      if (val == null) return true
      switch (type) {
        case 'string': return typeof val === 'string'
        case 'text': return typeof val === 'string'
        case 'number': return typeof val === 'number' && Number.isFinite(val)
        case 'date': return typeof val === 'string' && !Number.isNaN(Date.parse(val))
        default: return true
      }
    }
    if (tpl) {
      for (const a of (tpl.attributes || [])) {
        const present = attrs[a.key] !== undefined && attrs[a.key] !== null && attrs[a.key] !== ''
        if ((a as any).required && !present) errors.push(`Missing required attribute: ${a.key}`)
        if (attrs[a.key] !== undefined && !checkType(attrs[a.key], a.type)) errors.push(`Invalid type for attribute '${a.key}' (expected ${a.type})`)
      }
    }
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors })
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Sector validation error' })
  }
  const created = await svcCreateProduct(req, parsed.data)
  return res.status(201).json(created as Product)
})

// Sector templates for multi-sector product attributes
router.get('/templates', requireAuth, async (req, res) => {
  try {
    const data = await listSectorTemplatesMerged(req)
    return res.json(data)
  } catch (e: any) {
    // fallback memory
    return res.json(sectorTemplates)
  }
})

// Add custom attribute for a sector (PDG)
router.post('/templates/custom', requireAuth, requireRole('super_admin', 'pdg'), async (req, res) => {
  const schema = z.object({ sectorKey: z.string().min(1), key: z.string().min(1), label: z.string().min(1), type: z.enum(['string','number','date','text']), required: z.boolean().optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  try {
    const created = await addTenantCustomAttribute(req, parsed.data)
    return res.status(201).json(created)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to add custom attribute' })
  }
})

// Remove custom attribute for a sector
router.delete('/templates/custom', requireAuth, requireRole('super_admin', 'pdg'), async (req, res) => {
  const schema = z.object({ sectorKey: z.string().min(1), key: z.string().min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  try {
    const removed = await removeTenantCustomAttribute(req, parsed.data.sectorKey, parsed.data.key)
    return res.json(removed)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to remove custom attribute' })
  }
})

// Export products as CSV for a given sector (flattening template attributes)
router.get('/export', requireAuth, async (req, res) => {
  const sectorKey = (req.query.sector || '').toString() || 'all'
  try {
    const templates = await listSectorTemplatesMerged(req).catch(() => sectorTemplates)
    const tpl = sectorKey === 'all' ? null : templates.find((t: any) => t.key === sectorKey)
    const rows = await svcListProducts(req)
    const items = rows.filter((p: any) => sectorKey === 'all' || (p.sector || 'generic') === sectorKey)
    const attrKeys = tpl ? (tpl.attributes || []).map((a: any) => a.key) : Array.from(new Set(items.flatMap((p: any) => Object.keys(p.attrs || {}))))
    const header = ['id','sku','name','price','cost','barcode','taxRate','sector', ...attrKeys]
    const esc = (v: any) => '"' + String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ') + '"'
    const lines = [header.join(',')]
    for (const p of items) {
      const row = [p.id, p.sku, p.name, p.price, p.cost, p.barcode ?? '', p.taxRate ?? '', p.sector ?? '']
      for (const k of attrKeys) row.push((p.attrs || {})[k] ?? '')
      lines.push(row.map(esc).join(','))
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="products_${sectorKey}.csv"`)
    return res.send(lines.join('\n'))
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to export products' })
  }
})

// Import products from JSON payload shaped by sector template
router.post('/import', requireAuth, requireRole('super_admin', 'pdg', 'dg'), async (req, res) => {
  const schema = z.object({ sectorKey: z.string().min(1), items: z.array(z.record(z.any())).min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const { sectorKey, items } = parsed.data
  const created: any[] = []
  const errors: any[] = []
  for (const [idx, it] of items.entries()) {
    try {
      const payload: any = {
        sku: String(it.sku || '').trim(),
        name: String(it.name || '').trim(),
        price: Number(it.price || 0),
        cost: Number(it.cost || 0),
        barcode: it.barcode ? String(it.barcode) : undefined,
        taxRate: it.taxRate != null ? Number(it.taxRate) : undefined,
        sector: sectorKey,
        attrs: it.attrs || {}
      }
      if (!payload.sku || !payload.name) throw new Error('Missing sku/name')
      const row = await svcCreateProduct(req, payload)
      created.push({ id: row.id, sku: row.sku })
    } catch (e: any) {
      errors.push({ index: idx, error: e?.message || 'Failed to import row' })
    }
  }
  return res.json({ createdCount: created.length, errorCount: errors.length, created, errors })
})

// PATCH /products/:id — update product basic fields (name, price, cost, barcode, taxRate, sector, attrs)
router.patch('/:id', requireAuth, requireRole('super_admin', 'pdg', 'dg'), async (req, res) => {
  const id = (req.params.id || '').toString()
  const schema = z.object({
    name: z.string().optional(),
    price: z.number().nonnegative().optional(),
    cost: z.number().nonnegative().optional(),
    barcode: z.string().optional(),
    taxRate: z.number().min(0).max(100).optional(),
    sector: z.string().optional(),
    attrs: z.record(z.any()).optional()
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  try {
    const prisma = getTenantClientFromReq(req)
    if (prisma?.product) {
      const data: any = {}
      if (parsed.data.name !== undefined) data.name = parsed.data.name
      if (parsed.data.price !== undefined) data.price = parsed.data.price as any
      if (parsed.data.cost !== undefined) data.cost = parsed.data.cost as any
      if (parsed.data.barcode !== undefined) data.barcode = parsed.data.barcode
      if (parsed.data.taxRate !== undefined) data.taxRate = parsed.data.taxRate as any
      if (parsed.data.sector !== undefined) data.sector = parsed.data.sector
      if (parsed.data.attrs !== undefined) data.attrs = parsed.data.attrs
      const updated = await (prisma as any).product.update({ where: { id }, data })
      return res.json(updated)
    }
  } catch (e: any) {
    // fallback to memory
  }
  // Memory fallback
  const idx = (memoryProducts as any).findIndex((p: any) => p.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  const next = { ...((memoryProducts as any)[idx]) }
  Object.assign(next, parsed.data)
  ;(memoryProducts as any)[idx] = next
  return res.json(next)
})

// Search with advanced filters (MVP: filter in memory/JS)
// GET /products/search?q=...&sector=pharmacy&expiryBefore=2025-12-31&warrantyLtDays=30&attr.color=Rouge
router.get('/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase().trim()
  const sectorKey = (req.query.sector || '').toString().trim() || 'all'
  const expiryBeforeRaw = (req.query.expiryBefore || '').toString().trim()
  const warrantyLtDaysRaw = (req.query.warrantyLtDays || '').toString().trim()
  const expiryBefore = expiryBeforeRaw ? new Date(expiryBeforeRaw) : null
  const warrantyLtDays = warrantyLtDaysRaw ? Number(warrantyLtDaysRaw) : null
  const now = new Date()
  try {
    const items = await svcListProducts(req)
    // Collect attr.* filters
    const attrFilters: Record<string, string> = {}
    Object.keys(req.query).forEach((k) => {
      if (k.startsWith('attr.')) attrFilters[k.slice(5)] = (req.query as any)[k].toString().toLowerCase()
    })
    const out = (items || []).filter((p: any) => {
      if (sectorKey !== 'all' && (p.sector || 'generic') !== sectorKey) return false
      if (q) {
        const base = `${p.name || ''} ${p.sku || ''} ${(p.barcode || '')}`.toLowerCase()
        const attrsText = p.attrs ? Object.values(p.attrs).join(' ').toLowerCase() : ''
        if (!base.includes(q) && !attrsText.includes(q)) return false
      }
      // expiryBefore
      if (expiryBefore) {
        const ed = p?.attrs?.expiry ? new Date(p.attrs.expiry) : null
        if (!(ed && ed.getTime() <= expiryBefore.getTime())) return false
      }
      // warrantyLtDays
      if (warrantyLtDays != null && Number.isFinite(warrantyLtDays)) {
        const months = Number(p?.attrs?.warranty)
        const purchaseDate = p?.attrs?.purchaseDate || p?.attrs?.purchasedAt
        if (Number.isFinite(months) && purchaseDate) {
          const start = new Date(purchaseDate)
          const end = new Date(start)
          end.setMonth(end.getMonth() + Number(months))
          const diffDays = Math.floor((end.getTime() - now.getTime()) / (1000*60*60*24))
          if (!(diffDays >= 0 && diffDays <= Number(warrantyLtDays))) return false
        } else {
          return false
        }
      }
      // attr.* exact/contains match (case-insensitive contains)
      for (const [ak, av] of Object.entries(attrFilters)) {
        const val = p?.attrs?.[ak]
        if (val == null) return false
        if (typeof val === 'string') {
          if (!val.toLowerCase().includes(av)) return false
        } else if (typeof val === 'number') {
          if (String(val).toLowerCase() !== av) return false
        } else {
          if (String(val).toLowerCase().includes(av) === false) return false
        }
      }
      return true
    })
    return res.json({ items: out })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Search failed' })
  }
})

export default router
