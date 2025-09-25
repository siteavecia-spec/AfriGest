# AfriGest — Module E‑Commerce (Phase 4)

Dernière mise à jour: 2025-09-25 (Phase 1 in‑memory + Prisma fallback opérationnelle)

## 1) Vision et Principe d’Intégration
- Le module e‑commerce fonctionne comme une boutique supplémentaire dans l’écosystème AfriGest (multi‑tenant), non pas comme un système parallèle.
- Intégration naturelle: réutilise le catalogue, le stock, les ventes et la sécurité existants.

## 2) Architecture |
- Backend (Express, multi‑tenant): nouvelles routes sous `/api/tenants/:tenantId/ecommerce/*`.
- Frontend Admin (React/MUI): onglet “Boutique en ligne”.
- Frontend Public (Storefront): sous‑domaine personnalisable `boutique.{tenantSlug}.afrigest.com` (ou fallback `/store/:tenantSlug` en dev/local).

## 3) Endpoints API (Phase 1 livrée)
Montage dans `apps/api/src/app.ts` via `app.use('/api/tenants', ecommerceRouter)`.

- `GET/POST/PATCH/DELETE /api/tenants/:tenantId/ecommerce/products`
  - Fichier: `apps/api/src/routes/ecommerce/products.ts`
  - Objet: lecture catalogue (mapping produits internes). Phase 1: listing + flags stock.

- `GET/POST/PATCH /api/tenants/:tenantId/ecommerce/orders`
  - Fichier: `apps/api/src/routes/ecommerce/orders.ts`
  - Objet: création/gestion des commandes e‑commerce (type "E‑commerce").
  - Phase 1: COD et Stripe (PaymentIntent). Pour Stripe, création d’une commande en `paymentStatus=pending` puis remise à `paid` via webhook.

- `GET/POST /api/tenants/:tenantId/ecommerce/customers`
  - Fichier: `apps/api/src/routes/ecommerce/customers.ts`
  - Objet: clients e‑commerce (email/phone, adresses, historique).

- `POST /api/tenants/:tenantId/ecommerce/sync-inventory`
  - Fichier: `apps/api/src/routes/ecommerce/syncInventory.ts`
  - Objet: synchro stock idempotente (deltas, webhooks, mode partagé/dédié).

- `GET /api/tenants/:tenantId/ecommerce/summary`
  - Fichier: `apps/api/src/routes/ecommerce/summary.ts`
  - Objet: KPIs e‑commerce du jour: `onlineCount`, `onlineRevenue`, `paidCount`, `averageOrderValuePaid`, `conversionRate` (placeholder).

Router parent:
- `apps/api/src/routes/ecommerce/index.ts` (groupe les routes ci‑dessus)

## 4) Synchronisations Clés
- Produits: flux bidirectionnel catalogue ↔ boutique; attributs: `prix, descriptions, images, variantes`, statut dispo/rupture.
- Stock: mode "shared" (par défaut) ou "dedicated" par tenant; mises à jour en temps réel via webhooks; mode dégradé si perte de connexion.

## 5) Workflow de Commande (Phase 1)
```mermaid
graph TD
    A[Client passe commande en ligne] --> B{Création automatique}
    B --> C[Création dans AfriGest comme une vente]
    C --> D[Type: "E‑commerce"]
    C --> E[Décrémentation du stock]
    C --> F[Assignation à la boutique la plus proche]
    F --> G[Notification du DG pour préparation]
    G --> H[Suivi du statut: Reçue, Préparée, Expédiée]
    H --> I[Mise à jour automatique du client par email]
```

Statuts cibles: `received → prepared → shipped → delivered → returned` (actions disponibles côté Admin).

## 6) Paiements (Phase 1)
- Prioritaires: Mobile Money (MTN, Orange), Carte (Stripe/PayPal), Paiement à la livraison (option).
- Sécurité: PCI DSS (pas de stockage PAN), chiffrement, tokénisation via PSP.
- ENV: voir `docs/api.env.example` (ajouts ci‑dessous).

Implémenté Phase 1:
- COD: création de commande directe.
- Stripe (Intent): `POST /orders` provider=stripe → crée une commande pending (si Prisma dispo) et un PaymentIntent (metadata `orderId`).
- Webhook Stripe: `POST /api/tenants/:tenantId/ecommerce/webhooks/stripe` (raw body monté dans `apps/api/src/app.ts`) → marque la commande `paid` et crée `EcommercePayment`.

## 7) Tableaux de Bord Unifiés (Phase 1)
- PDG: vues consolidées (physique + en ligne), trafic, conversion, performance par canal.
- DG: commandes en ligne à préparer, stats de livraison, retours.

Implémenté:
- `Dashboard.tsx`: cartes “Ventes en ligne (jour)”, “CA en ligne (jour)”, “Cmd en ligne payées (jour)”, “Panier moyen en ligne (jour)”, “Taux de conversion” (placeholder).

## 8) Frontend Admin (Phase 1)
- Pages: `Overview.tsx`, `Products.tsx`, `Orders.tsx`, `Settings.tsx`, `Customers.tsx`.
- Navigation: ajout d’un onglet “Boutique en ligne”, liens “Produits”, “Commandes”, “Clients”, “E‑commerce: Paramètres”.
- Orders:
  - Boutons de test: COD, Stripe (affiche `clientSecret`).
  - Badge `paymentStatus` + filtres (Toutes/Payées/En attente).
  - Filtre statut logistique et actions: `Préparer`, `Expédier`, `Livrer`, `Retour`.
- Customers:
  - Liste, création, barre de recherche (email/téléphone/nom).

## 9) Storefront Public
- À scaffolder: SSR/SPA multi‑tenant par sous‑domaine, pages (Home, Catégories, Produit, Panier, Checkout, Suivi commande), CDN pour assets.

## 10) Implémentation Progressive
- Étape 1 (Base): synchro produits/stock, paiement basique (Stripe + COD), workflow simple.
- Étape 2 (Avancée): interface client personnalisable, promotions/newsletters, analytics.
- Étape 3 (Optimisation): API marketplace, app mobile e‑commerce, intégrations réseaux sociaux.

## 11) Ressources & Infra
- Dev FE (1‑2) ~2 mois, Dev BE (1‑2) ~3 mois, UX/UI ~1 mois.
- Infra: +20% coût cloud, CDN (CloudFront/équivalent), monitoring (New Relic/Datadog).

## 12) KPI de Succès
- Conversion > 2%, Temps de chargement < 2s, Disponibilité > 99.9%, Satisfaction > 4/5, +15% CA.

## 13) État d’Avancement
- Backend:
  - [x] Scaffolding routes e‑commerce (products, orders, customers, sync-inventory)
  - [x] Montage routeur: `apps/api/src/app.ts`
  - [x] Services (catalogService, stockService, orderService, paymentService) — Phase 1 (in‑memory + Prisma fallback)
  - [x] Webhook paiement Stripe (raw body), persistance des événements
- Frontend Admin:
  - [x] `Ecommerce/Overview.tsx`
  - [x] `Ecommerce/Products.tsx`
  - [x] `Ecommerce/Orders.tsx` (actions, filtres, Stripe test)
  - [x] `Ecommerce/Customers.tsx` (liste/création/recherche)
  - [x] `Ecommerce/Settings.tsx`
  - [x] Intégration dans la navigation
- ENV:
  - [x] Variables ajoutées dans `docs/api.env.example`
- Storefront:
  - [ ] Scaffolding initial

## 14) Prochaines Étapes
- Stripe.js (Phase 2): checkout UI côté Admin (Elements) pour confirmer un paiement test E2E.
- Observabilité: logs d’audit commandes (création, MAJ statut, webhook), export CSV (orders/customers).
- Storefront public: scaffold multi‑tenant, listes produits, panier COD (Phase 1), puis Stripe.

## 15) Runbook QA (Phase 1)
- **[Pré-requis]**
  - Configurer `.env` API: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
  - Webhook Stripe → `https://<domain>/api/tenants/{tenantId}/ecommerce/webhooks/stripe` (event: `payment_intent.succeeded`).
  - Prisma migré (tenant) et API démarrée.

- **[Test COD]**
  - Admin → `Ecommerce/Orders` → bouton “Créer commande test (COD)”.
  - Vérifier la liste des commandes et le Dashboard: “Ventes en ligne (jour)” et “CA en ligne (jour)”.

- **[Test Stripe (Intent)]**
  - Admin → `Ecommerce/Orders` → bouton “Créer commande test (Stripe)”.
  - Vérifier le `clientSecret` affiché (info) et la création d’une commande `paymentStatus=pending` (si Prisma dispo).
  - Confirmer le paiement côté Stripe (mode test) → vérifier via webhook que la commande passe à `paymentStatus=paid` et qu’un `EcommercePayment` est créé.

- **[KPIs Dashboard]**
  - `Dashboard` → vérifier les cartes: “Ventes en ligne (jour)”, “CA en ligne (jour)”, “Cmd payées (jour)”, “Panier moyen en ligne (jour)”.

- **[Sync Inventaire]**
  - `Ecommerce/Products` → saisir un SKU existant, un delta (+/-), appliquer.
  - Vérifier que la liste se recharge et que le stock est mis à jour (mode mémoire Phase 1: stock partagé `bq-1`).

- **[Permissions & Logs]**
  - Consulter les logs d’audit si activés (MAJ statuts, événements webhook). 
