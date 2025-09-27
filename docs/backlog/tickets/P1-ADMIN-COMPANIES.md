# P1 - Super Admin: CRUD Entreprises (Master DB)

- Phase: 1 (MVP)
- Type: Feature
- Status: Planned
- Owner: Backend + Frontend
- Estimate: 8–10 pts

## User Story
En tant que Super Admin, je veux créer, lister, mettre à jour et archiver des entreprises clientes depuis la base maître afin de gérer le parc clients.

## Description
- Modèle Master DB: `Company { id, code, name, contactEmail, status, createdAt, updatedAt }`.
- Endpoints Admin:
  - `POST /admin/companies`
  - `GET /admin/companies`
  - `PATCH /admin/companies/:id`
  - `DELETE /admin/companies/:id` (archive)
- UI: page `Admin/Companies` (déjà squelettée) branchée sur l’API réelle (remplacer mock localStorage).

## Acceptance Criteria
- Création entreprise: code unique, validation champs, statut initial `active` ou `pending`.
- Lecture liste + pagination.
- Mise à jour (name, contactEmail, status).
- Archiver => non visible par défaut (filtre `status`), non supprimé physiquement.
- Erreurs structurées + audit log minimal.

## Dependencies
- `docs/master-admin-and-provisioning.md`
- `docs/openapi.yaml` (sections /admin/companies)

## Notes
- Préparer la clé étrangère potentielle vers abonnements (futur).
