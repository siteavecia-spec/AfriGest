# Phase 4 – E‑commerce (Étape 1 : Base)

Dernière mise à jour: 2025-09-26

## Objectifs
- **Catalogue**: liste produits en ligne par tenant, attributs principaux, disponibilité.
- **Commandes**: création de commande (COD au minimum), décrément stock, statuts (Reçue → Préparée → Expédiée).
- **Clients**: création/liste de clients simples (email/téléphone/prénom/nom).
- **Sync inventaire**: endpoint pour synchronisation, support d’un mode dégradé.
- **KPIs**: résumé e‑commerce dans Dashboard.

## Architecture
- **Routes API** (dossier `apps/api/src/routes/ecommerce/`)
  - `index.ts` (router: `/api/tenants/:tenantId/ecommerce/*`)
  - `products.ts` (catalogue)
  - `orders.ts` (commandes; providers: `cod` et `stripe`)
  - `customers.ts` (clients)
  - `syncInventory.ts` (synchronisation)
  - `summary.ts` (KPIs)
  - `webhooks.ts` (webhooks paiement)
- **Front Web**: pages E‑commerce déjà déclarées dans `apps/web/src/App.tsx` (protégeables via rôles), exposées si `showEcommerce`.
- **Feature flags**: `apps/web/src/config/featureFlags.ts`
  - `VITE_ENABLE_ECOMMERCE=true` pour activer le module en QA.

## Configuration
- **API (`apps/api/.env`)**
  - `PORT=4000`
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  - `ALLOWED_ORIGINS=http://localhost:5173` (liste CSV hors dev)
  - `ACCESS_TTL=15m` / `REFRESH_TTL=30d`
  - Paiements (optionnel à l’étape 1 si COD uniquement):
    - `STRIPE_SECRET_KEY=<clé sandbox>`
    - `STRIPE_WEBHOOK_SECRET=<secret webhook sandbox>`
- **Web (`apps/web/.env`)**
  - `VITE_ENABLE_ECOMMERCE=true`

## Démarrage local (QA)
1) `npm ci`
2) API: `npm -w apps/api run dev`
3) Web: `npm -w apps/web run dev`
4) Ouvrir http://localhost:5173 et naviguer vers l’onglet E‑commerce (si authentifié et rôle autorisé).

## Endpoints clés
- **Catalogue**: `GET /api/tenants/:tenantId/ecommerce/products`
- **Commande (COD)**: `POST /api/tenants/:tenantId/ecommerce/orders`
- **Clients**: `GET/POST /api/tenants/:tenantId/ecommerce/customers`
- **Sync inventaire**: `POST /api/tenants/:tenantId/ecommerce/sync-inventory`
- **KPIs**: `GET /api/tenants/:tenantId/ecommerce/summary`
- **Stripe (optionnel)**: `POST /api/tenants/:tenantId/ecommerce/orders` (provider `stripe`) + webhook `POST /api/tenants/:tenantId/ecommerce/webhooks/stripe`

## Paiements – Stripe (sandbox)
- Préparer `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` dans `.env` API.
- Créer une commande avec `payment: { provider: 'stripe' }` pour obtenir un `clientSecret` (confirm côté front si intégré).
- Le webhook capture/valide l’événement pour passer la commande à `paymentStatus=paid` (logique dépend du service `paymentService`).

## Statuts commandes
- Supportés côté API: `received`, `prepared`, `shipped`, `delivered`, `returned`.
- Mise à jour: `PATCH /api/tenants/:tenantId/ecommerce/orders/:orderId` (auth requise).

## Sync Inventaire
- Mode **partagé**: décrémentation basée sur stock commun.
- Mode **dédié**: `onlineStockQty` dédié aux ventes en ligne.
- `sync-inventory`: permet d’appliquer des deltas (fallback en mode dégradé si le flux automatique est indisponible).

## KPIs (Dashboard)
- `GET /api/tenants/:tenantId/ecommerce/summary` → exposer compte du jour, CA, conversion (placeholders si besoin jusqu’à instrumentation complète).

## QA checklist (Étape 1)
- [ ] `GET /ecommerce/products` → 200 OK, liste vide si DB non branchée.
- [ ] `POST /ecommerce/orders` (COD) → 201/200 OK, statut `received`, décrément stock.
- [ ] `PATCH /ecommerce/orders/:orderId` (auth) → 200 OK, transitions `received → prepared → shipped`.
- [ ] `GET /ecommerce/customers` / `POST /ecommerce/customers` → 200/201 OK.
- [ ] `POST /ecommerce/sync-inventory` → 200 OK, deltas appliqués.
- [ ] `GET /ecommerce/summary` → 200 OK, valeurs cohérentes (même si placeholders).
- [ ] Front: l’onglet E‑commerce rendu (flag activé), navigation OK.

## CI – Tests d’intégration
- Tests in‑process ajoutés:
  - `apps/api/tests/ecommerce.products.super.test.mjs`
  - `apps/api/tests/ecommerce.orders.super.test.mjs`
- Script: `npm -w apps/api run test:api` (inclut E‑commerce).

## Étapes suivantes (Étape 2 et +)
- Brancher paiement en ligne (Stripe sandbox, puis PayPal).
- Étendre `catalogService` (attributs/variants, SEO).
- Vitrine publique (sous-domaine) → liste produits, panier, commande.
- Observabilité (métriques e‑commerce), SLA, CDN.
