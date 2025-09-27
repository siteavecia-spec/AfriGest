import { Router } from 'express'
import Stripe from 'stripe'
import { z } from 'zod'
import { getTenantClientFromReq } from '../../db'

const router = Router({ mergeParams: true })

// POST /api/tenants/:tenantId/ecommerce/payments/simulate
// Accepts a payload similar to order creation and returns a simulated payment success
const payloadSchema = z.object({
  customer: z.object({ email: z.string().email().optional(), phone: z.string().optional() }).optional(),
  items: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive(), price: z.number().nonnegative(), currency: z.string().default('GNF') }))
})

router.post('/simulate', async (req, res) => {
  const parsed = payloadSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { tenantId } = req.params as { tenantId: string }
  const prisma: any = getTenantClientFromReq(req)
  // Optional: create a lightweight order record in DB if available
  try {
    if (prisma?.ecommerceOrder) {
      const total = (parsed.data.items || []).reduce((s, it) => s + it.price * it.quantity, 0)
      const currency = parsed.data.items[0]?.currency || 'GNF'
      const created = await prisma.ecommerceOrder.create({
        data: {
          total,
          currency,
          status: 'received',
          paymentStatus: 'paid',
          customer: parsed.data.customer?.email ? { connectOrCreate: { where: { email: parsed.data.customer.email }, create: { email: parsed.data.customer.email, phone: parsed.data.customer.phone } } } : undefined,
          items: { create: parsed.data.items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })) }
        },
        select: { id: true }
      })
      return res.json({ ok: true, orderId: created.id, tenantId })
    }
  } catch {}
  // In-memory or no-DB mode: just return ok with a fake ref
  const ref = 'sim-' + Date.now()
  return res.json({ ok: true, ref, tenantId })
})

// POST /api/tenants/:tenantId/ecommerce/payments/simulate-mtn — Mobile Money MTN (simulated)
router.post('/simulate-mtn', async (req, res) => {
  const parsed = payloadSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { tenantId } = req.params as { tenantId: string }
  const prisma: any = getTenantClientFromReq(req)
  try {
    if (prisma?.ecommerceOrder) {
      const total = (parsed.data.items || []).reduce((s, it) => s + it.price * it.quantity, 0)
      const currency = parsed.data.items[0]?.currency || 'GNF'
      const created = await prisma.ecommerceOrder.create({
        data: {
          total,
          currency,
          status: 'received',
          paymentStatus: 'paid',
          paymentProvider: 'mtn_momo',
          customer: parsed.data.customer?.phone ? { connectOrCreate: { where: { phone: parsed.data.customer.phone }, create: { phone: parsed.data.customer.phone, email: parsed.data.customer?.email || null } } } : undefined,
          items: { create: parsed.data.items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })) }
        },
        select: { id: true }
      })
      return res.json({ ok: true, orderId: created.id, tenantId })
    }
  } catch {}
  return res.json({ ok: true, ref: 'mtn-' + Date.now(), tenantId })
})

// POST /api/tenants/:tenantId/ecommerce/payments/simulate-orange — Mobile Money Orange (simulated)
router.post('/simulate-orange', async (req, res) => {
  const parsed = payloadSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { tenantId } = req.params as { tenantId: string }
  const prisma: any = getTenantClientFromReq(req)
  try {
    if (prisma?.ecommerceOrder) {
      const total = (parsed.data.items || []).reduce((s, it) => s + it.price * it.quantity, 0)
      const currency = parsed.data.items[0]?.currency || 'GNF'
      const created = await prisma.ecommerceOrder.create({
        data: {
          total,
          currency,
          status: 'received',
          paymentStatus: 'paid',
          paymentProvider: 'orange_momo',
          customer: parsed.data.customer?.phone ? { connectOrCreate: { where: { phone: parsed.data.customer.phone }, create: { phone: parsed.data.customer.phone, email: parsed.data.customer?.email || null } } } : undefined,
          items: { create: parsed.data.items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })) }
        },
        select: { id: true }
      })
      return res.json({ ok: true, orderId: created.id, tenantId })
    }
  } catch {}
  return res.json({ ok: true, ref: 'orange-' + Date.now(), tenantId })
})

export default router

// --- Provider stubs (guarded by env) ---
// These endpoints are placeholders that validate configuration presence and respond accordingly.
// They allow FE integration to be wired while BE implementation is being finalized.

// POST /api/tenants/:tenantId/ecommerce/payments/stripe/intent
router.post('/stripe/intent', async (req, res) => {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return res.status(501).json({ error: 'Stripe not configured', code: 'NOT_CONFIGURED' })
  const parsed = payloadSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  try {
    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' })
    const items = parsed.data.items || []
    const currency = (items[0]?.currency || 'usd').toLowerCase()
    const total = items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0)
    const amount = Math.max(1, Math.round(total * 100))
    const intent = await stripe.paymentIntents.create({ amount, currency, automatic_payment_methods: { enabled: true } })
    return res.json({ provider: 'stripe', clientSecret: intent.client_secret })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to create Stripe PaymentIntent' })
  }
})

// POST /api/tenants/:tenantId/ecommerce/payments/paypal/order
router.post('/paypal/order', async (req, res) => {
  const enabled = !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET
  if (!enabled) return res.status(501).json({ error: 'PayPal not configured', code: 'NOT_CONFIGURED' })
  // TODO: Implement PayPal order create (sandbox/live per PAYPAL_ENV)
  return res.status(202).json({ provider: 'paypal', status: 'pending', message: 'PayPal integration pending server-side. Use simulate endpoints for QA.', next: 'create order and capture via SDK, then validate server-side.' })
})

// POST /api/tenants/:tenantId/ecommerce/payments/mtn/init
router.post('/mtn/init', async (req, res) => {
  const enabled = !!process.env.MTN_MOMO_API_KEY && !!process.env.MTN_MOMO_USER_ID
  if (!enabled) return res.status(501).json({ error: 'MTN MoMo not configured', code: 'NOT_CONFIGURED' })
  // TODO: Implement MTN MoMo init and callback handling
  return res.status(202).json({ provider: 'mtn_momo', status: 'pending', message: 'MTN MoMo integration pending server-side. Use simulate-mtn for QA.', next: 'initiate collection and await callback/OTP.' })
})

// POST /api/tenants/:tenantId/ecommerce/payments/orange/init
router.post('/orange/init', async (req, res) => {
  const enabled = !!process.env.ORANGE_MOMO_API_KEY
  if (!enabled) return res.status(501).json({ error: 'Orange MoMo not configured', code: 'NOT_CONFIGURED' })
  // TODO: Implement Orange MoMo init and callback handling
  return res.status(202).json({ provider: 'orange_momo', status: 'pending', message: 'Orange MoMo integration pending server-side. Use simulate-orange for QA.', next: 'initiate collection and await callback/OTP.' })
})
