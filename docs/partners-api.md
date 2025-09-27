# Partners API (Skeleton)

## Overview
- Goals: expose selected resources to partners via REST.
- Tenancy: all API calls are scoped to a tenant.

## Authentication
- API Keys per tenant; scopes per key.
- Header: `Authorization: ApiKey <key>` or `x-api-key`.
- Key management endpoints for PDG/Admin.

## Rate Limiting & Quotas
- Per key quotas; 429 handling; Retry-After.

## Resources (initial proposal)
- Products: list/search/read
- Stock: summary by boutique
- Sales: aggregated KPIs only (no PII)

## Versioning & Stability
- Base path: `/api/v1/` for partners.
- Deprecation policy; changelog.

## Observability & Audit
- Request logs with key id; tamper-proof audit records.

## Security
- Scopes per endpoint; IP allowlists (optional); signed webhooks.

## Documentation
- Public OpenAPI spec; examples; SDK snippets.
