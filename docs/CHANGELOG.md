# AfriGest — E‑Commerce Module — CHANGELOG

## 2025-10-03 — Phase 2 Readiness (Storefront + Payments + Messaging)

### Backend
- Payments finalized for MVP: PayPal (order & capture), MTN MoMo and Orange Money (init + callbacks) under `apps/api/src/routes/ecommerce/payments.ts` with idempotent updates of `paymentStatus` and creation of `EcommercePayment`.
- Inventory shared mode wired through Prisma service with safe decrement/release during logistics status transitions in `apps/api/src/routes/ecommerce/orders.ts`.
- Messaging module (AfriTalk) endpoints ready: list conversations, fetch conversation (pagination `limit/before`), send message (sanitation + rate limit), mark read; WebSocket broadcasts `messaging:new` and `messaging:read`.
- RBAC: dedicated `messaging` ModuleKey added in `apps/api/src/middleware/authorization.ts`; routes protected accordingly; audit via `auditReq` on send/read.

### Frontend (Admin + Storefront)
- Public storefront completed for MVP: Catalog, Product, Cart, Checkout (PayPal init), and public Track page `/shop/track`.
- Admin: Messaging UI (Conversations, Chat with “Charger plus” pagination, Presence), Orders page payment test buttons, KPIs updates.

### E2E
- Added targeted Playwright suites:
  - `e2e/tests/ecommerce-momo-callbacks.spec.ts` covering MTN/Orange init + callback and order payment status update.
  - `e2e/tests/messaging.spec.ts` covering REST send + read flows; WS verified separately during manual smoke.

### Docs
- Updated RBAC to include `messaging` module.
- Bumped AfriTalk spec with latest endpoints, sanitation, and rate limiting notes.

## 2025-09-25 — Phase 1 (in‑memory + Prisma fallback)

### Backend
- Added multi-tenant e-commerce routes under `/api/tenants/:tenantId/ecommerce/*`:
  - `products`, `orders`, `customers`, `sync-inventory`, `summary`, `webhooks`.
- Implemented services with Prisma support and in-memory fallback:
  - `orderService` (list/create/update/KPIs), `stockService`, `paymentService` (Stripe), `catalogService` (read).
- Stripe Phase 1:
  - `POST /orders` with `payment.provider='stripe'` creates a pending order (if Prisma available) and a PaymentIntent (metadata `orderId`).
  - Webhook `POST /api/tenants/:tenantId/ecommerce/webhooks/stripe` (raw body) validates signature, persists `EcommerceWebhookEvent`, sets `paymentStatus=paid`, creates `EcommercePayment`.
- Summary KPIs:
  - `GET /ecommerce/summary` returns `onlineCount`, `onlineRevenue`, `paidCount`, `averageOrderValuePaid`, `conversionRate` (placeholder).
- App bootstrap:
  - Mounted Stripe raw-body route before `express.json()` in `apps/api/src/app.ts`.

### Frontend (Admin)
- Navigation: added "Boutique en ligne", links to `Produits`, `Commandes`, `Clients`, and `E‑commerce: Paramètres`.
- Customers page (`Customers.tsx`): list, create, and search (email/phone/name).
- Orders page (`Orders.tsx`):
  - Test buttons for COD and Stripe (displays returned `clientSecret`).
  - PaymentStatus badges with filters (Toutes/Payées/En attente).
  - Logistics status filter and actions: `Préparer`, `Expédier`, `Livrer`, `Retour`.
  - Customer info column.
- Dashboard (`Dashboard.tsx`): added KPIs for online channel:
  - Ventes en ligne (jour), CA en ligne (jour), Cmd payées (jour), Panier moyen en ligne (jour), Conversion (placeholder).

### Documentation
- Updated `docs/ecommerce-spec.md` to reflect Phase 1 implementation and next steps.
- Updated `docs/api.env.example` with Stripe webhook URL pattern and raw-body note.

### Next
- Stripe.js (Phase 2) checkout UI in Admin for E2E payment test.
- Observability (audit logs, CSV exports).
- Public storefront scaffold (multi-tenant, product list, COD, then Stripe).
