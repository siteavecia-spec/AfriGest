<div align="center">

# AfriGest — Retail & E‑Commerce ERP (MVP)

Gestion de boutiques, ventes (POS), stock, fournisseurs, utilisateurs, et module e‑commerce intégré. Conçu pour l'Afrique, pensé pour l'échelle.

</div>

---

## Pourquoi AfriGest ?

- **Tout‑en‑un**: POS, inventaire, fournisseurs, ventes en ligne, reporting.
- **Multi‑tenant**: isolation par entreprise avec un contexte « Super Admin » master.
- **Offline‑first**: file d’attente locale et synchronisation automatique.
- **E‑commerce intégré**: une « boutique en ligne » en plus de vos boutiques physiques (phase 4).

---

## Fonctionnalités clés

- **POS**: ventes, reçus PDF, multi‑paiements (espèces, mobile money, carte), mode dégradé.
- **Stock**: inventaire, seuils d’alerte, exports EOD/overview.
- **Fournisseurs**: CRUD, export CSV.
- **Utilisateurs & rôles**: RBAC (`super_admin`, `pdg`, `dg`, `employee`).
- **Super Admin (master)**: console, gestion d’entreprises, impersonation.
- **E‑commerce** (flag): produits, commandes, clients, synchro inventaire.

---

## Aperçu (captures d’écran)

> Placeholders — ajoutez vos captures dans `apps/web/public/` et mettez à jour ces liens.

- Dashboard: `![Dashboard](apps/web/public/screenshots/dashboard.png)`
- POS: `![POS](apps/web/public/screenshots/pos.png)`
- Console Super Admin: `![Console](apps/web/public/screenshots/console.png)`

---

## Démarrage rapide (mode sans DB)

Prérequis: Node.js 18+, npm 9+

```bash
npm install

# API (port 4001, USE_DB=false)
USE_DB=false PORT=4001 npm run dev:api

# Web (port 5174)
VITE_API_URL=http://localhost:4001 PORT=5174 npm run dev:web
```

Ouvrez `http://localhost:5174`.

### Comptes de test

Voir `docs/TEST_ACCOUNTS.md` (Super Admin master/tenant, PDG, DG, Employé). Exemples rapides:

- Super Admin (master): `company=master`, `admin@demo.local` / `Admin123!` → `/admin/console`
- PDG/DG/Employé (tenant demo): `company=demo`, email de rôle / `Admin123!`

### Seed de données (optionnel)

```bash
# Auth (demo)
curl -s -X POST http://localhost:4001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.local","password":"Admin123!","company":"demo"}'

# Puis POST /dev/seed/basic et /dev/seed/sales avec le token
```

---

## Architecture du repo

- `apps/web/` — React + Vite + MUI + Redux Toolkit + PWA
- `apps/api/` — Node.js (Express) + TypeScript + JWT
- `infra/prisma/` — Schémas Prisma master & tenant (Postgres)
- `docs/` — Documentation produit/technique

Points d’entrée clés:

- Auth & master: `apps/api/src/routes/auth.ts`
- Layout & navigation: `apps/web/src/components/Layout.tsx`
- POS: `apps/web/src/pages/Pos.tsx`
- Dashboard: `apps/web/src/pages/Dashboard.tsx`
- Console Super Admin: `apps/web/src/pages/Admin/SuperAdminConsole.tsx`
- Thème UI: `apps/web/src/theme.ts`

---

## E‑commerce (Phase 4)

Intégré comme « boutique additionnelle » (non parallèle). Voir `docs/ecommerce-overview.md`.
Routes backend (exemple): `/api/tenants/{tenantId}/ecommerce/{products|orders|customers|sync-inventory}`.

---

## Documentation

- Index: `docs/README.md`
- Backlog & sprints: `docs/backlog/`
- Comptes de test: `docs/TEST_ACCOUNTS.md`
- E‑commerce: `docs/ecommerce-overview.md`

---

## Roadmap (extraits)

- Étape 1: POS, Stock, Fournisseurs, Utilisateurs (MVP)
- Étape 2: Reporting avancé, permissions fines, messagerie interne
- Étape 3: Optimisations perf, PWA offline avancée
- Étape 4: E‑commerce (sync produits/stock, commandes, paiements, SLA 99.9%)

---

## Contribuer

Les MR/PR sont bienvenues. Merci de suivre les conventions TypeScript/React et ESLint. Pour les issues, utilisez des titres clairs et un scénario de reproduction.

---

## Licence

© AfriGest — Tous droits réservés (MVP). Contact: hello@afrigest.com
