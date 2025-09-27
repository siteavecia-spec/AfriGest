# Phase 1 – Checklist de Validation (AfriGest)

Dernière mise à jour: 2025-09-26

## Pré‑requis
- [ ] API dev lancée (http://localhost:4000) avec JWT.
- [ ] Web (Vite) lancé avec `VITE_API_URL=http://localhost:4000`.
- [ ] Ne pas définir `VITE_ENABLE_ECOMMERCE` / `VITE_ENABLE_MESSAGING` (Phase 1).
- [ ] Compte(s) de test: Employé, DG, PDG, Super Admin.

## 1) POS hors‑ligne
- [ ] Ouvrir `POS` et ajouter des articles.
- [ ] Couper le réseau puis valider la vente (offline).
- [ ] Vérifier `offlineId` et bannière ventes en attente.
- [ ] Rétablir le réseau et cliquer « Sync ».
- [ ] Vérifier `GET /sales/summary` et décrément stock.
- [ ] Rejouer même `offlineId` → pas de duplication.

## 2) Stock simplifié
- [ ] Aller `Stock` et créer un produit.
- [ ] Enregistrer une entrée de stock pour `bq-1`.
- [ ] Ajuster une quantité (+/-) avec motif, ouvrir l’audit.
- [ ] Vérifier `GET /stock/summary` et `GET /stock/audit`.
- [ ] Exporter CSV du stock et des alertes (seuils).

## 3) Fournisseurs (light)
- [ ] Aller `Fournisseurs`.
- [ ] Créer, modifier puis supprimer un fournisseur.
- [ ] Vérifier refresh de la liste.

## 4) Dashboard basique
- [ ] Aller `Dashboard`.
- [ ] Vérifier « Ventes du jour », « CA », « Top produit ».
- [ ] Simuler stock ≤ seuil → « Alertes stock faible » > 0.
- [ ] KPIs reflètent `GET /sales/summary` et `GET /stock/summary`.

## 5) RBAC
- [ ] Employé: POS OK; pas de mutations Stock/Fournisseurs.
- [ ] DG/PDG: mutations Stock/Fournisseurs OK.
- [ ] Super Admin: accès global Admin OK.
- [ ] API `requireAuth`/`requireRole` et Front `ProtectedRoute`/`ProtectedByRole` respectés.

## 6) Flags (Phase 1)
- [ ] Aucun onglet e‑commerce/messagerie visible.
- [ ] `showEcommerce=false` et `showMessaging=false` par défaut.

## Annexes
- API clés: `apps/api/src/routes/sales.ts`, `stock.ts`, `suppliers.ts`.
- Front pages: `apps/web/src/pages/Pos.tsx`, `Stock.tsx`, `Suppliers.tsx`, `Dashboard.tsx`.
- Offline: `apps/web/src/offline/salesQueue.ts`.
- Flags: `apps/web/src/config/featureFlags.ts`.
