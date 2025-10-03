# Go‑Live Checklist (AfriGest)

Use this checklist to prepare a production/staging deployment.

## 1) Domains, TLS, CDN
- DNS: set `api.<domain>` and `app.<domain>` (and `shop.<domain>` if storefront public)
- TLS: obtain certificates (Let's Encrypt or ACM). Enforce TLS 1.2+ (1.3 preferred)
- NGINX: reverse proxy → Node API; enable gzip/br/HTTP/2; set timeouts; pass raw body for Stripe webhook
- CDN: optional for static assets (Vite build output and images)

## 2) Environment Variables
API (`apps/api/.env`):
- PORT=4000
- JWT_ACCESS_SECRET=...
- JWT_REFRESH_SECRET=...
- ACCESS_TTL=15m
- REFRESH_TTL=30d
- ALLOWED_ORIGINS=https://app.<domain>
- MASTER_DATABASE_URL=postgresql://...
- TENANT_DATABASE_URL=postgresql://... (for a demo tenant if needed)
- STRIPE_SECRET_KEY=sk_live_... (or test key for staging)
- STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
- PAYPAL_CLIENT_ID=...
- PAYPAL_CLIENT_SECRET=...
- PAYPAL_ENV=live   # or sandbox for staging

# MTN MoMo (per tenant or global depending on setup)
- MTN_MOMO_API_KEY=...
- MTN_MOMO_USER_ID=...
- MTN_MOMO_ENV=production   # or sandbox

# Orange Money
- ORANGE_MOMO_API_KEY=...
- ORANGE_MOMO_ENV=production   # or sandbox

Web (`apps/web/.env`):
- VITE_API_URL=https://api.<domain>
- VITE_ENABLE_ECOMMERCE=true
- VITE_ENABLE_STRIPE=true (staging only if you want)
- VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... (or test key for staging)

## 3) Database (Postgres + Prisma)
- Provision Postgres (backups enabled, PITR if possible)
- Run migrations for master and tenant schemas
- Seed a demo tenant (optional)
- Verify connection pools and timeouts

## 4) Storage (S3 or compatible)
- Create bucket for product images/logos
- Configure lifecycle/policy; restrict public access; use presigned URLs

## 5) Security & Compliance
- CORS: restrict `ALLOWED_ORIGINS` to known apps/domains
- Headers: HSTS, X‑Content‑Type‑Options, X‑Frame‑Options (via Helmet/NGINX)
- JWT secrets rotated and stored securely (vault or env manager)
- Logs: centralize and rotate (JSON logs with request id)
- Audit: enable comprehensive audit logs (sales, stocks, users, ecommerce)
- Data protection: add data export/delete endpoints per RGPD/local laws

## 6) Observability & Performance
- Bench: keep non‑blocking autocannon step in CI; capture p50/p95/p99 trends
- Monitoring: metrics (CPU, mem, GC, HTTP lat/err), uptime probe, alerts
- Error tracking: Sentry or equivalent (front/back)
- Front perf: lazy loading, code‑split, image optimization

### Payments Monitoring
- Gateways success/failure rates (PayPal, MTN, Orange)
- Webhook latency and error rates; idempotency conflicts
- Alert on spike of `paymentStatus=failed/timeout`

### Messaging Monitoring
- WS connections active, reconnect rate, message latency
- REST send/read error rates
- Alert on WS disconnect spikes or elevated p95 latency

## 7) Backups & DR
- 3‑2‑1: daily snapshots + monthly retention; offsite copy
- Test restore: verify RTO/RPO; document recovery steps

## 8) Stripe
- Webhook endpoint configured with proper events (payment_intent.succeeded)
- Keys set per environment; accounts/test mode separation
- Reconciliation: webhook marks orders paid and stores payment record

## 9) Rollout
- Blue/green or canary deploy (optional)
- Health checks; readiness/liveness endpoints
- Run smoke + in‑process tests on deploy

## 11) CI Gates (E2E)
- Ensure Playwright is installed and browsers cached
- Run MoMo callbacks suite: `e2e/tests/ecommerce-momo-callbacks.spec.ts`
- Run Messaging REST suite (best‑effort): `e2e/tests/messaging.spec.ts`

## 10) Runbooks
- Incident response: who/what/where
- On‑call contacts and escalation
- Change management: releases notes, rollback plan
