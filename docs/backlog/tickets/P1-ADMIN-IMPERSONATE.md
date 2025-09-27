# P1 - Super Admin: Impersonation (Mode Support)

- Phase: 1 (MVP)
- Type: Feature
- Status: Planned
- Owner: Backend + Frontend
- Estimate: 5 pts

## User Story
En tant que Super Admin, je veux me connecter temporairement dans le contexte d’un tenant (entreprise) afin d’aider au support sans demander de mots de passe.

## Description
- Endpoint: `POST /admin/impersonate { companyCode }` → retourne un access token JWT scoping le tenant.
- Sécurité:
  - Expiration courte (ex: 15 min), non rafraîchissable.
  - Audit log: acteur, tenant ciblé, horodatage, IP.
  - Visuel UI indiquant le mode support et un bouton "Quitter".
- Front:
  - Bouton sur `Admin/Companies` pour impersonate; stockage token en mémoire (pas de refresh), bannière d’alerte dans `Layout`.

## Acceptance Criteria
- Un SA peut impersonate un tenant par code; l’API côté tenant répond avec les données du tenant.
- Un bandeau "Mode support" est visible tant que l’impersonation est active.
- Un bouton permet de quitter le mode support (revient au token SA).
- Les actions en mode support sont tracées dans les audit logs.

## Dependencies
- `docs/master-admin-and-provisioning.md`
- `docs/security-compliance.md`
- `docs/openapi.yaml` (/admin/impersonate)

## Notes
- Option: lier un `X-Act-As` côté backend si besoin d’un header complémentaire.
