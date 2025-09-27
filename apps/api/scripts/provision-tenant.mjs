#!/usr/bin/env node
/*
  Provisioning skeleton for a new tenant/company.
  This is a placeholder CLI that outlines the steps. Replace with actual DB ops.

  Usage:
    node apps/api/scripts/provision-tenant.mjs --code acme --name "ACME SARL" --email admin@acme.com

  Expected env:
    DATABASE_URL_MASTER   Connection string for master DB
    PRISMA_BIN            Optional path to prisma
*/

import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
const exec = promisify(_exec)

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--code') out.code = args[++i]
    else if (a === '--name') out.name = args[++i]
    else if (a === '--email') out.email = args[++i]
  }
  return out
}

async function main() {
  const { code, name, email } = parseArgs()
  if (!code || !name) {
    console.error('Usage: provision-tenant --code <code> --name <name> [--email <contact>]')
    process.exit(2)
  }
  console.log(`[provision-tenant] Start provisioning: code=${code}, name=${name}, email=${email || '-'} `)

  // 1) Create tenant metadata in master DB (placeholder)
  console.log('[provision-tenant] (1/5) Insert company into master DB (placeholder)')

  // 2) Create tenant database and run migrations (placeholder)
  console.log('[provision-tenant] (2/5) Create tenant database/schema and run migrations (placeholder)')
  // Example commands (to adapt):
  // await exec(`createdb afrigest_${code}`)
  // await exec(`${process.env.PRISMA_BIN || 'npx prisma'} migrate deploy`)

  // Example: build tenant DATABASE_URL and run prisma migrate deploy
  try {
    const TENANT_DATABASE_URL = process.env.TENANT_DATABASE_URL || ''
    if (TENANT_DATABASE_URL) {
      console.log(`[provision-tenant] Running prisma migrate deploy on tenant DB`)
      await exec(`${process.env.PRISMA_BIN || 'npx prisma'} migrate deploy --schema ../../infra/prisma/tenant/schema.prisma`, {
        env: { ...process.env, DATABASE_URL: TENANT_DATABASE_URL }
      })
    } else {
      console.log('[provision-tenant] Skipping prisma migrate deploy (TENANT_DATABASE_URL not set)')
      console.log('[provision-tenant] Tip: set TENANT_DATABASE_URL=postgresql://user:pass@host:5432/afrigest_<code>')
    }
  } catch (e) {
    console.warn('[provision-tenant] prisma migrate deploy failed or skipped:', e?.message || e)
  }

  // 3) Seed minimal data (placeholder)
  console.log('[provision-tenant] (3/5) Seed minimal data (placeholder)')

  // 4) Create initial admin user and email verification (placeholder)
  console.log('[provision-tenant] (4/5) Create initial admin user (placeholder)')

  // 5) Emit onboarding email/task (placeholder)
  console.log('[provision-tenant] (5/5) Onboarding email sent (placeholder)')

  console.log('[provision-tenant] Done.')
}

main().catch(err => { console.error(err); process.exit(1) })
