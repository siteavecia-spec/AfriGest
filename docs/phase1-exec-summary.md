# AfriGest – Phase 1 Executive Summary

Dernière mise à jour: 2025-09-26

Ce document synthétise l’état du MVP (Phase 1) pour décision PDG/DG. Les détails complets se trouvent dans `docs/phase1-user-stories.md`.

## Objectif MVP (Phase 1)
- Offrir un POS hors‑ligne fiable, une gestion de stock simplifiée, un module Fournisseurs light, un Dashboard basique, et un RBAC minimal.
- Modules e‑commerce et messagerie désactivés par défaut (pilotés par feature flags) pour rester focus sur l’essentiel.

## Fonctionnalités clés livrées
- POS hors‑ligne → synchronisation en ligne (idempotence via `offlineId`).
- Stock simplifié → création produit, entrées, ajustements avec motif, audit.
- Fournisseurs (CRUD light) → validations, recherche, export CSV.
- Dashboard basique → Ventes du jour, CA, Top produit, Alertes stock faible, export ventes du jour (CSV) + bouton “Réessayer”.
- RBAC → Employé, DG, PDG, Super Admin (front + API).

## Accès de test (tenant `demo`)
- Entreprise (Code): `demo`
- Super Admin: `admin@demo.local` / `Admin123!`
- PDG: `pdg@demo.local` / `Demo123!`
- DG: `dg@demo.local` / `Demo123!`
- Employé: `employe@demo.local` / `Demo123!`

## Qualité & Exploitabilité
- PWA / Offline: Service Worker renforcé; POS hors‑ligne avec file d’attente locale.
- UX rapide: snackbars, loaders, exports CSV (Dashboard, Stock, Fournisseurs).
- Feature flags: e‑commerce et messagerie masqués par défaut en Phase 1.

## Indicateurs (attendus en validation)
- POS: vente offline → Sync OK, pas de doublon.
- Stock: `GET /stock/summary` et `GET /stock/audit` cohérents après entrées/ajustements.
- Fournisseurs: CRUD + filtre + export CSV.
- Dashboard: KPIs alignés sur `sales/summary` et `stock/summary` + export ventes du jour.
- RBAC: accès conformes par rôle.

## Risques & limites (Phase 1)
- Données persistées en mémoire pour certaines parties (MVP); la bascule complète Prisma/PostgreSQL est prévue en phase suivante.
- E‑commerce/Messagerie non activés par défaut (hors périmètre Phase 1).

## Prochaines étapes recommandées
- Valider la checklist `docs/phase1-checklist.md` (QA guidée) et dresser le rapport.
- Préparer Phase 2 (multi-boutiques avancé, consolidation DB, perf/monitoring).
- Option sandbox e‑commerce (test Stripe) en environnement de démo séparé.

## Références
- User stories détaillées & RACI: `docs/phase1-user-stories.md`
- Checklist QA: `docs/phase1-checklist.md`
- Cahier des charges: `docs/cahier-des-charges-afrigest.md`
