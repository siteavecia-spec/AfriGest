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
