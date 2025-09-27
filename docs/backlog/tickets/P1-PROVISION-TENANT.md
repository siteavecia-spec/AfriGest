# P1 - Provisioning Tenant End-to-End

- Phase: 1 (MVP)
- Type: Feature
- Status: Planned
- Owner: Backend + DevOps
- Estimate: 8 pts

## User Story
En tant que Super Admin, je veux provisionner automatiquement une base de données tenant pour une entreprise nouvellement créée, afin qu’elle soit opérationnelle sans intervention manuelle.

## Description
- Étapes automatisées:
  1. Réserver l’entreprise dans Master DB (status=pending)
  2. Créer la DB tenant (ex: `afrigest_<code>`)
  3. Exécuter les migrations Prisma
  4. Seeder les données minimales (paramètres, boutique par défaut, admin)
  5. Marquer `active` dans Master et envoyer email d’onboarding
- Script CLI de base: `apps/api/scripts/provision-tenant.mjs` (déjà créé, à compléter par commandes réelles)

## Acceptance Criteria
- Commande CLI exécutable avec `--code`, `--name`, `--email`
- Exécution idempotente (reprise possible) et logs détaillés
- En cas d’échec, rollback déclaré dans les logs; état Master cohérent

## Dependencies
- `docs/master-admin-and-provisioning.md`
- `docs/tenant-provisioning-runbook.md`

## Notes
- Préparer variables d’environnement (connexions Master/Tenant); hooks CI pour valider migrations.
