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
  // If DB is available, upsert product with attrs including images and flags
  if ((prisma as any)?.product) {
    try {
      const p: any = prisma as any
      const existing = await p.product.findUnique({ where: { sku: parsed.data.sku } }).catch(() => null)
      const attrs = {
        ...(existing?.attrs || {}),
        description: parsed.data.description,
        currency: parsed.data.currency,
        images: parsed.data.images || [],
        variants: parsed.data.variants || [],
        isOnlineAvailable: parsed.data.isOnlineAvailable,
        onlineStockMode: parsed.data.onlineStockMode,
        ...(parsed.data.onlineStockQty != null ? { onlineStockQty: parsed.data.onlineStockQty } : {})
      }
      const data = existing
        ? await p.product.update({ where: { sku: parsed.data.sku }, data: { name: parsed.data.title, price: parsed.data.price as any, attrs } })
        : await p.product.create({ data: { sku: parsed.data.sku, name: parsed.data.title, price: parsed.data.price as any, attrs, isActive: true } })
      return res.status(existing ? 200 : 201).json({ id: data.id, sku: data.sku, title: data.name, price: Number(data.price || 0), attrs: data.attrs, tenantId })
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Failed to upsert product' })
    }
  }
  // Fallback: memory mode not supported for persistence in this MVP
  return res.status(501).json({ error: 'Persistence not available in memory mode', tenantId })
})

// PATCH /api/tenants/:tenantId/ecommerce/products/:sku
router.patch('/:sku', requireAuth, async (req, res) => {
  const { sku } = req.params as { sku: string }
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req)
  const patchSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    price: z.number().nonnegative().optional(),
    currency: z.string().optional(),
    images: z.array(z.string().url()).optional(),
    variants: z.array(z.record(z.any())).optional(),
    isOnlineAvailable: z.boolean().optional(),
    onlineStockMode: z.enum(['shared', 'dedicated']).optional(),
    onlineStockQty: z.number().int().nonnegative().optional()
  })
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  if ((prisma as any)?.product) {
    try {
      const p: any = prisma as any
      const existing = await p.product.findUnique({ where: { sku } })
      if (!existing) return res.status(404).json({ error: 'Product not found' })
      const nextAttrs = { ...(existing.attrs || {}) }
      if (parsed.data.description !== undefined) (nextAttrs as any).description = parsed.data.description
      if (parsed.data.currency !== undefined) (nextAttrs as any).currency = parsed.data.currency
      if (parsed.data.images !== undefined) (nextAttrs as any).images = parsed.data.images
      if (parsed.data.variants !== undefined) (nextAttrs as any).variants = parsed.data.variants
      if (parsed.data.isOnlineAvailable !== undefined) (nextAttrs as any).isOnlineAvailable = parsed.data.isOnlineAvailable
      if (parsed.data.onlineStockMode !== undefined) (nextAttrs as any).onlineStockMode = parsed.data.onlineStockMode
      if (parsed.data.onlineStockQty !== undefined) (nextAttrs as any).onlineStockQty = parsed.data.onlineStockQty
      const data = await p.product.update({
        where: { sku },
        data: {
          ...(parsed.data.title !== undefined ? { name: parsed.data.title } : {}),
          ...(parsed.data.price !== undefined ? { price: parsed.data.price as any } : {}),
          attrs: nextAttrs
        }
      })
      return res.json({ id: data.id, sku: data.sku, title: data.name, price: Number(data.price || 0), attrs: data.attrs, tenantId })
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Failed to update product' })
    }
  }
  return res.status(501).json({ error: 'Persistence not available in memory mode', tenantId })
})

// DELETE /api/tenants/:tenantId/ecommerce/products/:sku
router.delete('/:sku', requireAuth, async (req, res) => {
  const { sku } = req.params as { sku: string }
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req)
  // TODO: soft-delete or mark offline
  return res.json({ ok: true, sku, tenantId })
})

// PATCH /api/tenants/:tenantId/ecommerce/products/:sku/images/add
router.patch('/:sku/images/add', requireAuth, async (req, res) => {
  const { sku } = req.params as { sku: string }
  const prisma = getTenantClientFromReq(req)
  const schema = z.object({ url: z.string().url() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  if ((prisma as any)?.product) {
    try {
      const p: any = prisma as any
      const existing = await p.product.findUnique({ where: { sku } })
      if (!existing) return res.status(404).json({ error: 'Product not found' })
      const imgs: string[] = Array.isArray(existing.attrs?.images) ? existing.attrs.images.slice() : []
      if (!imgs.includes(parsed.data.url)) imgs.push(parsed.data.url)
      const attrs = { ...(existing.attrs || {}), images: imgs }
      const data = await p.product.update({ where: { sku }, data: { attrs } })
      return res.json({ ok: true, images: data.attrs?.images || [] })
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Failed to add image' })
    }
  }
  return res.status(501).json({ error: 'Persistence not available in memory mode' })
})

// PATCH /api/tenants/:tenantId/ecommerce/products/:sku/images/remove
router.patch('/:sku/images/remove', requireAuth, async (req, res) => {
  const { sku } = req.params as { sku: string }
  const prisma = getTenantClientFromReq(req)
  const schema = z.object({ url: z.string().url() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  if ((prisma as any)?.product) {
    try {
      const p: any = prisma as any
      const existing = await p.product.findUnique({ where: { sku } })
      if (!existing) return res.status(404).json({ error: 'Product not found' })
      const imgs: string[] = Array.isArray(existing.attrs?.images) ? existing.attrs.images.slice() : []
      const next = imgs.filter((u) => u !== parsed.data.url)
      const attrs = { ...(existing.attrs || {}), images: next }
      const data = await p.product.update({ where: { sku }, data: { attrs } })
      return res.json({ ok: true, images: data.attrs?.images || [] })
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Failed to remove image' })
    }
  }
  return res.status(501).json({ error: 'Persistence not available in memory mode' })
})

// PATCH /api/tenants/:tenantId/ecommerce/products/:sku/images/cover
router.patch('/:sku/images/cover', requireAuth, async (req, res) => {
  const { sku } = req.params as { sku: string }
  const prisma = getTenantClientFromReq(req)
  const schema = z.object({ url: z.string().url() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  if ((prisma as any)?.product) {
    try {
      const p: any = prisma as any
      const existing = await p.product.findUnique({ where: { sku } })
      if (!existing) return res.status(404).json({ error: 'Product not found' })
      const imgs: string[] = Array.isArray(existing.attrs?.images) ? existing.attrs.images.slice() : []
      const rest = imgs.filter(u => u !== parsed.data.url)
      const next = [parsed.data.url, ...rest]
      const attrs = { ...(existing.attrs || {}), images: next }
      const data = await p.product.update({ where: { sku }, data: { attrs } })
      return res.json({ ok: true, images: data.attrs?.images || [] })
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Failed to set cover image' })
    }
  }
  return res.status(501).json({ error: 'Persistence not available in memory mode' })
})

export default router
