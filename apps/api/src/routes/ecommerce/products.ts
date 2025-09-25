import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth'
import { getTenantClientFromReq } from '../../db'
import { listEcommerceProducts } from '../../services/ecommerce/catalogService'

const router = Router({ mergeParams: true })

// GET /api/tenants/:tenantId/ecommerce/products
router.get('/', requireAuth, async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req)
  if (!prisma) return res.json({ items: [], tenantId })
  try {
    const items = await listEcommerceProducts(prisma as any, tenantId)
    return res.json({ items, tenantId })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to load ecommerce products' })
  }
})

// POST /api/tenants/:tenantId/ecommerce/products
const upsertSchema = z.object({
  sku: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  currency: z.string().default('GNF'),
  images: z.array(z.string().url()).optional().default([]),
  variants: z.array(z.record(z.any())).optional().default([]),
  isOnlineAvailable: z.boolean().default(true),
  onlineStockMode: z.enum(['shared', 'dedicated']).default('shared'),
  onlineStockQty: z.number().int().nonnegative().optional()
})

router.post('/', requireAuth, async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req)
  // TODO: create or update product in catalog for tenantId
  return res.status(201).json({ ok: true, tenantId })
})

// PATCH /api/tenants/:tenantId/ecommerce/products/:sku
router.patch('/:sku', requireAuth, async (req, res) => {
  const { sku } = req.params as { sku: string }
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req)
  // TODO: update fields
  return res.json({ ok: true, sku, tenantId })
})

// DELETE /api/tenants/:tenantId/ecommerce/products/:sku
router.delete('/:sku', requireAuth, async (req, res) => {
  const { sku } = req.params as { sku: string }
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req)
  // TODO: soft-delete or mark offline
  return res.json({ ok: true, sku, tenantId })
})

export default router
