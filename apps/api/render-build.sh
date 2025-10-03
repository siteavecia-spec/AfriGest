#!/usr/bin/env bash
set -euo pipefail

# Install dependencies for the API workspace
npm ci

# Generate Prisma clients (MASTER and TENANT)
npx prisma generate --schema ../../infra/prisma/master/schema.prisma
npx prisma generate --schema ../../infra/prisma/tenant/schema.prisma

# Apply Prisma migrations in production (idempotent)
# Master schema uses MASTER_DATABASE_URL from environment
npx prisma migrate deploy --schema ../../infra/prisma/master/schema.prisma

# Tenant schema expects DATABASE_URL; bind it temporarily to TENANT_DATABASE_URL
DATABASE_URL="${TENANT_DATABASE_URL:-}" npx prisma migrate deploy --schema ../../infra/prisma/tenant/schema.prisma

# Build the API
npm run build
