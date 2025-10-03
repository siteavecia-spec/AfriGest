# AfriGest Quickstart Config

This guide gets you running API + Web locally with demo seeds.

## Prerequisites
- Node.js 18+
- npm

## 1) Create local .env files

- API: copy `docs/api.env.example` to `apps/api/.env`
- Web: copy `docs/web.env.example` to `apps/web/.env`

Example (PowerShell):
```powershell
Copy-Item docs\api.env.example apps\api\.env
Copy-Item docs\web.env.example apps\web\.env
```

### API `.env`
Start in memory mode first, then switch to DB later.
```
PORT=4000
USE_DB=false
# When switching to DB later, set USE_DB=true and configure DB URLs
# MASTER_DATABASE_URL=...
# TENANT_DATABASE_URL=...
```

### Web `.env`
```
VITE_API_URL=http://localhost:4000
# Vite dev server runs on 5174 in this project
VITE_PORT=5174
```

## 2) Start services
From repo root:
```powershell
npm install
npm run dev:api
npm run dev:web
```
- API: http://localhost:4000
- Web: http://localhost:5174

## 3) Authenticate (dev)
Use a super admin/pdg account from `docs/TEST_ACCOUNTS.md` or your seed users.
- Login endpoint (example): `POST /auth/login` with `{ email, password }` to obtain a token.
- In the Web app, use the login form; the app will store the token.

## 4) Seed demo data
The API exposes dev routes under `/dev` (auth + role required: `super_admin` or `pdg` unless noted).

- Basic seed (in-memory products/stock/supplier):
```bash
curl -X POST http://localhost:4000/dev/seed/basic \
  -H "Authorization: Bearer <token>"
```

- Sales seed (creates a few demo sales; decrements stock):
```bash
curl -X POST http://localhost:4000/dev/seed/sales \
  -H "Authorization: Bearer <token>"
```

- Status (quick counts):
```bash
curl http://localhost:4000/dev/status \
  -H "Authorization: Bearer <token>"
```

- Seed tenant users in DB (requires `USE_DB=true` and valid `TENANT_DATABASE_URL`):
```bash
curl -X POST http://localhost:4000/dev/seed/users \
  -H "Authorization: Bearer <token>"
```

## 5) Switch to DB mode (optional, after verification)
1. Set in `apps/api/.env`:
   - `USE_DB=true`
   - `MASTER_DATABASE_URL=...`
   - `TENANT_DATABASE_URL=...`
2. Apply migrations/seeds per `docs/db-activation.md` and `docs/tenant-provisioning-runbook.md`.
3. Restart API and repeat seeds where applicable (e.g., `/dev/seed/users`).

## Troubleshooting
- Ports: ensure `4000` (API) and `5174` (Web) are free.
- CORS/URL: verify `VITE_API_URL` matches API base in `apps/web/.env`.
- Auth: ensure you use a token with appropriate roles.

## References
- `docs/ENV.md`
- `docs/TEST_ACCOUNTS.md`
- `docs/db-activation.md`
- `docs/tenant-provisioning-runbook.md`
