# Release — 2025-10-03 — Phase 2 Readiness (Storefront, Payments, Messaging)

## Summary
- Storefront public (`/shop`): Catalog, Product, Cart, Checkout (PayPal init), Tracking.
- Payments: PayPal order/capture; MTN MoMo + Orange Money init + callbacks.
- Inventory: Shared decrement/release in logistics transitions.
- Messaging (AfriTalk): REST + WS, RBAC `messaging`, audit, pagination, FE “Charger plus”.
- CI: Playwright E2E (MoMo callbacks + Messaging REST) added in `.github/workflows/ci.yml`.

## Notable Changes
- Backend
  - `apps/api/src/routes/ecommerce/payments.ts`: payment routes and callbacks
  - `apps/api/src/routes/messaging/*`: conversations, conversation (paginated), message (send), read
  - `apps/api/src/middleware/authorization.ts`: add `messaging` ModuleKey and route guards
- Frontend
  - `apps/web/src/pages/Messaging/Chat.tsx`: load more pagination, read receipts
  - Storefront pages under `apps/web/src/pages/Storefront/*`
- E2E
  - `e2e/tests/ecommerce-momo-callbacks.spec.ts`
  - `e2e/tests/messaging.spec.ts`

## Operator Actions (Required)
- Provision PostgreSQL; run Prisma migrations; set `MASTER_DATABASE_URL`, `TENANT_DATABASE_URL`.
- Configure reverse proxy + TLS for `api.<domain>`, `app.<domain>`, optionally `shop.<domain>`.
- Set payment env vars: PayPal, MTN MoMo, Orange Money (see `docs/go-live-checklist.md`).
- Configure payment webhooks/callback URLs per tenant.
- Set `apps/web/.env` (`VITE_API_URL`, feature flags). Rebuild and deploy.
- Monitoring/alerts: payments success/failure, webhook latency, messaging WS/REST metrics.

## CI
- Workflow updated at `/.github/workflows/ci.yml` to run Playwright suites.
- Ensure CI has needed env vars (`API_URL`, optional Messaging IDs/tokens for full coverage).

## Backlog — Sprint 02 (ELECTO AFRICA fit)
- `P1-POS-SPLIT-TENDER` — POS Paiement Mixte (MoMo + Cash)
- `P2-TRANSFERS-QR` — QR Transferts (PDF + Scan)
- `P2-NOTIFS-TRANSFERS-RESTOCK` — Notifications auto

## Validation
- Run pipeline on `main`; verify E2E success.
- Manual smoke: storefront checkout (PayPal sandbox), messaging send/read in Admin.
