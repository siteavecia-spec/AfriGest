# AfriGest — E‑Commerce Module — CHANGELOG

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
