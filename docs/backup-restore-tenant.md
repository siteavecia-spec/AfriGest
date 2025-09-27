# Backup & Restore (Tenant) — Skeleton

## Strategy (3-2-1)
- 3 copies: primary + local backup + offsite backup
- 2 different media/providers
- 1 offsite immutable copy

## Schedule
- Daily automated backups per tenant DB
- Monthly full snapshot retention

## Storage & Encryption
- Encrypted at rest; access-controlled buckets
- Key rotation policy

## Restore Procedure
1) Identify target backup and tenant code
2) Provision a staging DB from backup
3) Validate integrity and app login
4) Swap or promote restored DB

## Testing
- Drill: quarterly restore test with runbook

## Observability
- Backup success metrics; alert on failures

## Runbook Snippets
- To be filled with actual provider commands
