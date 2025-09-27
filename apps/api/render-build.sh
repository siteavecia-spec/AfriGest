#!/usr/bin/env bash
set -euo pipefail

# Install dependencies for the API workspace
npm ci

# Generate Prisma client for MASTER schema so super admin routes can access it
npx prisma generate --schema ../../infra/prisma/master/schema.prisma

# Build the API
npm run build
