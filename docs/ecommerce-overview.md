# E‑Commerce Module Overview (AfriGest)

This document provides a high‑level overview of the AfriGest E‑Commerce module, including API endpoints, UI flows, data synchronization, payments, and KPIs. It aligns with the multi‑tenant architecture and reuses core product, inventory, and order services.

## Objectives
- Add an integrated online store as a first‑class module within AfriGest (not a separate stack).
- Centralize catalog, stock, and orders; avoid data drift.
- Support African payment methods and cards; ensure compliance and security.
- Provide unified analytics and performance metrics for PDG/DG dashboards.

## Scope and Phasing
- Phase 1 (Base):
  - Public storefront (catalog, product detail, cart, checkout), guest checkout, basic payments, order creation as type "E‑commerce".
  - Sync of products (core -> e‑commerce) and stock decrement on order.
  - Basic shipping options and status workflow (Received → Prepared → Shipped).
- Phase 2 (Advanced):
  - Customer accounts, order history, promo codes, cross/up‑sell, advanced filters and search, webhooks for stock.
  - Multiple payment methods (Mobile Money: Orange/MTN, cards via Stripe/PayPal), emails and notifications.
- Phase 3 (Optimization):
  - Performance (<2s TTI on key pages), A/B testing, recommendation tuning, SLA 99.9%, satisfaction >4/5, +15% revenue uplift.

## API Endpoints (per Tenant)
Base path: `/api/tenants/{tenantId}/ecommerce`

- Products
  - `GET /products` — list products for storefront with pagination, filters, sort.
  - `GET /products/{productId}` — product details (images, attributes, price, availability).
  - `POST /products/sync` — trigger product sync (admin) to propagate updated data.

- Inventory
  - `GET /inventory/{sku}` — get stock availability for an SKU.
  - `POST /sync-inventory` — push pull update with core inventory; supports degraded mode fallback.

- Customers
  - `POST /customers` — create or upsert customer profile from checkout/account flow.
  - `GET /customers/{customerId}` — fetch customer account info and addresses (auth required).

- Orders
  - `POST /orders` — create order from checkout; creates a core sale of type "E‑commerce", decrements stock, assigns nearest store.
  - `GET /orders/{orderId}` — retrieve order status (Received/Prepared/Shipped/Delivered), tracking info.

- Media (private via CDN)
  - `GET /media/signed-url?path={key}` — returns a short‑lived CloudFront signed URL for assets (see `docs/s3-private.md`).

- Payments
  - `POST /payments/intent` — create a payment intent (Stripe/PayPal/card) or initiate Mobile Money payment.
  - `POST /payments/webhook` — receive gateway callbacks (secure, idempotent).

Notes:
- All endpoints are scoped to tenant; enforce RBAC and tenancy guards.
- Idempotency keys recommended for order and payment creation.
- Pagination standardization (limit/offset or cursor) for listing endpoints.

## Data Synchronization
- Product sync: Bidirectional mapping of attributes and statuses; canonical data remains in core. E‑commerce presentation fields (SEO title, web description, category tree) are stored in the e‑commerce layer and reconciled during sync.
- Inventory sync: Shared or dedicated stock modes.
  - Webhooks from core to storefront for stock changes.
  - Degraded mode if webhooks fail (periodic polling with backoff).

## Order Workflow
1. Order created with type "E‑commerce".
2. Reserve/decrement stock immediately.
3. Assign fulfillment to the nearest/eligible store.
4. Notifications to DG/ops.
5. Status transitions: Received → Prepared → Shipped → Delivered.
6. Customer receives email/SMS at key milestones.

## Payments
- Methods: Mobile Money (Orange, MTN), Card (Stripe/PayPal), Cash on Delivery.
- Security: PCI DSS scope minimized via tokenization; never store raw PAN.
- Reconciliation: Asynchronous confirmation via gateway webhooks; update order payment status atomically.

## UI Flows
- PDG/DG Back‑Office
  - Dashboard: unified KPIs (conversion, revenue, AOV, stockouts, fulfillment time).
  - Catalog Management: enrich web attributes, manage visibility, categories.
  - Orders: view statuses, reassign store, print packing slips, shipments.
  - Customers: view accounts, service requests, refunds/returns.

- Public Storefront
  - Catalog: rich listing, search and filters, lazy‑loaded images.
  - Product Detail: variants, attributes, availability by location.
  - Cart: simple persistence (local storage + server sync for logged users).
  - Checkout: guest or account, address, shipping, payment, review.
  - Post‑Purchase: order tracking page; email/SMS notifications.

## Environment & Feature Flags
- `ECOMMERCE_ENABLED` — toggle module per tenant or globally.
- `PAYMENTS_MOBILEMONEY_ENABLED`, `PAYMENTS_CARD_ENABLED` — switch payment rails per tenant.
- `CDN_SIGNED_URL_TTL` — TTL for media URLs (see CDN doc).
- `SEARCH_PROVIDER` — e.g., local SQL vs external search.

## Observability and SLA
- Logs: structured logs for orders, payments, inventory events.
- Metrics: latency, error rates per endpoint, gateway success/failure.
- Alerts: payment failure spikes, stockout anomalies, SLA violations.

## KPIs (Targets)
- Conversion rate: > 2%.
- Time to Interactive (catalog/product/checkout): < 2s.
- SLA: 99.9% uptime for storefront.
- Customer satisfaction: > 4/5.
- Revenue impact: +15% overall.
- Additional: AOV, CAC, churn/return rate, stockout rate, fulfillment lead time.

## Security
- Multi‑tenant isolation at data and CDN path levels.
- AuthZ for admin routes, CSRF protection for web forms, HTTPS everywhere.
- Validate inputs, sanitize search/filter parameters, apply rate limits.

## Next Steps
- Finalize API contracts and JSON schemas for endpoints above.
- Implement Phase 1 routes, then iterate to Phase 2.
- Set up CloudFront signed URL flow per `docs/s3-private.md`.
- Add dashboards for KPIs to PDG/DG views.

---

## Current Status (2025-10-03)

- **Storefront (Public)**: Implemented Catalog, Product Detail, Cart, Checkout (PayPal init), and Order Tracking `/shop/track`.
- **Payments (MVP)**: PayPal order/capture, MTN MoMo and Orange Money init + callbacks wired to update `paymentStatus` and persist `EcommercePayment`.
- **Inventory**: Shared mode decrement/release integrated with order status transitions (Prepared/Returned) using Prisma service.
- **Routing**: Multi-tenant routes under `/api/tenants/:tenantId/ecommerce/*` are active.
- **E2E**: Playwright tests added for MoMo callbacks; storefront flows validated via smoke.

Next validations: run E2E suites on CI, review KPIs, and harden observability (metrics/alerts per endpoint).
