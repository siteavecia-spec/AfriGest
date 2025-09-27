# AfriGest Documentation Index

This index links all key documents to navigate features, phases, and runbooks.

## Phase Status
- Phase 1 (MVP): validated in demo mode; ready to install. For production grade: finalize tenant provisioning (Master DB + migrations/seed) and enriched audit.
- Phase 2 (Consolidation): feature-complete in demo mode (Transfers + Inventory + Exports EOD/period); for production grade: PDG consolidated dashboard refinements and end-of-day PDF, optional attachments for transfers.

## Getting Started
- `requirements.md`
- `cahier-des-charges-afrigest.md`
- `ENV.md`, `web.env.example`, `api.env.example`

## Messaging
- `afritalk-spec.md`

## API (OpenAPI)
- `openapi.yaml` (Admin/Partners skeleton + Transfers/Inventory)

## Quick Install & Tests
- Dev API: `npm run dev:api`
- Dev Web: `npm run dev:web`
- E2E Tests:
  - Install: `npm i -D @playwright/test && npx playwright install`
  - Run: `npx playwright test --config e2e/playwright.config.ts`
  - Env: `E2E_BASE_URL` (default `http://localhost:5173`), `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_COMPANY`

## Sales Exports (EOD & Overview)
- End-of-day (EOD): `GET /sales/eod?date=YYYY-MM-DD&boutiqueId=ID|all` → CSV in UI (Dashboard, POS)
- Period overview (PDG): `GET /sales/overview?from=YYYY-MM-DD&to=YYYY-MM-DD&boutiqueId=ID|all` → CSV (daily series + totals)
