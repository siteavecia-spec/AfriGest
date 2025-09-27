# Phase 2 – Checklist QA (AfriGest)

Dernière mise à jour: 2025-09-26

## Multi‑boutiques (MVP)
- [x] Contexte global de boutique (`BoutiqueContext`) et persistance `localStorage`
- [x] Sélecteur global de boutique dans la barre d’application (`components/Layout.tsx`)
- [x] Stock: usage du contexte (résumé, entrées, ajustements, audit)
- [x] POS: usage du contexte (création vente, reçus, held carts)
- [x] Dashboard: alertes stock faible basées sur la boutique sélectionnée
- [ ] Option “Toutes boutiques” (agrégation) – à implémenter (API + UI)
- [ ] Règles supplémentaires: validation d’existence de la boutique côté API (si DB active)

## DB / Prisma
- [x] Services Produits | Stock (incl. StockAudit) | Ventes | Fournisseurs – bascule `USE_DB` + fallback mémoire
- [x] Modèle Prisma `StockAudit` ajouté et câblé (lecture/écriture) avec fallback mémoire
- [ ] Postgres local prêt et migration exécutée (`prisma migrate`) – en attente

## Observabilité & Perf
- [ ] Middleware logs structurés (reqId, tenant, userId, timing)
- [ ] Pagination stricte (`products`, `suppliers`, `sales`) côté API et UI
- [ ] Rate limiting basique

## RBAC & Audit (durcissement)
- [ ] Audit CRUD fournisseurs → `AuditLog`
- [ ] Audit entrées de stock → `StockEntry`/`StockEntryItem` (DB) et journaux UI

## E‑commerce (préparation – masqué)
- [ ] Stubs d’API (non exposés UI) sous namespace `/ecommerce/*` (tenant)
- [ ] Feature flag côté FE confirmé masqué en Phase 2

## Notes de test
- Mode actuel: mémoire (`USE_DB=false`) pour avancer rapidement.
- Dès que Postgres est prêt:
  - `npx prisma generate --schema infra/prisma/tenant/schema.prisma`
  - `npx prisma migrate dev --schema infra/prisma/tenant/schema.prisma -n add_stock_audit`
  - `apps/api/.env`: `USE_DB=true`
  - Redémarrer l’API.
