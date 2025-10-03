import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth'
import { requirePermission } from '../../middleware/authorization'
import { listOrders, createOrder, updateOrderStatus } from '../../services/ecommerce/orderService'
import { getTenantClientFromReq } from '../../db'
import { applyInventoryDeltas } from '../../services/ecommerce/stockService'
import { notifyEvent } from '../../services/notify'
import { reserveSharedStock, releaseSharedStock } from '../../services/ecommerce/inventoryService'
import { boutiques as memoryBoutiques, ecommerceOrders as memoryOrders } from '../../stores/memory'

const router = Router({ mergeParams: true })

// GET /api/tenants/:tenantId/ecommerce/orders/:orderId/public
// Public tracking endpoint: returns limited order info if requester provides matching email (best-effort)
router.get('/:orderId/public', async (req, res) => {
  const { tenantId, orderId } = req.params as { tenantId: string; orderId: string }
  const email = (req.query?.email as string | undefined)?.trim().toLowerCase()
  const prisma: any = getTenantClientFromReq(req)
  try {
    if (prisma?.ecommerceOrder) {
      const full = await prisma.ecommerceOrder.findUnique({ where: { id: orderId }, include: { customer: true, items: true } })
      if (!full) return res.status(404).json({ error: 'Order not found', tenantId })
      const orderEmail = (full.customer?.email || '').toLowerCase()
      if (orderEmail && email && orderEmail !== email) return res.status(403).json({ error: 'Email does not match', tenantId })
      return res.json({ id: full.id, status: full.status, paymentStatus: full.paymentStatus || 'pending', total: Number(full.total || 0), currency: full.currency || 'GNF', createdAt: full.createdAt, items: full.items?.map((it: any) => ({ sku: it.sku, quantity: Number(it.quantity || 0), price: Number(it.price || 0) })), tenantId })
    }
    // Memory fallback
    const mem = (memoryOrders || []).find(o => o.id === orderId)
    if (!mem) return res.status(404).json({ error: 'Order not found', tenantId })
    // In memory, we don't keep customer email bound to order reliably; allow if no email provided
    if (email) return res.status(403).json({ error: 'Email verification unavailable in memory mode', tenantId })
    return res.json({ id: mem.id, status: mem.status, total: Number(mem.total || 0), currency: mem.currency || 'GNF', createdAt: mem.createdAt, items: mem.items || [], tenantId })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to fetch order', tenantId })
  }
})

// GET /api/tenants/:tenantId/ecommerce/orders
router.get('/', requireAuth, requirePermission('ecommerce.orders', 'read'), async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const { limit = '50', offset = '0' } = req.query as Record<string, string>
  const prisma = getTenantClientFromReq(req)
  const { items, total } = await listOrders(tenantId, Number(limit), Number(offset), prisma)
  return res.json({ items, total, limit: Number(limit), offset: Number(offset), tenantId })
})

// POST /api/tenants/:tenantId/ecommerce/orders (create order from storefront)
const createSchema = z.object({
  customer: z.object({ email: z.string().email().optional(), phone: z.string().optional(), firstName: z.string().optional(), lastName: z.string().optional() }).optional(),
  items: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive(), price: z.number().nonnegative(), currency: z.string().default('GNF') })),
  shippingAddress: z.object({ line1: z.string(), city: z.string(), country: z.string().default('GN'), postalCode: z.string().optional() }).optional(),
  payment: z.object({ provider: z.enum(['stripe', 'paypal', 'mtn_momo', 'orange_momo', 'cod']).default('cod') }).optional(),
  notes: z.string().optional()
})

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { tenantId } = req.params as { tenantId: string }
  const prisma: any = getTenantClientFromReq(req)
  const provider = parsed.data.payment?.provider || 'cod'

  // --- Stock enforcement before creating order/payment ---
  try {
    const items = parsed.data.items || []
    if (prisma?.product) {
      // DB mode: enforce dedicated online stock; shared stock enforcement TBD in core inventory
      const skus = Array.from(new Set(items.map(it => it.sku)))
      const rows = await prisma.product.findMany({ where: { sku: { in: skus } }, select: { id: true, sku: true, attrs: true } })
      const bySku = new Map<string, any>(rows.map((r: any) => [r.sku, r]))
      // Validate availability
      for (const it of items) {
        const r = bySku.get(it.sku)
        if (!r) return res.status(404).json({ error: `SKU not found: ${it.sku}` })
        const mode = (r.attrs?.onlineStockMode === 'dedicated' ? 'dedicated' : 'shared') as 'shared'|'dedicated'
        if (mode === 'dedicated') {
          const qty = Number(r.attrs?.onlineStockQty ?? 0)
          if (qty < Number(it.quantity || 0)) {
            return res.status(409).json({ error: `Insufficient online stock for ${it.sku}`, code: 'OUT_OF_STOCK', sku: it.sku })
          }
        }
      }
      // Reserve/update dedicated stock in a transaction
      await prisma.$transaction(items.map((it: any) => {
        const r = bySku.get(it.sku)
        const mode = (r?.attrs?.onlineStockMode === 'dedicated' ? 'dedicated' : 'shared') as 'shared'|'dedicated'
        if (mode === 'dedicated') {
          const nextQty = Math.max(0, Number(r?.attrs?.onlineStockQty ?? 0) - Number(it.quantity || 0))
          const nextAttrs = { ...(r?.attrs || {}), onlineStockQty: nextQty }
          return prisma.product.update({ where: { sku: it.sku }, data: { attrs: nextAttrs } })
        }
        // Shared mode: no immediate DB change here (assumed handled by core inventory on fulfillment)
        return prisma.product.update({ where: { sku: it.sku }, data: {} })
      }))
    } else {
      // Memory mode: apply deltas against shared stock (default boutique 'bq-1')
      const changes = items.map(it => ({ sku: it.sku, delta: -Number(it.quantity || 0), reason: 'ecom_order' as const }))
      applyInventoryDeltas(tenantId, changes, { boutiqueId: 'bq-1' })
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Stock enforcement failed' })
  }

  // Best-effort boutique assignment (non-persistent for now)
  let assignedBoutique: { id?: string; name?: string; code?: string } | null = null
  try {
    const city = (parsed.data.shippingAddress as any)?.city
    if ((prisma as any)?.boutique) {
      const byCity = city ? await (prisma as any).boutique.findFirst({ where: { city: { equals: city, mode: 'insensitive' } } }) : null
      assignedBoutique = byCity || await (prisma as any).boutique.findFirst({ orderBy: { name: 'asc' } })
    } else {
      if (city) assignedBoutique = (memoryBoutiques as any).find((b: any) => String(b.city || '').toLowerCase() === String(city).toLowerCase()) || null
      if (!assignedBoutique) assignedBoutique = (memoryBoutiques as any).find((b: any) => b.id === 'bq-1') || (memoryBoutiques as any)[0] || null
    }
  } catch {}

  if (provider === 'cod') {
    const order = await createOrder({ tenantId, items: parsed.data.items as any, customerEmail: parsed.data.customer?.email, customerPhone: parsed.data.customer?.phone, currency: parsed.data.items[0]?.currency, boutiqueId: assignedBoutique?.id }, prisma)
    // Notify DG/PDG and customer (best-effort)
    try {
      const total = Number(order.total || 0)
      const assignText = assignedBoutique ? `\nBoutique assignée: ${assignedBoutique.code ? assignedBoutique.code + ' — ' : ''}${assignedBoutique.name || assignedBoutique.id || ''}` : ''
      await notifyEvent(`[E‑commerce] Nouvelle commande COD — ${tenantId}`, `Commande ${order.id} reçue (total ${total} ${order.currency || 'GNF'}).${assignText}`)
      const email = (order as any)?.customer?.email || (order as any)?.customerEmail
      if (email) {
        await notifyEvent('Votre commande a été reçue', `Merci pour votre commande ${order.id}. Statut: reçue.`, email)
      }
    } catch {}
    return res.status(201).json(order)
  }
  if (provider === 'stripe') {
    try {
      const { createStripePaymentIntent, isStripeEnabled } = await import('../../services/ecommerce/paymentService')
      if (!isStripeEnabled()) return res.status(400).json({ error: 'Stripe not configured' })
      const total = (parsed.data.items || []).reduce((s, it) => s + it.price * it.quantity, 0)
      const currency = parsed.data.items[0]?.currency || 'GNF'
      // If Prisma is available, create a pending order to reconcile on webhook
      let orderId: string | undefined
      if ((prisma as any)?.ecommerceOrder) {
        const created = await (prisma as any).ecommerceOrder.create({
          data: {
            total,
            currency,
            status: 'received',
            paymentStatus: 'pending',
            ...(assignedBoutique?.id ? { boutiqueId: assignedBoutique.id } : {}),
            customer: parsed.data.customer?.email ? { connectOrCreate: { where: { email: parsed.data.customer.email }, create: { email: parsed.data.customer.email, phone: parsed.data.customer.phone, firstName: parsed.data.customer.firstName, lastName: parsed.data.customer.lastName } } } : undefined,
            items: { create: parsed.data.items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })) }
          },
          select: { id: true }
        })
        orderId = created.id
      }
      const intent = await createStripePaymentIntent(Math.round(total), currency, { tenantId, ...(orderId ? { orderId } : {}) })
      // Notify DG/PDG that an online order intent was created (pending payment)
      try {
        const assignText = assignedBoutique ? `\nBoutique pressentie: ${assignedBoutique.code ? assignedBoutique.code + ' — ' : ''}${assignedBoutique.name || assignedBoutique.id || ''}` : ''
        await notifyEvent(`[E‑commerce] Intention de paiement Stripe — ${tenantId}`, `Commande en attente de paiement. Montant: ${total} ${currency}.${orderId ? `\nOrderId: ${orderId}` : ''}${assignText}`)
      } catch {}
      return res.status(200).json({ payment: { provider: 'stripe', clientSecret: intent.clientSecret }, orderId })
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Stripe error' })
    }
  }
  if (provider === 'mtn_momo' || provider === 'orange_momo') {
    try {
      const total = (parsed.data.items || []).reduce((s, it) => s + it.price * it.quantity, 0)
      const currency = parsed.data.items[0]?.currency || 'GNF'
      const providerKey = provider
      let orderId: string | undefined
      if ((prisma as any)?.ecommerceOrder) {
        const created = await (prisma as any).ecommerceOrder.create({
          data: {
            total,
            currency,
            status: 'received',
            paymentStatus: 'pending',
            paymentProvider: providerKey,
            ...(assignedBoutique?.id ? { boutiqueId: assignedBoutique.id } : {}),
            customer: parsed.data.customer?.phone || parsed.data.customer?.email ? {
              connectOrCreate: {
                where: parsed.data.customer?.email ? { email: parsed.data.customer.email } : { phone: parsed.data.customer?.phone },
                create: { email: parsed.data.customer?.email || null, phone: parsed.data.customer?.phone || null, firstName: parsed.data.customer?.firstName, lastName: parsed.data.customer?.lastName }
              }
            } : undefined,
            items: { create: parsed.data.items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })) }
          },
          select: { id: true }
        })
        orderId = created.id
      }
      // Best-effort notification
      try {
        const assignText = assignedBoutique ? `\nBoutique pressentie: ${assignedBoutique.code ? assignedBoutique.code + ' — ' : ''}${assignedBoutique.name || assignedBoutique.id || ''}` : ''
        await notifyEvent(`[E‑commerce] Demande paiement MoMo — ${tenantId}`, `Commande en attente de paiement via ${providerKey}. Montant: ${total} ${currency}.${orderId ? `\nOrderId: ${orderId}` : ''}${assignText}`)
      } catch {}
      // Return a simple reference for FE to continue (real integration pending)
      const ref = `${providerKey}-${Date.now()}`
      return res.status(202).json({ payment: { provider: providerKey, status: 'pending', ref }, orderId })
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Mobile Money error' })
    }
  }
  return res.status(400).json({ error: 'Unsupported payment provider' })
})

// PATCH /api/tenants/:tenantId/ecommerce/orders/:orderId (update status)
const statusSchema = z.object({ status: z.enum(['received', 'prepared', 'shipped', 'delivered', 'returned']) })
router.patch('/:orderId', requireAuth, requirePermission('ecommerce.orders', 'status_change'), async (req, res) => {
  const { orderId } = req.params as { orderId: string }
  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const prisma = getTenantClientFromReq(req)
  const newStatus = parsed.data.status
  // If returning, restock inventory depending on stock mode
  if (newStatus === 'returned') {
    try {
      if ((prisma as any)?.ecommerceOrder && (prisma as any)?.product) {
        const full = await (prisma as any).ecommerceOrder.findUnique({ where: { id: orderId }, include: { items: true } })
        const skus = Array.from(new Set((full?.items || []).map((it: any) => it.sku)))
        const prows = await (prisma as any).product.findMany({ where: { sku: { in: skus } }, select: { sku: true, attrs: true } })
        const bySku = new Map<string, any>(prows.map((r: any) => [r.sku, r]))
        const sharedItems: Array<{ sku: string; quantity: number }> = []
        await (prisma as any).$transaction((full?.items || []).map((it: any) => {
          const prod = bySku.get(it.sku)
          const mode = (prod?.attrs?.onlineStockMode === 'dedicated' ? 'dedicated' : 'shared') as 'shared'|'dedicated'
          if (mode === 'dedicated') {
            const nextQty = Math.max(0, Number(prod?.attrs?.onlineStockQty ?? 0) + Number(it.quantity || 0))
            const nextAttrs = { ...(prod?.attrs || {}), onlineStockQty: nextQty }
            return (prisma as any).product.update({ where: { sku: it.sku }, data: { attrs: nextAttrs } })
          }
          // shared mode: collect for shared release
          sharedItems.push({ sku: it.sku, quantity: Number(it.quantity || 0) })
          return (prisma as any).product.update({ where: { sku: it.sku }, data: {} })
        }))
        if (sharedItems.length > 0) {
          await releaseSharedStock(prisma as any, { orderId, items: sharedItems, boutiqueId: (full as any)?.boutiqueId || undefined })
        }
      } else {
        // Memory mode: restock shared inventory by reversing item quantities
        const mem = (memoryOrders || []).find(o => o.id === orderId)
        if (mem && Array.isArray(mem.items)) {
          const changes = mem.items.map((it: any) => ({ sku: it.sku, delta: +Number(it.quantity || 0), reason: 'ecom_return' as const }))
          const { tenantId } = req.params as { tenantId: string }
          applyInventoryDeltas(tenantId, changes, { boutiqueId: 'bq-1' })
        }
      }
    } catch {}
  }
  // If prepared, reserve/decrement shared inventory in DB mode; memory handled below
  if (newStatus === 'prepared') {
    try {
      if ((prisma as any)?.ecommerceOrder && (prisma as any)?.product) {
        const full = await (prisma as any).ecommerceOrder.findUnique({ where: { id: orderId }, include: { items: true } })
        const skus = Array.from(new Set((full?.items || []).map((it: any) => it.sku)))
        const prows = await (prisma as any).product.findMany({ where: { sku: { in: skus } }, select: { sku: true, attrs: true } })
        const bySku = new Map<string, any>(prows.map((r: any) => [r.sku, r]))
        const sharedItems = (full?.items || []).filter((it: any) => (bySku.get(it.sku)?.attrs?.onlineStockMode !== 'dedicated')).map((it: any) => ({ sku: it.sku, quantity: Number(it.quantity || 0) }))
        if (sharedItems.length > 0) {
          await reserveSharedStock(prisma as any, { orderId, items: sharedItems, boutiqueId: (full as any)?.boutiqueId || undefined })
        }
      } else {
        // Memory mode: decrement shared inventory
        const mem = (memoryOrders || []).find(o => o.id === orderId)
        if (mem && Array.isArray(mem.items)) {
          const changes = mem.items.map((it: any) => ({ sku: it.sku, delta: -Number(it.quantity || 0), reason: 'ecom_prepare' as const }))
          const { tenantId } = req.params as { tenantId: string }
          applyInventoryDeltas(tenantId, changes, { boutiqueId: 'bq-1' })
        }
      }
    } catch {}
  }
  const updated = await updateOrderStatus(orderId, newStatus, prisma)
  if (!updated) return res.status(404).json({ error: 'Order not found' })
  // Notifications: DG/PDG + customer email if available
  try {
    const status = newStatus
    await notifyEvent(`[E‑commerce] Statut commande mis à jour`, `Commande ${orderId}: ${status}`)
    if ((prisma as any)?.ecommerceOrder) {
      const full = await (prisma as any).ecommerceOrder.findUnique({ where: { id: orderId }, include: { customer: true } })
      const email = full?.customer?.email || (full as any)?.customerEmail
      if (email) {
        await notifyEvent(`Mise à jour de votre commande`, `Votre commande ${orderId} est maintenant: ${status}`, email)
      }
    }
  } catch {}
  return res.json(updated)
})

export default router
