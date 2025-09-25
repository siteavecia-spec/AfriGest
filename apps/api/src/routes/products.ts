import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { products, Product, sectorTemplates } from '../stores/memory'
import { getTenantClientFromReq } from '../db'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const prisma = getTenantClientFromReq(req)
  if (prisma) {
    try {
      const rows = await prisma.product.findMany({ orderBy: { name: 'asc' } })
      return res.json(rows)
    } catch (e) {
      // Fallback to in-memory if DB not available
      console.warn('Prisma tenant fetch failed, falling back to memory:', e)
    }
  }
  return res.json(products)
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
  const prisma = getTenantClientFromReq(req)
  if (prisma) {
    try {
      const created = await prisma.product.create({ data: { ...parsed.data, isActive: true, taxRate: parsed.data.taxRate ?? 0 } as any })
      return res.status(201).json(created)
    } catch (e) {
      console.warn('Prisma tenant create failed, falling back to memory:', e)
    }
  }
  const id = `prod-${Date.now()}`
  const product: Product = { id, isActive: true, ...parsed.data }
  products.push(product)
  return res.status(201).json(product)
})

// Sector templates for multi-sector product attributes
router.get('/templates', requireAuth, (_req, res) => {
  res.json(sectorTemplates)
})

export default router
