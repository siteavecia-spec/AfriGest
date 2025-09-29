# Phase 3 — Recette et Checklist

Cette note décrit les scénarios de test finaux pour valider la Phase 3 (E‑commerce + Storefront + Dashboard Exécutif) d'AfriGest.

## Pré‑requis
- Rôles: PDG/DG/Super Admin pour back‑office.
- Données: au moins quelques produits avec `isOnlineAvailable=true`.
- Flags (facultatif): paiements sandbox via variables Vite (voir plus bas).

## Parcours Storefront
- [Catalogue] `GET /shop`
  - Filtrer par prix min/max → la liste se met à jour.
  - Recherche (debounce 250ms) → résultats cohérents.
  - Pagination: “Précédent/Suivant”, 12/24/48 par page.
  - Chargement: cartes skeleton visibles.
  - Images: chargement `lazy`.
- [Panier]
  - Ajouter plusieurs produits au panier, vérifier quantités/prix.
- [Checkout] `GET /shop/checkout`
  - COD: créer une commande (message de succès + redirection).
  - Stripe (test): visible si `VITE_ENABLE_STRIPE=true` + clé publique → init intent OK.
  - Mobile Money simulé (MTN/Orange): visible si `VITE_ENABLE_PAYMENTS=true` et `VITE_ENABLE_MOBILE_MONEY=true`.

## Back‑office E‑commerce
- [Overview] `GET /ecommerce`
  - Filtre “Secteur” → KPIs du jour se recalc. “Ticket moyen (jour)” cohérent.
- [Produits] `GET /ecommerce/products`
  - Vérifier la liste et les attributs clés.
- [Commandes] `GET /ecommerce/orders`
  - Skeleton au chargement, filtres (debounce 250ms), statut paiement/test.
  - Actions de statut (Reçue/Préparée/Expédiée/Livrée) si prévues.
- [Clients] `GET /ecommerce/customers` (si utilisé)
- [Paramètres] `GET /ecommerce/settings`
  - Mapping attributs: sauvegarde locale OK.
  - Section “Paiements (Phase 4)”: champs serveur en lecture seule, boutons de test sandbox si flags.
- [Transactions] `GET /ecommerce/payments`
  - Liste des commandes (statut/paiement), tests sandbox & refresh.

## Dashboard Exécutif (PDG/DG)
- `GET /executive`
  - Tuiles: Commandes en ligne (jour), CA en ligne (jour), Ventes POS (jour), Livrées (jour), Taux de retour (7j), Alertes stock.
  - Graphe: Revenu 7j (mock) stable.
  - Exports: KPI (7j), Synthèse (jour), Combiné 7j (e‑commerce + POS).
  - Accès menu: bouton “Exécutif” (desktop + mobile) présent.

## Gestion utilisateurs (PDG)
- `GET /users`
  - Créer DG et Employé via le dialogue “Créer”.
  - Modifier/désactiver un utilisateur.

## Métriques rapides (manuel)
- Conversion (approx. côté client) et KPIs visibles.
- Temps d’affichage: < 2s sur réseaux classiques (objectif).

## Variables d’environnement (paiements sandbox)
- `VITE_ENABLE_PAYMENTS=true`
- `VITE_ENABLE_MOBILE_MONEY=true` (MTN/Orange simulés)
- `VITE_ENABLE_PAYPAL=true` (bouton PayPal sandbox)
- `VITE_ENABLE_STRIPE=true`
- `VITE_STRIPE_PUBLISHABLE_KEY=<clé_test>`

## Notes de sécurité
- Aucune clé sensible côté client.
- Les stubs de paiement sont préparés; les clefs réelles doivent être stockées côté serveur.

## Points d’attention
- Si l’IDE signale des imports manquants, relancer le serveur/TS pour rafraîchir l’index.
- Le graphe 7j est basé sur un mock client: l’API série pourra remplacer ces données.
