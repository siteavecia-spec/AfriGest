# Phase 1 – User Stories (AfriGest)

Dernière mise à jour: 2025-09-26

Cette documentation décrit les user stories Phase 1 basées uniquement sur les fonctionnalités déjà implémentées dans le code (MVP). Les références de fichiers indiquent où le comportement est réalisé.

## Rôles couverts
- Employé (Employee)
- Directeur Général (DG)
- Président Directeur Général (PDG)
- Super Admin

---

## Employé (Employee)

- [US-EMP-001] Connexion et accès POS
  - En tant qu’Employé, je me connecte pour accéder au point de vente.
  - Critères d’acceptation:
    - Accès à la page `POS`.
    - Pas d’accès aux mutations Stock/Fournisseurs.
    - RBAC appliqué côté Front (`ProtectedRoute`, `ProtectedByRole`) et côté API (`requireAuth`, `requireRole`).
  - Références: `apps/web/src/pages/Pos.tsx`, `apps/api/src/routes/sales.ts`, `apps/api/src/middleware/rbac.ts`.

- [US-EMP-002] Vente hors‑ligne puis synchronisation
  - En tant qu’Employé, je peux encaisser une vente hors‑ligne quand l’API est indisponible, puis la synchroniser au rétablissement du réseau.
  - Critères d’acceptation:
    - La vente “offline” reçoit un `offlineId` et est placée en file d’attente locale.
    - Une bannière “ventes en attente” apparaît; le bouton “Sync” traite la file dès que l’API répond.
    - Idempotence: rejouer le même `offlineId` ne duplique pas la vente.
  - Références: `apps/web/src/offline/salesQueue.ts`, `apps/api/src/routes/sales.ts`, `docs/phase1-checklist.md`.

- [US-EMP-003] Consultation basique du stock (lecture)
  - En tant qu’Employé, je consulte les quantités disponibles pour éviter la rupture au comptoir.
  - Critères d’acceptation:
    - Accès lecture au résumé du stock.
    - Aucune action d’ajustement ou mutation.
  - Références: `apps/web/src/pages/Stock.tsx`, `apps/api/src/routes/stock.ts`.

---

## Directeur Général (DG)

- [US-DG-001] Gestion du stock: création produit et entrée
  - En tant que DG, je crée des produits et j’enregistre des entrées de stock.
  - Critères d’acceptation:
    - Création produit (SKU, Nom, Prix, Secteur, Attributs selon secteur si disponibles).
    - Enregistrement d’une entrée de stock pour `bq-1` avec quantité et coût unitaire.
    - Le résumé du stock se met à jour après soumission.
  - Références: `apps/web/src/pages/Stock.tsx`, `listProducts()`/`createProduct()`/`createStockEntry()` dans `apps/web/src/api/client_clean.ts`.

- [US-DG-002] Ajustements avec motif et audit
  - En tant que DG, j’ajuste une quantité avec motif (correction, casse, inventaire) et je consulte l’historique d’audit.
  - Critères d’acceptation:
    - Champ Δ (delta) + motif obligatoire.
    - “Ajuster” applique la modification; “Voir audit” liste l’historique.
  - Références: `adjustStock()`/`getStockAudit()` dans `apps/web/src/api/client_clean.ts`, `apps/api/src/routes/stock.ts`.

- [US-DG-003] Gestion light des fournisseurs
  - En tant que DG, je crée, modifie, supprime un fournisseur, recherche et exporte la liste filtrée en CSV.
  - Critères d’acceptation:
    - Validation côté client (Nom requis; Email valide si renseigné).
    - Snackbars succès/erreur; indicateur de chargement.
    - Recherche multi‑champs (nom/contact/email/téléphone) et export CSV respectant le filtre.
  - Références: `apps/web/src/pages/Suppliers.tsx`, `apps/api/src/routes/suppliers.ts`.

---

## Président Directeur Général (PDG)

- [US-PDG-001] Suivi des KPIs quotidiens (Dashboard)
  - En tant que PDG, je consulte “Ventes du jour”, “Chiffre d’affaires (GNF)”, “Top produit (Qté)”, “Alertes stock faible”.
  - Critères d’acceptation:
    - Bouton “Réessayer” en cas d’erreur réseau.
    - KPIs e‑commerce masqués si le module est désactivé (Phase 1).
  - Références: `apps/web/src/pages/Dashboard.tsx`, `getSalesSummary()`/`getStockSummary()` dans `apps/web/src/api/client_clean.ts`, flags dans `apps/web/src/config/featureFlags.ts`.

- [US-PDG-002] Export ventes du jour (CSV)
  - En tant que PDG, j’exporte les ventes du jour en CSV pour partage rapide.
  - Critères d’acceptation:
    - Le fichier CSV se télécharge et contient les ventes entre 00:00 et 23:59 du jour courant.
  - Références: `apps/web/src/pages/Dashboard.tsx` (logique d’export), `listSales()`.

- [US-PDG-003] Outils de démo/QA (Dev Tools)
  - En tant que PDG (ou Super Admin), j’utilise “Dev Tools” pour seeder produits/stock/fournisseur et ventes du jour.
  - Critères d’acceptation:
    - Actions “Seed: …” renvoient OK et “Statut” affiche des compteurs > 0.
  - Références: `apps/web/src/pages/DevTools.tsx`, `apps/api/src/routes/dev.ts`.

---

## Super Admin

- [US-SA-001] Administration des utilisateurs
  - En tant que Super Admin, je crée des utilisateurs (Employee/DG/PDG) et gère leurs rôles et statut.
  - Critères d’acceptation:
    - Création: email, mot de passe, nom complet, rôle.
    - Mise à jour de rôle/statut; désactivation possible.
  - Références: `apps/api/src/routes/users.ts`, `listUsers()`/`createUser()`/`updateUser()`/`deactivateUser()` dans `apps/web/src/api/client_clean.ts`.

- [US-SA-002] Sécurité — Forcer la réinitialisation du mot de passe
  - En tant que Super Admin, je force la réinitialisation du mot de passe d’un utilisateur avec un motif (traçabilité).
  - Critères d’acceptation:
    - UI “Réinitialisation de mot de passe (Admin)” envoie `forcePasswordReset(email, reason)` et affiche un feedback (success/error).
  - Références: `apps/web/src/pages/AdminPasswordReset.tsx`, `forcePasswordReset()` dans `apps/web/src/api/client_clean.ts`, `apps/api/src/routes/superAdmin.ts`.

- [US-SA-003] Bootstrap tenant de démonstration
  - En tant que Super Admin, je dispose d’un compte seedé pour le tenant “demo”.
  - Critères d’acceptation:
    - Super Admin: `admin@demo.local` / `Admin123!` (email vérifié).
    - Possibilité de créer PDG/DG/Employé sur le tenant demo.
  - Références: `apps/api/scripts/seed-demo.ts`, `apps/api/src/routes/auth.ts` (bootstrap first user).

---

## Matrice RACI (simplifiée, Phase 1)

- POS (vente, offline → sync)
  - R: Employé
  - A: DG
  - C: PDG
  - I: Super Admin

- Stock (création produit, entrée, ajustement, audit)
  - R: DG
  - A: PDG
  - C: Employé (lecture)
  - I: Super Admin

- Fournisseurs (CRUD light, filtre, export CSV)
  - R: DG
  - A: PDG
  - C: Employé (lecture)
  - I: Super Admin

- Dashboard KPIs + export ventes du jour
  - R: PDG
  - A: PDG
  - C: DG
  - I: Super Admin

- Administration utilisateurs / sécurité (reset forcé)
  - R: Super Admin
  - A: Super Admin
  - C: PDG, DG
  - I: Employé

---

## Notes complémentaires

- Feature Flags (Phase 1):
  - E‑commerce et messagerie désactivés par défaut. Réfs: `apps/web/src/config/featureFlags.ts`, `docs/web.env.example`.
- Offline & PWA:
  - `apps/web/public/sw.js` renforcé pour retours valides même hors‑ligne.
  - POS en file d’attente locale via `apps/web/src/offline/salesQueue.ts`.
- Exports CSV:
  - `Dashboard.tsx` (ventes du jour), `Suppliers.tsx` (liste filtrée), `Stock.tsx` (stock + alertes).

---

## Accès de test (tenant demo)

- Entreprise (Code): `demo`
- Super Admin: `admin@demo.local` / `Admin123!`
- PDG: `pdg@demo.local` / `Demo123!`
- DG: `dg@demo.local` / `Demo123!`
- Employé: `employe@demo.local` / `Demo123!`
