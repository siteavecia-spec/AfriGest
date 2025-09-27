# Tenant Provisioning Runbook (Skeleton)

## Goals
- Consistent, idempotent provisioning of a tenant database per company.
- Safe rollback when partial failures occur.

## Preconditions
- Master DB reachable and healthy.
- Templates and Prisma migrations validated.

## Steps
1) Reserve company in master DB (status=pending)
2) Create tenant DB (afrigest_<code>)
3) Run migrations on tenant DB
4) Seed minimal data (company settings, default boutique, admin user)
5) Mark company active in master; emit event; send onboarding email

## Rollback
- If failure after step 2: drop tenant DB
- If failure after step 3: drop tenant DB, reset master status
- If failure after step 4: attempt reseed; else drop tenant DB

## Verification
- Health check endpoint for tenant responds
- Login as admin works; default data present

## Automation
- CLI: `apps/api/scripts/provision-tenant.mjs`
- CI hook to validate migrations

## Observability
- Logs with request IDs; metrics: time to provision, error rate

## Appendix
- Command snippets (to be filled in when wiring real infra)
