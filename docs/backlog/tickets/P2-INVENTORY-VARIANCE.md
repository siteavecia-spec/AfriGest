# P2 - Inventaire & Écarts (local)

- Phase: 2 (Consolidation)
- Type: Feature
- Status: Planned
- Owner: Backend + Frontend
- Estimate: 8–13 pts

## User Story
En tant que DG, je réalise un inventaire de ma boutique, je saisis les comptages réels, je visualise les écarts et génère un rapport d’écarts.

## Description
- Création d’une session d’inventaire (sélection produits, périmètre par rayon/secteur si besoin).
- Saisie des quantités comptées; calcul automatique des écarts (quantité, valeur).
- Rapport d’écarts (CSV/PDF) avec justification et signature DG.
- Historique des inventaires.

## Acceptance Criteria
- Démarrer, enregistrer en brouillon, finaliser l’inventaire.
- Calculs corrects par produit; sommaire global (valeur écart).
- Export CSV/PDF; audit trail.
- Permissions conformes (RBAC).

## Dependencies
- `docs/phase2-plan.md`, `docs/phase2-operations.md`
- `docs/rbac-matrix.md`

## Notes
- Option: scan des codes‑barres pour accélérer la saisie.
