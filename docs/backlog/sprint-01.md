# Sprint 01 — Plan

## Horizon
- Durée: 2 semaines
- Objectifs: Clôturer Phase 1 (socle Super Admin + Provisioning) et lancer Phase 2 (transferts/inventaire)

## Portée (Tickets)
- P1-ADMIN-COMPANIES — CRUD Entreprises (Master DB)
- P1-ADMIN-IMPERSONATE — Impersonation (Mode Support)
- P1-PROVISION-TENANT — Provisioning Tenant end‑to‑end
- P2-TRANSFERS-E2E — Ordres de transfert PDG→Boutiques (squelette + statut)
- P2-INVENTORY-VARIANCE — Inventaire & Écarts (squelette écran + modèle)

## Critères d’acceptation Sprint
- Super Admin peut créer/lister/mettre à jour/archiver une entreprise (Master DB)
- Impersonation opérationnelle avec audit minimal
- CLI provisioning exécutable avec logs et rollback basique
- Écrans Transferts/Inventaire: navigation et champs principaux, sans toute la logique métier

## Capacités & Rôles
- Backend: 2 devs (BE/DevOps), Frontend: 2 devs, QA: 1

## Risques & Mitigation
- Connexions DB Master/Tenant — préparer environnements dédiés de test
- Multi‑tenant migrations — mettre en place une CI de validation

## Démo
- Démonstration de bout en bout: création entreprise → provisioning → impersonation → accès tenant → POS accessible

## Suivi
- Reporter quotidien: avancement, blocages, revue risques
