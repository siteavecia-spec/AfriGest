import { Router } from 'express'
import Stripe from 'stripe'
import { z } from 'zod'
import { getTenantClientFromReq } from '../../db'
import { handleMtnWebhook, handleOrangeWebhook } from '../../services/ecommerce/paymentService'

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
    const stripe = new Stripe(secret)
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

// --- PayPal helpers (uses fetch; Node 18+ global fetch expected) ---
async function paypalGetAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !secret) throw new Error('PayPal not configured')
  const base = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase() === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const r = await fetch(base + '/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  })
  if (!r.ok) throw new Error(`PayPal token error: ${r.status}`)
  const j = await r.json() as any
  return { token: j.access_token as string, base }
}

// POST /api/tenants/:tenantId/ecommerce/payments/paypal/order
// Creates a PayPal order and returns approval link
router.post('/paypal/order', async (req, res) => {
  const enabled = !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET
  if (!enabled) return res.status(501).json({ error: 'PayPal not configured', code: 'NOT_CONFIGURED' })
  const schema = z.object({
    items: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive(), price: z.number().nonnegative(), currency: z.string().default('GNF') })).optional(),
    currency: z.string().optional(),
    amount: z.number().nonnegative().optional(),
    customer: z.object({ email: z.string().email().optional(), phone: z.string().optional() }).optional()
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  try {
    const { token, base } = await paypalGetAccessToken()
    const items = parsed.data.items || []
    const currency = (parsed.data.currency || items[0]?.currency || 'USD').toUpperCase()
    const total = typeof parsed.data.amount === 'number' ? parsed.data.amount : items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0)
    const orderBody = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: currency, value: total.toFixed(2) },
        }
      ],
      application_context: {
        brand_name: 'AfriGest',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url: 'https://example.com/paypal/return',
        cancel_url: 'https://example.com/paypal/cancel'
      }
    }
    const r = await fetch(base + '/v2/checkout/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(orderBody)
    })
    const j = await r.json() as any
    if (!r.ok) return res.status(502).json({ error: 'PayPal create order failed', details: j })
    const approve = (Array.isArray(j.links) ? j.links.find((l: any) => l.rel === 'approve') : null)?.href
    // Optionally persist a pending order
    try {
      const prisma: any = getTenantClientFromReq(req)
      const { tenantId } = req.params as { tenantId: string }
      if (prisma?.ecommerceOrder) {
        const created = await prisma.ecommerceOrder.create({
          data: {
            total,
            currency,
            status: 'received',
            paymentStatus: 'pending',
            paymentProvider: 'paypal',
            items: { create: items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })) }
          },
          select: { id: true }
        })
        return res.json({ provider: 'paypal', status: 'pending', orderId: created.id, paypalOrderId: j.id, approveUrl: approve })
      }
      return res.json({ provider: 'paypal', status: 'pending', paypalOrderId: j.id, approveUrl: approve })
    } catch {
      return res.json({ provider: 'paypal', status: 'pending', paypalOrderId: j.id, approveUrl: approve })
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'PayPal error' })
  }
})

// POST /api/tenants/:tenantId/ecommerce/payments/paypal/capture
router.post('/paypal/capture', async (req, res) => {
  const enabled = !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET
  if (!enabled) return res.status(501).json({ error: 'PayPal not configured', code: 'NOT_CONFIGURED' })
  const schema = z.object({ paypalOrderId: z.string(), orderId: z.string().optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  try {
    const { token, base } = await paypalGetAccessToken()
    const r = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(parsed.data.paypalOrderId)}/capture`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    const j = await r.json() as any
    if (!r.ok) return res.status(502).json({ error: 'PayPal capture failed', details: j })
    // Update order paid if present
    try {
      const prisma: any = getTenantClientFromReq(req)
      if (prisma?.ecommerceOrder && prisma?.ecommercePayment && parsed.data.orderId) {
        const amount = Number(j?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0)
        const currency = String(j?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code || 'GNF')
        await prisma.ecommerceOrder.update({ where: { id: parsed.data.orderId }, data: { paymentStatus: 'paid' } })
        await prisma.ecommercePayment.create({ data: { orderId: parsed.data.orderId, provider: 'paypal', status: 'succeeded', amount, currency } })
      }
    } catch {}
    return res.json({ ok: true, result: j })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'PayPal capture error' })
  }
})

// POST /api/tenants/:tenantId/ecommerce/payments/mtn/init
// Minimal viable init: accept amount/currency/phone, persist pending order (if possible) and return a reference
router.post('/mtn/init', async (req, res) => {
  const enabled = !!process.env.MTN_MOMO_API_KEY && !!process.env.MTN_MOMO_USER_ID
  if (!enabled) return res.status(501).json({ error: 'MTN MoMo not configured', code: 'NOT_CONFIGURED' })
  const schema = z.object({
    items: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive(), price: z.number().nonnegative(), currency: z.string().default('GNF') })).optional(),
    amount: z.number().nonnegative().optional(),
    currency: z.string().optional(),
    phone: z.string().optional(),
    customer: z.object({ email: z.string().email().optional(), phone: z.string().optional() }).optional()
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const items = parsed.data.items || []
  const currency = (parsed.data.currency || items[0]?.currency || 'GNF').toUpperCase()
  const total = typeof parsed.data.amount === 'number' ? parsed.data.amount : items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0)
  const ref = `mtn-${Date.now()}`
  try {
    const prisma: any = getTenantClientFromReq(req)
    if (prisma?.ecommerceOrder) {
      const created = await prisma.ecommerceOrder.create({
        data: {
          total,
          currency,
          status: 'received',
          paymentStatus: 'pending',
          paymentProvider: 'mtn_momo',
          items: { create: items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })) }
        },
        select: { id: true }
      })
      return res.status(202).json({ provider: 'mtn_momo', status: 'pending', ref, orderId: created.id })
    }
  } catch {}
  return res.status(202).json({ provider: 'mtn_momo', status: 'pending', ref })
})
// POST /api/tenants/:tenantId/ecommerce/payments/orange/init
router.post('/orange/init', async (req, res) => {
  const enabled = !!process.env.ORANGE_MOMO_API_KEY
  if (!enabled) return res.status(501).json({ error: 'Orange MoMo not configured', code: 'NOT_CONFIGURED' })
  const schema = z.object({
    items: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive(), price: z.number().nonnegative(), currency: z.string().default('GNF') })).optional(),
    amount: z.number().nonnegative().optional(),
    currency: z.string().optional(),
    phone: z.string().optional(),
    customer: z.object({ email: z.string().email().optional(), phone: z.string().optional() }).optional()
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const items = parsed.data.items || []
  const currency = (parsed.data.currency || items[0]?.currency || 'GNF').toUpperCase()
  const total = typeof parsed.data.amount === 'number' ? parsed.data.amount : items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0)
  const ref = `orange-${Date.now()}`
  try {
    const prisma: any = getTenantClientFromReq(req)
    if (prisma?.ecommerceOrder) {
      const created = await prisma.ecommerceOrder.create({
        data: {
          total,
          currency,
          status: 'received',
          paymentStatus: 'pending',
          paymentProvider: 'orange_momo',
          items: { create: items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })) }
        },
        select: { id: true }
      })
      return res.status(202).json({ provider: 'orange_momo', status: 'pending', ref, orderId: created.id })
    }
  } catch {}
  return res.status(202).json({ provider: 'orange_momo', status: 'pending', ref })
})

// --- Mobile Money callbacks (production) ---
// POST /api/tenants/:tenantId/ecommerce/payments/mtn/callback
router.post('/mtn/callback', async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const prisma: any = getTenantClientFromReq(req)
  return handleMtnWebhook(req as any, res, prisma, tenantId)
})

// POST /api/tenants/:tenantId/ecommerce/payments/orange/callback
router.post('/orange/callback', async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const prisma: any = getTenantClientFromReq(req)
  return handleOrangeWebhook(req as any, res, prisma, tenantId)
})

export default router
