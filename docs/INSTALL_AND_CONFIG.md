# AfriGest – Installation & Configuration (Phases 1 → 4)

Ce document regroupe toutes les configurations et installations nécessaires pour amener AfriGest en mode production, de la Phase 1 à la Phase 4, y compris PostgreSQL (master + tenants), variables d’environnement, provisioning, sécurité, exports et paiements.

---

## 1) Prérequis
- Node.js 18+
- npm 9+
- PostgreSQL (1 instance suffit pour master + tenants)
- Accès S3 ou équivalent (stockage privé) si médias e‑commerce privés
- Clés d’API (optionnelles selon périmètre):
  - Stripe (publishable + secret) / PayPal (client/secret)
  - Mobile Money (MTN / Orange) – ou simulateurs fournis
  - SMTP/Nodemailer (si e‑mails sortants)

---

## 2) PostgreSQL – Bases & Utilisateurs

### 2.1 Schéma Master (multi‑tenant directory)
- Base: `afrigest_master`
- Utilisateur: `afrigest_master_user` (ROLE)
- Droits: CRUD sur `afrigest_master`

### 2.2 Schémas Tenants
- Convention: `afrigest_<code>` (ex: `afrigest_acme`)
- Utilisateur: `afrigest_tenant_user` (ROLE) ou 1 utilisateur par tenant si politique stricte
- Droits: CRUD sur la base tenant

> Exemple commandes (à adapter):
```
CREATE DATABASE afrigest_master;
CREATE USER afrigest_master_user WITH ENCRYPTED PASSWORD '***';
GRANT ALL PRIVILEGES ON DATABASE afrigest_master TO afrigest_master_user;

-- Pour un tenant "acme"
CREATE DATABASE afrigest_acme;
CREATE USER afrigest_tenant_user WITH ENCRYPTED PASSWORD '***';
GRANT ALL PRIVILEGES ON DATABASE afrigest_acme TO afrigest_tenant_user;
```

---

## 3) Variables d’environnement (API & WEB)

### 3.1 API (`apps/api/.env`)
```
PORT=4000
NODE_ENV=production

# Auth
JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
RESET_TOKEN_SECRET=change_me_reset

# Master DB
MASTER_DATABASE_URL=postgresql://afrigest_master_user:***@localhost:5432/afrigest_master

# Tenants: résolus par l’API selon le code société (x-company) –
# Les URL DB tenant peuvent être stockées en Master ou construites dynamiquement

# Email (optionnel)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Stripe (optionnel)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-west-3
S3_BUCKET_PRIVATE=afrigest-private
CLOUDFRONT_PRIVATE_KEY=...
CLOUDFRONT_KEY_PAIR_ID=...

# CORS (exemples)
# Vercel + Render + domaine custom
ALLOWED_ORIGINS=https://afrigest-web.vercel.app,https://afrigest-web.onrender.com,https://app.mondomaine.com

# Exemples d'URL DB tenants & commandes types
# Modèle URL tenant:
#   postgresql://afrigest_tenant_user:***@db-host:5432/afrigest_<code>
# Commandes:
#   createdb afrigest_<code>
#   DATABASE_URL=postgresql://afrigest_tenant_user:***@db-host:5432/afrigest_<code> \
#       npx prisma migrate deploy --schema infra/prisma/tenant/schema.prisma
#   # Seed initial (adapter): script Node/TS dédié au seed
- Fichier: `apps/api/scripts/provision-tenant.mjs`
- Étapes:
  1) Réserver l’entreprise en Master (`code`, `name`, etc.)
  2) Créer la DB tenant `afrigest_<code>`
  3) Déployer migrations sur la DB tenant (`prisma migrate deploy`)
  4) Seed minimal: PDG/Admin, 1 boutique par défaut, paramètres société (devise, TVA)
  5) Marquer l’entreprise active en Master et envoyer l’e‑mail onboarding (optionnel)

### 5.2 Runbook
- Voir `docs/tenant-provisioning-runbook.md` (compléter avec commandes exactes DB/Prisma de votre environnement)

---

## 6) Lancement (Dev & Prod)

### 6.1 DEV
```
# API
npm run dev:api
# WEB
npm run dev:web
```

### 6.2 PROD (exemple simple)
- API: PM2 ou systemd; reverse proxy Nginx, TLS terminé devant l’API
- WEB: build Vite puis servir statiquement (Nginx) ou via un hébergeur (Netlify/Vercel)
```
# Build
npm run build
# Lancer API
node apps/api/dist/index.js
```

---

## 7) Sécurité & Audit
- Rate limiting activé (`apps/api/src/middleware/rateLimit.ts`)
- Headers sécurité (`helmet`)
- Audit (à enrichir): `apps/api/src/stores/audit.ts` + usage dans routes sensibles
- RBAC via middleware (`apps/api/src/middleware/rbac.ts`)
- Secrets: ne jamais commiter; stocker dans un gestionnaire de secrets; rotation régulière

> Doc: `docs/security-compliance.md`, `docs/rbac-matrix.md`

---

## 8) Exports & Rapports
- EOD (Jour):
  - API: `GET /sales/eod?date=YYYY-MM-DD&boutiqueId=ID|all`
  - UI: Dashboard & POS – CSV et PDF
- Période (PDG):
  - API: `GET /sales/overview?from=YYYY-MM-DD&to=YYYY-MM-DD&boutiqueId=ID|all`
  - UI: Dashboard – CSV (séries journalières + totaux)

---

## 9) E‑commerce & Paiements
- **Routes** (déjà en place): `apps/api/src/routes/ecommerce/*`
- **Simulateurs** (pour QA):
  - `POST /api/tenants/:tenantId/ecommerce/payments/simulate`
  - `POST /api/tenants/:tenantId/ecommerce/payments/simulate-mtn`
  - `POST /api/tenants/:tenantId/ecommerce/payments/simulate-orange`
- **Intégrations réelles** (à configurer):
  - Stripe: `STRIPE_SECRET_KEY` (API) + `VITE_STRIPE_PUBLISHABLE_KEY` (WEB), webhooks Stripe (voir `docs/stripe-webhook-setup.md`)
  - PayPal: client/secret + flux capture/redirect
  - MoMo (MTN/Orange): endpoints init + callback; sécuriser secrets PSP

---

## 10) Stockage & Médias (S3)
- Config S3 + CloudFront signé si médias privés e‑commerce
- Voir `docs/s3-private.md`

---

## 11) Cron & Automations
- Digest alertes (stock/expired):
  - Script: `apps/api/scripts/alerts-digest.mjs`
  - Doc: `docs/CRON_ALERTS.md` (crontab, systemd timer, PM2 cron, Windows Task Scheduler)

---

## 12) PWA & Offline
- Manifeste/SW présents; POS offline queue (`apps/web/src/offline/salesQueue.ts`)
- Doc: `docs/pwa-offline-guide.md`

---

## 13) Tests & QA
- **E2E** (Playwright):
  - Installer: `npm i -D @playwright/test && npx playwright install`
  - Lancer: `npx playwright test --config e2e/playwright.config.ts`
  - Tests fournis: `transfers-happy-path.spec.ts`, `inventory-variance-export.spec.ts`, `checkout-simulate.spec.ts`
- **Perf/charges**: à ajouter (k6/autocannon). Voir `apps/api/package.json:bench`

---

## 14) Phase‑wise Checklists

### Phase 1 (MVP)
- Auth/RBAC ✅
- POS (online/offline) + reçus ✅
- Stock/Produits/Fournisseurs ✅
- Dashboard basique + export jour ✅
- Super Admin (CRUD entreprises + impersonation) ✅
- PWA ✅
- PROD‑GRADE: Provisioning Master/Tenant + Audit enrichi ⬜

### Phase 2 (Consolidation)
- Transferts bout‑à‑bout ✅
- Inventaire variance + CSV ✅
- Exports EOD/Overview (CSV) + EOD PDF ✅
- PROD‑GRADE: Dashboard PDG période enrichi, BL/attachments transferts (optionnel) ⬜

### Phase 3 (Scalabilité/Docs)
- i18n FR/EN + sélecteur ✅ (à étendre)
- Partners API (OpenAPI) ✅
- E‑invoicing (plan) ✅

### Phase 4 (E‑commerce)
- Storefront & Admin e‑commerce ✅ (base)
- Paiements simulés ✅
- Exports KPI/Top produits (jour/période) ✅ (v1)
- PROD‑GRADE: intégrations réelles Stripe/PayPal/MoMo, KPIs période serveur ⬜

---

## 15) Annexes & Références
- `docs/README.md` (index)
- `docs/openapi.yaml` (API doc)
- `docs/backlog/PHASES_BACKLOG.md` (backlog)
- `docs/go-live-checklist.md` (mise en prod)

---

Si besoin, je peux fournir un script d’exemple pour le provisioning complet (création DB + migrations + seed) et un guide pour Packager/PM2/systemd pour l’API et l’app Web.

---

## 16) Remaining Steps (Checklist)

- [API Env] Edit `apps/api/.env` (copy from `docs/env/api.env.example`):
  - Set `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.
  - Set `MASTER_DATABASE_URL` for the master DB (optional for MVP).
  - Set `TENANT_DATABASE_URL` for your demo tenant if you want DB-backed flows.
  - Optionally set `ALLOWED_ORIGINS` (comma-separated) for non-dev CORS.
  - Leave Stripe empty until you have real keys.

- [Web Env] Edit `apps/web/.env` (copy from `docs/env/web.env.example`):
  - Ensure `VITE_API_URL=http://localhost:4000` in dev.
  - Ensure `VITE_ENABLE_ECOMMERCE=true` and `VITE_ENABLE_STRIPE=false` (until keys).

- [Prisma Clients] Generate Prisma clients (code only):
  - Tenant schema output: `apps/api/src/generated/tenant` (configured in `infra/prisma/tenant/schema.prisma`).
  - Master schema output: `apps/api/src/generated/master` (configured in `infra/prisma/master/schema.prisma`).
  - Commands:
    - `npm -w apps/api run prisma:generate`

- [Migrations] When DB URLs are ready, deploy tenant migrations:
  - Per tenant database:
    - `DATABASE_URL=postgresql://.../afrigest_<code> npx prisma migrate deploy --schema infra/prisma/tenant/schema.prisma`

- [Run] Dev:
  - API: `npm run dev:api` → http://localhost:4000
  - Web: `npm run dev:web` → http://localhost:5173

- [QA quick tests]
  - Payments simulate: POST `/api/tenants/:tenantId/ecommerce/payments/simulate(-mtn|-orange)`
  - Orders COD: POST `/api/tenants/:tenantId/ecommerce/orders` with `{ payment: { provider: 'cod' } }`
  - KPIs: GET `/api/tenants/:tenantId/ecommerce/summary` (requires JWT)

## 17) Troubleshooting

- Prisma generate on Windows (EPERM rename in `apps/api/src/generated/tenant`):
  - Symptom: `EPERM: operation not permitted, rename '...query_engine-windows.dll.node.tmp...'`
  - Fix:
    - Stop any running dev servers that may lock the file (e.g., `tsx watch src/index.ts`).
    - Close any antivirus real-time scanner that may lock DLLs, or add the folder to exclusions.
    - Re-run: `npm -w apps/api run prisma:generate`.
  - If still blocked, delete the folder `apps/api/src/generated/tenant` and try again.

- 501/400 on S3/CloudFront media endpoints:
  - Provide minimal env: `S3_REGION`, `S3_BUCKET` (for uploads presign) and `CLOUDFRONT_*` (for signed URLs), then restart API.

- Stripe 501/Invalid key:
  - Keep Stripe disabled until you have `STRIPE_SECRET_KEY` (server) and `VITE_STRIPE_PUBLISHABLE_KEY` (web). With flags off, the UI hides card payment.

