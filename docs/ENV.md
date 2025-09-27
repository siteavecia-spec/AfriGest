# Environment Setup

## API (`apps/api`)

Create a `.env` file with, at minimum:

```
PORT=4000
JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
RESET_TOKEN_SECRET=change_me_reset
MASTER_DATABASE_URL=postgresql://user:password@localhost:5432/afrigest_master
TENANT_DATABASE_URL=postgresql://user:password@localhost:5432/afrigest_tenant_demo
WEB_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

Optional storage/CDN configuration (for private media via CloudFront). See `docs/s3-private.md` for details.

```
# S3
S3_REGION=
S3_BUCKET=
S3_KEY_PREFIX=uploads/

# CloudFront GET signed URLs
CLOUDFRONT_DOMAIN=
CLOUDFRONT_KEY_PAIR_ID=
CLOUDFRONT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
CLOUDFRONT_SIGNED_URL_TTL_SECONDS=300
```

Prisma Tenant uses `DATABASE_URL` at migration time. Set it before running migrate/generate:

Windows PowerShell:
```powershell
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/afrigest_tenant_demo"
```

Generate and run migrations:
```powershell
npx prisma generate --schema ..\..\infra\prisma\tenant\schema.prisma
npx prisma migrate dev --name init --schema ..\..\infra\prisma\tenant\schema.prisma
```

### Payments (Stripe, PayPal, MoMo)

Add the following variables to enable real payments and server-side webhooks/validations:

```
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_ENV=sandbox # or live

# Mobile Money (placeholders for now)
MTN_MOMO_API_KEY=
MTN_MOMO_USER_ID=
ORANGE_MOMO_API_KEY=

# Commons
WEB_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

Notes:
- Stripe flow: Front creates order → API creates PaymentIntent → Front `stripe.confirmCardPayment` → Stripe Webhook confirms and marks order `paid`.
- PayPal flow: Front uses SDK redirect or popup → capture → API validates and marks `paid`.
- MoMo flow: Front init via API → operator redirect/OTP if applicable → API callback confirms and marks `paid`.
- Keep QA simulators enabled: `POST /payments/simulate`, `/payments/simulate-mtn`, `/payments/simulate-orange`.


Create a `.env` file with:

```
VITE_API_URL=http://localhost:4000
# Stripe publishable key (card payments). Required if Stripe is enabled server-side.
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
# Optional: Google Analytics (enabled after consent via ConsentBanner)
VITE_GA_MEASUREMENT_ID=

# Optional: Cloudflare Turnstile (anti-bot on demo form)
VITE_TURNSTILE_SITE_KEY=

# Optional: Calendly booking link (Thank You page CTA). UTM will be appended automatically.
VITE_CALENDLY_URL=

# Optional: Social proof metrics shown on the landing page (fallbacks are provided)
# Examples: +120, 99.95%, <1.5s
VITE_PROOF_BOUTIQUES=+50
VITE_PROOF_SLA=99.9%
VITE_PROOF_TTFB=<2s
```

## Running locally

From repo root:
```bash
npm install
npm run dev:api
npm run dev:web
```

Login flow expects `x-company: demo` header to resolve the tenant (automatiquement géré côté web via localStorage `afrigest_company`).
