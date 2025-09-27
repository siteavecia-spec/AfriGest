import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth'
import { listOrders, createOrder, updateOrderStatus } from '../../services/ecommerce/orderService'
import { getTenantClientFromReq } from '../../db'

const router = Router({ mergeParams: true })

// GET /api/tenants/:tenantId/ecommerce/orders
router.get('/', requireAuth, async (req, res) => {
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
  const prisma = getTenantClientFromReq(req)
  const provider = parsed.data.payment?.provider || 'cod'
  if (provider === 'cod') {
    const order = await createOrder({ tenantId, items: parsed.data.items as any, customerEmail: parsed.data.customer?.email, customerPhone: parsed.data.customer?.phone, currency: parsed.data.items[0]?.currency }, prisma)
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
            customer: parsed.data.customer?.email ? { connectOrCreate: { where: { email: parsed.data.customer.email }, create: { email: parsed.data.customer.email, phone: parsed.data.customer.phone, firstName: parsed.data.customer.firstName, lastName: parsed.data.customer.lastName } } } : undefined,
            items: { create: parsed.data.items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })) }
          },
          select: { id: true }
        })
        orderId = created.id
      }
      const intent = await createStripePaymentIntent(Math.round(total), currency, { tenantId, ...(orderId ? { orderId } : {}) })
      return res.status(200).json({ payment: { provider: 'stripe', clientSecret: intent.clientSecret }, orderId })
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Stripe error' })
    }
  }
  return res.status(400).json({ error: 'Unsupported payment provider' })
})

// PATCH /api/tenants/:tenantId/ecommerce/orders/:orderId (update status)
const statusSchema = z.object({ status: z.enum(['received', 'prepared', 'shipped', 'delivered', 'returned']) })
router.patch('/:orderId', requireAuth, async (req, res) => {
  const { orderId } = req.params as { orderId: string }
  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const prisma = getTenantClientFromReq(req)
  const updated = await updateOrderStatus(orderId, parsed.data.status, prisma)
  if (!updated) return res.status(404).json({ error: 'Order not found' })
  return res.json(updated)
})

export default router
