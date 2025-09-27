# Stripe Webhook Setup (Sandbox)

This guide explains how to configure Stripe webhooks for AfriGest E‑commerce in sandbox mode.

## Prerequisites
- API running and reachable (staging/prod URL preferred)
- Web storefront enabled
- Stripe account (test mode)

## Environment Variables

API (`apps/api/.env`):
- STRIPE_SECRET_KEY=sk_test_...
- STRIPE_WEBHOOK_SECRET=whsec_...

Web (`apps/web/.env`):
- VITE_ENABLE_ECOMMERCE=true
- VITE_ENABLE_STRIPE=true
- VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

## Backend endpoints
- Create order (PaymentIntent): `POST /api/tenants/:tenantId/ecommerce/orders` with `{ payment: { provider: 'stripe' } }`
- Webhook (Stripe → AfriGest): `POST /api/tenants/:tenantId/ecommerce/webhooks/stripe`

Note: The webhook route uses `express.raw` body for signature verification in `apps/api/src/routes/ecommerce/webhooks.ts`.

## Configure Webhook in Stripe Dashboard
1. Go to Developers → Webhooks → Add endpoint
2. Endpoint URL:
   - `https://<your-domain>/api/tenants/<tenantId>/ecommerce/webhooks/stripe`
3. Select events to send:
   - `payment_intent.succeeded`
   - (Optional) `payment_intent.payment_failed`
4. Save endpoint and copy the **Signing secret** → set it in API `.env` as `STRIPE_WEBHOOK_SECRET`.

## End-to-end Test (Sandbox)
1. On Web, open `/shop` and add items to cart.
2. On `/shop/checkout`, click "Payer par carte (test)" (ensure `VITE_ENABLE_STRIPE=true`).
3. A PaymentIntent will be created; the page shows card form if `VITE_STRIPE_PUBLISHABLE_KEY` is set.
4. Enter test card `4242 4242 4242 4242`, expiry `12/34`, CVC `123`. Confirm payment.
5. Stripe will call the webhook; if the Prisma models are present, AfriGest will:
   - mark the order `paymentStatus=paid`
   - create a corresponding `ecommercePayment` record

## Troubleshooting
- 400 "Stripe not configured": `STRIPE_SECRET_KEY` missing on API.
- 400 "Missing stripe signature or webhook secret": ensure request is from Stripe and `STRIPE_WEBHOOK_SECRET` is set.
- Signature verification failed: check that the route uses raw body (already set) and that you pasted the correct signing secret.
- Client-side form not shown: set `VITE_STRIPE_PUBLISHABLE_KEY` on Web.

## Security Notes
- Never expose `STRIPE_SECRET_KEY` publicly.
- Keep webhook secret in API environment only.
- Prefer HTTPS and validate that your NGINX passes raw body to Node without transformations.
