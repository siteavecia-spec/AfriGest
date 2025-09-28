# AfriGest — Setup Runbook (Windows / PowerShell)

This runbook consolidates every step needed to bring AfriGest up on your machine and verify the e‑commerce flows without real Stripe/PayPal.

It also explains what to send back to me to finalize the DB-backed setup.

---

## 0) Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 14+ (local, Docker, or managed)
- PowerShell (Windows)

Repository structure references:
- API: `apps/api/`
- Web: `apps/web/`
- Prisma schemas: `infra/prisma/tenant/schema.prisma`, `infra/prisma/master/schema.prisma`
- Env examples: `docs/env/api.env.example`, `docs/env/web.env.example`

---

## 1) Create PostgreSQL databases and users

Use either psql or Docker. Example psql commands (adjust credentials):

```sql
-- MASTER DB
CREATE DATABASE afrigest_master;
CREATE USER afrigest_master_user WITH ENCRYPTED PASSWORD 'CHANGE_ME!';
GRANT ALL PRIVILEGES ON DATABASE afrigest_master TO afrigest_master_user;

-- TENANT DEMO DB
CREATE DATABASE afrigest_demo;
CREATE USER afrigest_tenant_user WITH ENCRYPTED PASSWORD 'CHANGE_ME!';
GRANT ALL PRIVILEGES ON DATABASE afrigest_demo TO afrigest_tenant_user;
```

Docker quick start:
```powershell
docker run --name pg-afrigest -e POSTGRES_PASSWORD=CHANGE_ME! -p 5432:5432 -d postgres:15
```

---

## 2) Build database URLs

Format:
```
postgresql://USER:PASSWORD@HOST:PORT/DBNAME
```

Examples:
- Master: `postgresql://afrigest_master_user:CHANGE_ME!@localhost:5432/afrigest_master`
- Tenant demo: `postgresql://afrigest_tenant_user:CHANGE_ME!@localhost:5432/afrigest_demo`

---

## 3) Configure env files

Copy examples (already added by me):
- `docs/env/api.env.example` → `apps/api/.env`
- `docs/env/web.env.example` → `apps/web/.env`

Fill `apps/api/.env`:
```ini
PORT=4000
NODE_ENV=development

# Auth (choose strong secrets)
JWT_ACCESS_SECRET=change_me_access_strong
JWT_REFRESH_SECRET=change_me_refresh_strong
RESET_TOKEN_SECRET=change_me_reset_strong

# DB URLs
MASTER_DATABASE_URL=postgresql://afrigest_master_user:CHANGE_ME!@localhost:5432/afrigest_master
TENANT_DATABASE_URL=postgresql://afrigest_tenant_user:CHANGE_ME!@localhost:5432/afrigest_demo

# CORS
ALLOWED_ORIGINS=http://localhost:5173
```

Optional (leave empty until needed): Stripe, S3/CloudFront, SMTP.

Fill `apps/web/.env`:
```ini
VITE_API_URL=http://localhost:4000
VITE_ENABLE_ECOMMERCE=true
VITE_ENABLE_STRIPE=false
# VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 4) Generate Prisma clients

Schemas are configured to output where the API expects them:
- Tenant → `apps/api/src/generated/tenant`
- Master → `apps/api/src/generated/master`

Run:
```powershell
npm -w apps/api run prisma:generate
```

Troubleshooting on Windows (EPERM rename lock):
- Stop any dev server locking files (e.g., API running via `tsx`).
- Temporarily disable AV real‑time scanning or exclude `apps/api/src/generated/`.
- Delete the folder `apps/api/src/generated/tenant` if partially created.
- Re‑run the command above.

---

## 5) Deploy tenant migrations (DB‑backed mode)

Per tenant DB:
```powershell
$env:DATABASE_URL="postgresql://afrigest_tenant_user:CHANGE_ME!@localhost:5432/afrigest_demo"
npx prisma migrate deploy --schema infra/prisma/tenant/schema.prisma
```

Repeat for each tenant DB you want to enable.

---

## 6) Start servers

API (dev):
```powershell
npm run dev:api
# http://localhost:4000
```

Web (dev):
```powershell
npm run dev:web
# http://localhost:5173
```

---

## 7) Quick QA checklist

- Payments simulate (no keys):
  - POST `/api/tenants/demo/ecommerce/payments/simulate`
  - POST `/api/tenants/demo/ecommerce/payments/simulate-mtn`
  - POST `/api/tenants/demo/ecommerce/payments/simulate-orange`

- Order COD (cash on delivery):
  - POST `/api/tenants/demo/ecommerce/orders` with `{ payment: { provider: 'cod' } }`

- KPIs today (requires JWT):
  - GET `/api/tenants/demo/ecommerce/summary`

- Web Checkout (`apps/web/src/pages/Storefront/Checkout.tsx`):
  - Stripe button hidden (since `VITE_ENABLE_STRIPE=false`)
  - Visible: COD + simulate MTN + simulate Orange

---

## 8) Minimal Auth flow (DB‑backed)

1) Register (bootstrap if no user yet):
```
POST /auth/register
{ "email": "admin@example.com", "password": "StrongPass123!", "fullName": "Admin", "company": "demo" }
```
2) Login:
```
POST /auth/login
{ "email": "admin@example.com", "password": "StrongPass123!", "company": "demo" }
```
3) Use `Authorization: Bearer <accessToken>` and header `x-company: demo` for protected endpoints.

---

## 9) What to send me (so I can finalize for you)

Send non‑sensitive details here (or via your preferred channel):
- Tenant codes to provision (e.g., `demo`, `acme`)
- DB host/port (e.g., `localhost:5432`)
- DB names (e.g., `afrigest_master`, `afrigest_demo`)
- DB users (no passwords here)
- CORS origins (e.g., `http://localhost:5173`)
- Module flags: E‑commerce ON, Stripe OFF, Media OFF (or your preferences)

Send sensitive info via a secure channel (not here):
- DB passwords
- JWT secrets
- Stripe / S3 / CloudFront / SMTP secrets (if/when needed)

With these, I will:
- Prepare/adjust `.env` files
- Generate Prisma clients
- Deploy tenant migrations
- Verify the DB‑backed flows end‑to‑end

---

## 10) Optional integrations

- Stripe (real): add `STRIPE_SECRET_KEY` (API) and `VITE_STRIPE_PUBLISHABLE_KEY` (Web), then set `VITE_ENABLE_STRIPE=true`.
- S3/CloudFront: set `S3_REGION`, `S3_BUCKET`, `CLOUDFRONT_*` to enable private media upload/signing.
- SMTP: set `SMTP_*` for outbound emails.

---

## 11) One‑shot PowerShell helper (optional)

You can use `tools/bootstrap.ps1` (added by me) to:
- Copy env examples
- Prompt for DB URLs and JWT secrets
- Run Prisma generate and tenant migrate deploy
- Run quick API tests

Usage:
```powershell
# From repo root
powershell -ExecutionPolicy Bypass -File .\tools\bootstrap.ps1
```

Follow the prompts.

---

## 12) Production (later)

- Build: `npm run build`
- API: run `node apps/api/dist/index.js` behind Nginx/Traefik (TLS at the proxy)
- Web: serve Vite build statically (Nginx) or via Vercel/Netlify
- Observability: add monitoring/logging/backups as needed
