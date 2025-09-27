# AfriGest Monorepo

This repository contains the AfriGest SaaS platform (MVP).

- apps/web: React + Vite + MUI + Redux Toolkit + PWA
- apps/api: Node.js (Express) + TypeScript + JWT + bcrypt
- infra/prisma: Prisma schemas for master and tenant Postgres databases
- packages/ui, packages/core: Shared UI/theme and types/schemas (placeholders)

## Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL (staging/prod); for local dev you can start with a single Postgres instance

## Getting Started

1. Install dependencies

```
npm install
```

2. Start API (dev)

```
npm run dev:api
```

3. Start Web (dev)

```
npm run dev:web
```
4. Prisma (to be configured later with real connection strings)

- Master schema: `infra/prisma/master/schema.prisma`
- Tenant schema: `infra/prisma/tenant/schema.prisma`

  ## Documentation
  
  - Documentation Index: [docs/README.md](docs/README.md)
  - Phase 1 User Stories & RACI: [docs/phase1-user-stories.md](docs/phase1-user-stories.md)
  - Phase 2 Plan: [docs/phase2-plan.md](docs/phase2-plan.md)
  - E‑commerce Module Overview: [docs/ecommerce-overview.md](docs/ecommerce-overview.md)
  - Private media (S3 via CloudFront signed URLs): [docs/s3-private.md](docs/s3-private.md)

## Environment Variables

Create `apps/api/.env` with at least:
PORT=4000
JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
MASTER_DATABASE_URL=postgresql://user:password@localhost:5432/afrigest_master
```

## Scripts

- dev:web – run Vite dev server
- dev:api – run API with ts-node-dev
- build – build web and api

---

Branding (strict):
- Primary Blue: #1D4ED8
- Primary Green: #059669
- Text Dark: #111827
- Neutral Light: #E5E7EB
- White: #FFFFFF
- Font: Inter
- Spacing: 8px grid; Radius: 4px/8px
