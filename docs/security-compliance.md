# Security & Compliance (Skeleton)

## RBAC
- Roles: super_admin, pdg, dg, employee.
- Permissions matrix per module/action.
- See also: `rbac-matrix.md`.

## Authentication
- JWT access + refresh; rotation; invalidation.
- 2FA for sensitive accounts (optional phase).

## Data Protection
- TLS 1.3+ in transit; KMS-backed encryption at rest.
- Secrets management; rotated keys.

## Audit Logs
- Who-did-what-when; immutable store; export capability.

## Privacy & Local Laws
- Data minimization; export/delete on request; retention policies.

## AppSec
- Input validation; XSS/CSRF/CSP; dependency scanning; SAST/DAST.

## Incident Response
- Runbooks; contacts; comms templates.

## Compliance Targets
- SLA 99.9%, PII handling, PCI constraints for payments (tokenization, no PAN).
