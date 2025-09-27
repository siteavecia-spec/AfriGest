# Master Admin & Provisioning (Skeleton)

## Overview
- Purpose of Master DB and Super Admin.
- Data separation: master vs tenant databases.
- High-level flows: company lifecycle, impersonation, provisioning.

## Data Model (Master)
- Company: id, code, name, contactEmail, status, createdAt, updatedAt.
- Subscription/Billing (future): plan, status, renewalDate.
- Audit: actor, action, resource, timestamp, ip.

## API Endpoints (Admin)
- POST /admin/companies
- GET /admin/companies
- PATCH /admin/companies/:id
- DELETE /admin/companies/:id
- POST /admin/impersonate -> returns temp token bound to tenant context.

## Impersonation & Security
- Token scoping to tenant; expiry; audit log.
- Revocation model.

## Provisioning Pipeline
- Reserve company code in master (unique).
- Create tenant DB from template; run migrations; seed minimal data.
- Create PDG/Admin user; send verification/onboarding email.
- Emit events/notifications.

## Error Handling & Idempotency
- Retries on infra; detect partial state.
- Rollback/compensation steps.

## Observability
- Structured logs; request IDs; metrics for provisioning time and failures.

## Runbooks
- See `tenant-provisioning-runbook.md`.
