# AfriGest – Phase 1 QA Runbook (MVP multi‑boutiques)

Dernière mise à jour: 2025-09-26

## Pré‑requis
- API lancée localement (ex: http://localhost:4000) avec JWT et routes en mémoire.
- Web app (Vite) pointant sur `VITE_API_URL=http://localhost:4000`.
- Ne pas définir `VITE_ENABLE_ECOMMERCE` / `VITE_ENABLE_MESSAGING` (Phase 1 par défaut).
- Se connecter avec un compte de test (rôle selon scénario: Employé, DG, PDG, Super Admin).

## 1) POS hors‑ligne (E2E)
- Ouvrir `POS`.
- Ajouter des articles au panier (par sélection, SKU ou code‑barres simulé).
- Couper le réseau (ou stopper l’API) puis valider la vente.
- Attendu: un `offlineId` apparaît; la bannière de ventes en attente s’affiche; le reçu s’ouvre.
- Rétablir le réseau; cliquer « Sync ».
- Attendu: la file se vide; `GET /sales/summary` reflète la vente (count/total), le stock est décrémenté.
- Rejouer avec le même `offlineId` (idempotence) → aucune duplication.

## 2) Stock simplifié
- Aller `Stock`.
- Créer un produit.
- Enregistrer une entrée de stock pour `bq-1`.
- Ajuster une quantité avec un motif; ouvrir l’audit.
- Attendu: `GET /stock/summary` reflète les quantités; `GET /stock/audit` liste l’événement.
- Exporter CSV du stock et des alertes (seuil par défaut 5, seuils par produit modifiables).

## 3) Fournisseurs (light)
- Aller `Fournisseurs`.
- Créer un fournisseur, puis modifier un champ, puis supprimer.
- Attendu: les opérations POST/PUT/DELETE fonctionnent; la liste se rafraîchit.

## 4) Dashboard basique
- Aller `Dashboard`.
- Vérifier « Ventes du jour », « Chiffre d’affaires », « Top produit ».
- Simuler du stock faible (quantité ≤ seuil) → « Alertes stock faible » > 0.
- Attendu: les KPIs reflètent `GET /sales/summary` et `GET /stock/summary`.

## 5) RBAC
- Avec Employé: accès POS OK; pas d’accès aux mutations Stock/Fournisseurs.
- Avec DG/PDG: accès aux mutations Stock/Fournisseurs OK.
- Avec Super Admin: accès global admin OK.
- Attendu: cotés Front (`ProtectedRoute`, `ProtectedByRole`) et API (`requireAuth`, `requireRole`) les restrictions sont respectées.

## 6) Flags (Phase 1)
- Vérifier qu’aucun onglet e‑commerce/messagerie n’apparaît.
- Attendu: `showEcommerce=false` et `showMessaging=false` par défaut.

## Annexes
- API clés: `apps/api/src/routes/sales.ts`, `stock.ts`, `suppliers.ts`.
- Front pages: `apps/web/src/pages/Pos.tsx`, `Stock.tsx`, `Suppliers.tsx`, `Dashboard.tsx`.
- Offline: `apps/web/src/offline/salesQueue.ts`.
- Flags: `apps/web/src/config/featureFlags.ts`.
