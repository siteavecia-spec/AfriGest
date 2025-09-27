# Activation Postgres/Prisma (Staging/Prod)

Ce guide décrit les étapes pour activer la base de données Postgres avec Prisma et basculer l’API en mode DB.

## 1) Variables d’environnement (API)
Créez/ajustez `apps/api/.env` :

- PORT=4000
- JWT_ACCESS_SECRET=...
- JWT_REFRESH_SECRET=...
- ACCESS_TTL=15m
- REFRESH_TTL=30d
- ALLOWED_ORIGINS=https://app.<domaine>
- MASTER_DATABASE_URL=postgresql://user:pass@host:5432/afrigest_master
- TENANT_DATABASE_URL=postgresql://user:pass@host:5432/afrigest_tenant_demo
- USE_DB=true

Stripe (optionnel) :
- STRIPE_SECRET_KEY=sk_live_... (ou sk_test_... en staging)
- STRIPE_WEBHOOK_SECRET=whsec_...

## 2) Génération Prisma
À la racine du repo :

```bash
npm -w apps/api run prisma:generate
```

> Remarque: ce script utilise la configuration Prisma par défaut du projet. Si vous avez des schémas multiples (master/tenant), adaptez vos schémas et commandes au besoin.

## 3) Migrations
Appliquez vos migrations sur les bases `master` et `tenant`. Selon votre organisation, exécutez :

```bash
# Exemple (à adapter selon vos schémas/prisma.schema)
npx prisma migrate deploy
```

Si vous avez deux schémas séparés, exécutez la commande pour chacun, ou créez des scripts dédiés (ex: `migrate:master`, `migrate:tenant`).

## 4) Seed (démo)
Optionnel : pépler une base tenant avec des données de démo.

```bash
npm -w apps/api run seed:tenant
```

## 5) Bascule API
Démarrez l’API avec `USE_DB=true`. Les services basculent en mode DB si un client Prisma est résolu via `getTenantClientFromReq()`.

```bash
npm -w apps/api run build
npm -w apps/api run start:ci
```

## 6) Vérifications
- Santé API: `GET /health` doit répondre `{"status":"ok"}`
- Flux e‑commerce (staging) :
  - Création commande COD OK
  - Paiement Stripe test OK (si configuré)
- Logs: vérifier les latences et erreurs

## 7) Production readiness
Voir `docs/go-live-checklist.md` pour :
- DNS/TLS/NGINX, CORS, sécurité
- Backups 3-2-1 et runbooks
- Observabilité (bench CI, monitoring, alerting)
- S3 médias (produits/logos)
