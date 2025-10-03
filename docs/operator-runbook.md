# Operator Runbook — Production Readiness and Procedures

This runbook lists everything you (operator) must do outside the codebase to bring AfriGest to production and keep it healthy. It references the app files and docs already updated.

Related docs:
- `docs/go-live-checklist.md`
- `docs/e2e-test-plan.md`
- `docs/release-2025-10-03-phase2-readiness.md`
- `/.github/workflows/ci.yml`
- `docs/stripe-webhook-setup.md`, `docs/s3-private.md`

## 1) DNS, TLS, Reverse Proxy

- Domains: create records
  - `api.<domain>` → API reverse proxy
  - `app.<domain>` → Admin web app
  - `shop.<domain>` → Public storefront (optional)
- TLS: obtain certs (Let's Encrypt/ACM). Enforce TLS 1.2+ (prefer 1.3)
- NGINX sample (stripe raw body preserved):
```nginx
server {
  listen 443 ssl http2;
  server_name api.<domain>;

  ssl_certificate     /etc/letsencrypt/live/<domain>/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem;

  # Basic hardening
  add_header Strict-Transport-Security "max-age=63072000; includeSubdomains; preload" always;
  add_header X-Frame-Options DENY;
  add_header X-Content-Type-Options nosniff;

  client_max_body_size 10m;

  # Stripe webhook must receive raw body
  location /api/tenants/ {
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:4000;
  }
}
```

## 2) PostgreSQL (Master + Tenant)

- Provision Postgres (managed or self-hosted)
- Create DB users with least privilege
- Set envs in `apps/api/.env`:
  - `MASTER_DATABASE_URL=postgresql://user:pass@host:5432/masterdb`
  - `TENANT_DATABASE_URL=postgresql://user:pass@host:5432/tenantdb`
- Run Prisma migrations (master and tenant)
- Optional: seed a demo tenant

## 3) API Environment (apps/api/.env)

- Core
  - `PORT=4000`
  - `ALLOWED_ORIGINS=https://app.<domain>`
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (rotate regularly)
  - `ACCESS_TTL=15m`, `REFRESH_TTL=30d`
  - `MASTER_DATABASE_URL`, `TENANT_DATABASE_URL`
- Stripe
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- PayPal
  - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` (sandbox|live)
- MTN MoMo / Orange Money
  - `MTN_MOMO_API_KEY`, `MTN_MOMO_USER_ID`, `MTN_MOMO_ENV`
  - `ORANGE_MOMO_API_KEY`, `ORANGE_MOMO_ENV`
- Messaging (optional)
  - `REDIS_URL` if using Socket.io Redis adapter

## 4) Web Environment (apps/web/.env)

- `VITE_API_URL=https://api.<domain>`
- `VITE_ENABLE_ECOMMERCE=true`
- `VITE_ENABLE_STRIPE=true` (if needed in staging)
- `VITE_STRIPE_PUBLISHABLE_KEY=...` (if Stripe Elements are used)

## 5) Payments Provider Setup

- PayPal
  - Create app (Sandbox/Live), get Client ID/Secret
  - Configure return URLs if using redirect (server-initiated supported)
- Stripe
  - Set API key, create webhook endpoint (see `docs/stripe-webhook-setup.md`)
  - Put `STRIPE_WEBHOOK_SECRET` in API env
- MTN MoMo / Orange Money
  - Register API credentials
  - Set callback URLs to your API:
    - MTN: `POST /api/tenants/:tenantId/ecommerce/payments/mtn/callback`
    - Orange: `POST /api/tenants/:tenantId/ecommerce/payments/orange/callback`

## 6) Storage / CDN (optional)

- S3 or compatible bucket for product images/logos
- Private access + presigned or signed CDN URLs (see `docs/s3-private.md`)
- Optional CDN for front static assets

## 7) Observability & Alerts

- Metrics (API): CPU, mem, GC, p50/p95/p99 latency, error rate
- Payments dashboards:
  - Gateway success/failure, webhook latency, idempotency conflicts
  - Alert on spike of `paymentStatus=failed/timeout`
- Messaging dashboards:
  - WS active connections, reconnects, message latency
  - REST send/read error rate; alert on spikes
- Error tracking: Sentry (front/back)
- Logs: JSON centralized with request IDs

## 8) CI/CD & E2E

- GitHub Actions ready (`/.github/workflows/ci.yml`):
  - Build API/Web
  - Start API
  - Run Playwright E2E: MoMo callbacks; Messaging (best-effort)
- Required CI env vars:
  - `API_URL`
  - Optional messaging users: `E2E_TENANT`, `E2E_USER_A_ID`, `E2E_USER_B_ID`, `E2E_USER_A_TOKEN`, `E2E_USER_B_TOKEN`

## 9) Deploy Procedures

- Build
  - `npm -w apps/api run build`
  - `npm -w apps/web run build`
- Run API (example systemd)
```ini
[Unit]
Description=AfriGest API
After=network.target

[Service]
WorkingDirectory=/opt/afrigest
ExecStart=/usr/bin/node apps/api/dist/app.js
Restart=always
EnvironmentFile=/opt/afrigest/api.env

[Install]
WantedBy=multi-user.target
```
- Web: serve `apps/web/dist/` behind NGINX or object storage + CDN

## 10) Operations — Day 2

- Start/Stop/Restart API via systemd/K8s/PM2
- Migrations on deploy; backup before major updates
- Payment incident response
  - Check provider dashboards; replay webhooks if needed
  - Reconcile `paymentStatus` and `EcommercePayment`
- Messaging incident response
  - Verify WS handshake and auth; check Redis adapter if used

## 11) Security & Compliance

- RBAC: confirm role mappings (see `docs/rbac.md`, `docs/rbac-matrix.md`)
- Data rights (export/delete) processes
- Secrets rotation plan (JWT/payment keys)

## 12) Staging

- Separate keys for Sandbox
- Protect staging via basic auth/IP allowlist
- Run E2E suites on staging before production cutover
