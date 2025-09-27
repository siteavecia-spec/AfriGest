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

## Data & Environments
- Seeded demo data via `scripts/seed-demo.ts`
- Isolated tenant per CI run (recommended)

## Reporting
- Videos, screenshots on failure, trace viewer (Playwright)

## Coverage Targets
- P0 flows 95% pass rate, performance sanity checks
