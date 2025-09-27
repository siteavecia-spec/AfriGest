# Phase 2 – Guide d’exploitation (Opérations)

Dernière mise à jour: 2025-09-26

## Démarrage local
- **API**
  - Commande: `npm run dev:api`
  - Santé: `GET http://localhost:4000/health` → `{ "status": "ok" }`
- **Web**
  - Commande: `npm run dev:web`
  - URL: `http://localhost:5173/`

## Multi‑boutiques
- Sélecteur global de boutique dans la barre d’application (`components/Layout.tsx`).
- Option “Toutes boutiques”:
  - Stock agrégé côté API (`services/stock.ts#getStockSummary('all')`).
  - Vue enrichie dans `pages/Stock.tsx` (filtres nom/SKU + exports CSV agrégé/ventilé).
  - Actions mutation (entrée/ajustement) désactivées en mode "all" (message explicite).

## Exports
- **Dashboard**: bouton “Exporter ventes du jour (CSV)” (pagine côté UI avant export).
- **POS**: “Exporter reçus du jour (CSV/PDF)” (pagine côté UI).
- **Sales**: export CSV de la liste filtrée (Boutique/Dates/Paiement/Recherche).

## Pagination et totaux
- API renvoie `X-Total-Count` pour `GET /products`, `GET /suppliers`, `GET /sales`.
- UI affiche “Page X/Y”:
  - `pages/Suppliers.tsx` (list)
  - `pages/Sales.tsx` (list)
  - `pages/Stock.tsx` (sélecteur produits)

## Diagnostics & logs
- **Erreurs UI**: affichent `(ReqID: …)` quand l’API renvoie un identifiant de requête.
  - Bouton “Copier ID” sur: `Suppliers.tsx`, `Stock.tsx`, `Dashboard.tsx`, `Pos.tsx`.
- **Logs API**: `apps/api/src/middleware/logger.ts` (JSON structuré, ligne unique)
  - Champs: `reqId`, `method`, `path`, `routeName`, `status`, `ms`, `tenant`, `user`, `ip`, `ua`, `reqSize`, `respSize`.
- **Rate limiting**: `apps/api/src/middleware/rateLimit.ts` activé globalement (120 req/min/route par IP).
  - En cas de dépassement: HTTP 429 + header `Retry-After`.

## Audit (traçabilité)
- **Fournisseurs**: `supplier.create|update|delete` → `AuditLog` (si `USE_DB=true`).
- **Stock**: `stock.entry` + `stock.adjust` (global) + par produit (`stockAudit`).
- **Ventes**: `sale.create` (global) avec métadonnées (items, total, paiement, currency, offlineId).

## Conseils d’exploitation
- **Triage rapide**: en cas d’erreur, récupérer le ReqID (bouton “Copier ID”) et consulter les logs API (filtrer par `reqId`).
- **Exports volumineux**: privilégier la page “Ventes” et/ou “Dashboard”/“POS” (les exports paginent avant agrégation CSV).
- **Multi‑boutiques**: utiliser "Toutes boutiques" pour la vue globale Stock (avec export agrégé/ventilé), puis sélectionner une boutique précise pour les mutations.

## CI (build + lint)
- Workflow: `.github/workflows/ci.yml` (Checkout, Node 18, `npm ci`, build API/Web, lint optionnel).

## Bascule PostgreSQL (plus tard)
- Docker Postgres (exemple):
  ```bash
  docker run --name pg-afrigest -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=afrigest_tenant_demo -p 5432:5432 -d postgres:16
  ```
- Prisma:
  ```bash
  npx prisma generate --schema infra/prisma/tenant/schema.prisma
  npx prisma migrate dev --schema infra/prisma/tenant/schema.prisma -n add_stock_audit
  ```
- API: `apps/api/.env` → `USE_DB=true`, puis `npm run dev:api`.

