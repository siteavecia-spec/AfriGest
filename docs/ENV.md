# Environment Setup

## API (`apps/api`)

Create a `.env` file with, at minimum:

```
PORT=4000
JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
RESET_TOKEN_SECRET=change_me_reset
MASTER_DATABASE_URL=postgresql://user:password@localhost:5432/afrigest_master
TENANT_DATABASE_URL=postgresql://user:password@localhost:5432/afrigest_tenant_demo
WEB_URL=http://localhost:5173
```

Prisma Tenant uses `DATABASE_URL` at migration time. Set it before running migrate/generate:

Windows PowerShell:
```powershell
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/afrigest_tenant_demo"
```

Generate and run migrations:
```powershell
npx prisma generate --schema ..\..\infra\prisma\tenant\schema.prisma
npx prisma migrate dev --name init --schema ..\..\infra\prisma\tenant\schema.prisma
```

## Web (`apps/web`)

Create a `.env` file with:

```
VITE_API_URL=http://localhost:4000
```

## Running locally

From repo root:
```bash
npm install
npm run dev:api
npm run dev:web
```

Login flow expects `x-company: demo` header to resolve the tenant (automatiquement géré côté web via localStorage `afrigest_company`).
