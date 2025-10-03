# E2E Test Plan (Skeleton)

## Scope
- Critical flows (POS, stock, transfers, login/auth, settings), offline/online transitions.
- Admin (Super Admin companies), basic e-commerce (if enabled), messaging presence.

## Tooling
- Playwright or Cypress; CI pipeline with parallel running.

## Test Suites
- Auth: login, refresh flow, forgot/reset, email verification
- POS: add to cart, discounts, multi-payments, submit online/offline, receipts CSV/PDF
- Stock: entries, adjustments, summary
- Transfers: create, send, receive
- Dashboard: KPIs day, exports CSV, alerts digest trigger
- Settings: company config, VAT/currency
- Super Admin: companies CRUD (mock until API), navigation
- Offline: queue sales, go online, sync success + error handling

### New Suites (Phase 2 readiness)
- E‑Commerce Payments — MoMo callbacks
  - File: `e2e/tests/ecommerce-momo-callbacks.spec.ts`
  - Covers: MTN/Orange init + callback → order `paymentStatus=paid`
- Messaging (REST)
  - File: `e2e/tests/messaging.spec.ts`
  - Covers: send → fetch conversation → mark read

## Data & Environments
- Seeded demo data via `scripts/seed-demo.ts`
- Isolated tenant per CI run (recommended)

### Environment variables (local/CI)
- API base: `API_URL`
- Tenant: `E2E_TENANT`
- Messaging users (optional): `E2E_USER_A_ID`, `E2E_USER_B_ID`, `E2E_USER_A_TOKEN`, `E2E_USER_B_TOKEN`
- Payments (staging):
  - PayPal: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` (sandbox|live)
  - MTN MoMo: `MTN_MOMO_API_KEY`, `MTN_MOMO_USER_ID`, `MTN_MOMO_ENV`
  - Orange Money: `ORANGE_MOMO_API_KEY`, `ORANGE_MOMO_ENV`

## Reporting
- Videos, screenshots on failure, trace viewer (Playwright)

## CI Integration
- Add a job to run Playwright with `e2e/playwright.config.ts`.
- Cache browsers via `npx playwright install --with-deps` on setup.
- Run targeted suites on PRs, full matrix on main.

## Coverage Targets
- P0 flows 95% pass rate, performance sanity checks
