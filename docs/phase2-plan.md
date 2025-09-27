# Phase 2 – Plan d’implémentation (AfriGest)

Dernière mise à jour: 2025-09-26

Objectif: consolider le MVP (Phase 1) vers une architecture prête pour la montée en charge et le multi‑boutiques, avec bascule DB progressive (Prisma/PostgreSQL) sans rupture côté Front.

## 1) Bascule DB progressive (services + fallback mémoire)
- État: Produits, Stock (incl. StockAudit), Ventes, Fournisseurs – services créés côté API et routes câblées.
- Flag: `USE_DB=true|false` (apps/api/.env) permet d’activer la voie Prisma per‑tenant; fallback mémoire sinon.
- Migration:
  - Schéma Prisma tenant: `infra/prisma/tenant/schema.prisma`
  - Nouveau: `StockAudit` pour journaliser les ajustements.
  - Commandes: `npx prisma generate` puis `npx prisma migrate dev --schema infra/prisma/tenant/schema.prisma -n add_stock_audit`.

## 2) Multi‑boutiques (MVP)
- Backend
  - Modèle `Boutique` déjà présent.
  - Services impactés: `stock` (summary/entries/adjust/audit), `sales` (create/list/summary) – déjà paramétrés avec `boutiqueId`.
  - Ajouter contrôles: validation d’existence de la boutique + index utiles si DB active.
- Frontend
  - Sélecteur global de boutique (TopBar/Settings) persistant (localStorage) avec clé ex: `afrigest_boutique_id`.
  - Propager `boutiqueId` aux pages suivantes:
    - `Stock.tsx`: filtre résumé, entrées, ajustements, audit.
    - `POS`: appliquer décrément sur la boutique sélectionnée.
    - `Dashboard.tsx`: KPIs filtrés par boutique (et total si “Toutes”).
  - État/UI:
    - Contexte React `BoutiqueContext` exposant `selectedBoutiqueId`, setter, liste de boutiques (au minimum `bq-1`).
    - Option “Toutes boutiques” (future Phase 2.5): agréger au niveau API (sum).

## 3) RBAC & Audit (durcissement)
- Étendre `requireRole` si granularité supplémentaire requise (ex: ajustement stock).
- Persister davantage d’audits (ex: CRUD fournisseur) via `AuditLog` existant.
- Tracer: `actorId`, `role`, `action`, `resourceId`, `metadata`.

## 4) Observabilité & Perf
- Logs structurés (reqId, tenant, userId, timing) – middleware simple sur Express.
- Pagination stricte sur les listes (`products`, `suppliers`, `sales`).
- Rate limiting basique (anti‑abus) – middleware.

## 5) Préparation e‑commerce (rollout progressif, Phase 4)
- Feature flags (déjà en place côté FE) – garder masqué en Phase 2.
- Stubs d’API (non exposés UI): `/ecommerce/products|orders|customers` (namespace tenant) pour cadrer les contrats à l’avance.

## Découpage incrémental proposé
- Sprint 1 (terminé)
  - Services + routes câblées (Produits/Stock/StockAudit/ Sales/Fournisseurs) avec `USE_DB` et fallback mémoire.
- Sprint 2 (en cours)
  - Multi‑boutiques (sélecteur global + Stock → POS → Dashboard).
  - Pagination stricte et logs structurés.
- Sprint 3
  - RBAC/Audit durcis et premiers stubs e‑commerce (back) sous feature flag.

## Validation & QA
- Vérifier `docs/phase1-checklist.md` (Phase 1) – OK.
- Ajouter `phase2-checklist.md` (à venir) pour suivre multi‑boutiques, pagination, logs, RBAC/audit.

## Accès de test (tenant demo)
- Entreprise (Code): `demo`
- Super Admin: `admin@demo.local` / `Admin123!`
- PDG: `pdg@demo.local` / `Demo123!`
- DG: `dg@demo.local` / `Demo123!`
- Employé: `employe@demo.local` / `Demo123!`
