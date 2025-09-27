# P2 - Ordres de transfert PDG → Boutiques (bout-à-bout)

- Phase: 2 (Consolidation)
- Type: Feature
- Status: Planned
- Owner: Backend + Frontend
- Estimate: 8–13 pts

## User Story
En tant que PDG, je crée des ordres de transfert vers des boutiques. En tant que DG, je reçois/valide un transfert et mon stock local est mis à jour automatiquement.

## Description
- PDG: création d’un ordre multi‑articles avec référence BL, fournisseur (optionnel), commentaires.
- DG: réception/validation partielle ou complète; gestion des écarts.
- Statuts: `draft` → `sent` → `received` (→ `partially_received` optionnel) → `closed`.
- Notifications DG (et PDG) sur changement de statut.
- Audit trail complet.

## Acceptance Criteria
- Création, envoi, réception impactent les stocks source/destination correctement.
- Historique détaillé consultable par ligne.
- Exports CSV (ordre et réception) téléchargeables.
- Permissions respectées (RBAC).

## Dependencies
- `docs/phase2-plan.md`, `docs/phase2-operations.md`
- `docs/rbac-matrix.md`

## Notes
- Prévoir pièces jointes (photo BL) en option (S3 privé). 
