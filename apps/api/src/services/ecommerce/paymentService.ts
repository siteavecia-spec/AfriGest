import type { Request, Response } from 'express'

let stripe: any = null
function getStripe() {
  if (stripe) return stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  try {
    // lazy require to avoid hard dependency when key not set
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require('stripe')
    stripe = new Stripe(key, { apiVersion: '2022-11-15' })
    return stripe
  } catch {
    return null
  }
}

export async function createStripePaymentIntent(amount: number, currency = 'GNF', metadata?: Record<string, string>) {
  const s = getStripe()
  if (!s) throw new Error('Stripe not configured')
  const intent = await s.paymentIntents.create({ amount, currency, metadata })
  return { clientSecret: intent.client_secret as string, id: intent.id as string }
}

export function isStripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export async function handleStripeWebhook(req: Request, res: Response, prisma?: any, tenantId?: string) {
  const s = getStripe()
  if (!s) return res.status(400).send('Stripe not configured')
  const sig = req.headers['stripe-signature'] as string | undefined
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !whSecret) return res.status(400).send('Missing stripe signature or webhook secret')
  let event: any
  try {
    event = s.webhooks.constructEvent((req as any).rawBody || (req as any).body, sig, whSecret)
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }
  // Persist webhook event if Prisma is available
  try {
    if (prisma?.ecommerceWebhookEvent) {
      await prisma.ecommerceWebhookEvent.create({
        data: {
          provider: 'stripe',
          eventType: event.type,
          payload: event,
          status: 'received'
        }
      })
    }
  } catch {}

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data?.object
      const amount = Number(pi?.amount || 0) / 1 // Stripe amounts are in smallest unit; currency like GNF has no decimals, but keep as-is for MVP
      const currency = String(pi?.currency || 'gnf').toUpperCase()
      const providerIntentId = String(pi?.id || '')
      const meta = (pi?.metadata || {}) as Record<string, string>
      const orderId = meta.orderId
      if (prisma?.ecommerceOrder && prisma?.ecommercePayment && orderId) {
        try {
          await prisma.ecommerceOrder.update({ where: { id: orderId }, data: { paymentStatus: 'paid' } })
          await prisma.ecommercePayment.create({ data: { orderId, provider: 'stripe', status: 'succeeded', amount, currency, providerIntentId } })
        } catch {}
      }
    }
  } catch {}

  return res.json({ received: true })
}

export async function handlePayPalWebhook(req: Request, res: Response, prisma?: any, tenantId?: string) {
  // Minimal guard: ensure PayPal configured (for real verification, call PayPal verify API)
  const enabled = !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET
  if (!enabled) return res.status(400).send('PayPal not configured')
  const event: any = req.body
  try {
    if (prisma?.ecommerceWebhookEvent) {
      await prisma.ecommerceWebhookEvent.create({ data: { provider: 'paypal', eventType: String(event?.event_type || 'unknown'), payload: event, status: 'received' } })
    }
  } catch {}
  try {
    const resource = event?.resource || {}
    const status = String(resource?.status || '').toLowerCase()
    const orderId = resource?.custom_id || resource?.invoice_id || resource?.id // depends on integration
    if (orderId && prisma?.ecommerceOrder && prisma?.ecommercePayment) {
      if (status === 'completed' || event?.event_type === 'CHECKOUT.ORDER.APPROVED') {
        try {
          await prisma.ecommerceOrder.update({ where: { id: orderId }, data: { paymentStatus: 'paid' } })
          await prisma.ecommercePayment.create({ data: { orderId, provider: 'paypal', status: 'succeeded', amount: Number(resource?.amount?.value || 0), currency: String(resource?.amount?.currency_code || 'GNF') } })
        } catch {}
      }
    }
  } catch {}
  return res.json({ received: true })
}

export async function handleMtnWebhook(req: Request, res: Response, prisma?: any, tenantId?: string) {
  const enabled = !!process.env.MTN_MOMO_API_KEY && !!process.env.MTN_MOMO_USER_ID
  if (!enabled) return res.status(400).send('MTN MoMo not configured')
  const event: any = req.body
  try {
    if (prisma?.ecommerceWebhookEvent) {
      await prisma.ecommerceWebhookEvent.create({ data: { provider: 'mtn_momo', eventType: String(event?.type || 'unknown'), payload: event, status: 'received' } })
    }
  } catch {}
  try {
    const status = String(event?.status || '').toLowerCase()
    const orderId = event?.orderId || event?.reference || event?.externalId
    if (orderId && prisma?.ecommerceOrder && prisma?.ecommercePayment) {
      if (status === 'success' || status === 'successful' || status === 'paid') {
        try {
          await prisma.ecommerceOrder.update({ where: { id: orderId }, data: { paymentStatus: 'paid' } })
          await prisma.ecommercePayment.create({ data: { orderId, provider: 'mtn_momo', status: 'succeeded', amount: Number(event?.amount || 0), currency: String(event?.currency || 'GNF') } })
        } catch {}
      } else if (status === 'failed') {
        try { await prisma.ecommerceOrder.update({ where: { id: orderId }, data: { paymentStatus: 'failed' } }) } catch {}
      }
    }
  } catch {}
  return res.json({ received: true })
}

export async function handleOrangeWebhook(req: Request, res: Response, prisma?: any, tenantId?: string) {
  const enabled = !!process.env.ORANGE_MOMO_API_KEY
  if (!enabled) return res.status(400).send('Orange MoMo not configured')
  const event: any = req.body
  try {
    if (prisma?.ecommerceWebhookEvent) {
      await prisma.ecommerceWebhookEvent.create({ data: { provider: 'orange_momo', eventType: String(event?.type || 'unknown'), payload: event, status: 'received' } })
    }
  } catch {}
  try {
    const status = String(event?.status || '').toLowerCase()
    const orderId = event?.orderId || event?.reference || event?.externalId
    if (orderId && prisma?.ecommerceOrder && prisma?.ecommercePayment) {
      if (status === 'success' || status === 'successful' || status === 'paid') {
        try {
          await prisma.ecommerceOrder.update({ where: { id: orderId }, data: { paymentStatus: 'paid' } })
          await prisma.ecommercePayment.create({ data: { orderId, provider: 'orange_momo', status: 'succeeded', amount: Number(event?.amount || 0), currency: String(event?.currency || 'GNF') } })
        } catch {}
      } else if (status === 'failed') {
        try { await prisma.ecommerceOrder.update({ where: { id: orderId }, data: { paymentStatus: 'failed' } }) } catch {}
      }
    }
  } catch {}
  return res.json({ received: true })
}
