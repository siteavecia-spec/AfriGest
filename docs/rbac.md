# RBAC AfriGest

Ce document décrit la politique RBAC (Rôles et Permissions) de l’application AfriGest, ses principes directeurs, la matrice des permissions par rôle, et le mapping avec les menus/pages du Front-End.

## Principes Directeurs

- Séparation stricte Business/Technique
- Principe du moindre privilège
- Traçabilité complète des actions (audit)
- Évolutivité des rôles

## Matrice des Rôles et Permissions (YAML)

Source de vérité: `apps/web/src/utils/acl.ts` et `apps/api/src/middleware/authorization.ts`.

```yaml
roles:
  super_admin:            # Plateforme (Niveau 0)
    dashboard:        [read]
    security:         [read, update]
    settings:         [read, update]
    admin.console:    [read, update]
    admin.companies:  [read, create, update]
    admin.audit_tech: [read, export]

  support:                # Support Technique (Niveau 0.5)
    dashboard:        [read]
    reports:          [read]
    audit:            [read]
    support.session:  [read, activate, revoke]

  pdg:                    # PDG/Admin (Niveau 1)
    dashboard:        [read]
    reports:          [read, export]
    pos:              [read, create]
    stock:            [read, create, update]
    suppliers:        [read]
    users:            [read, create, update, suspend]
    settings:         [read, update]
    purchase_orders:  [read, status_change, export]
    receiving:        [read]
    returns:          [read, export]
    customers:        [read, update]
    audit:            [read]
    ecommerce.products: [read]
    ecommerce.orders:   [read]

  dr:                     # Directeur Régional (Niveau 1.5)
    dashboard:        [read]
    reports:          [read, export]
    stock:            [read, update]
    pos:              [read, create]
    purchase_orders:  [read, status_change]
    receiving:        [read, create]
    returns:          [read, create]
    customers:        [read]
    audit:            [read]

  dg:                     # DG Boutique (Niveau 2)
    dashboard:        [read]
    reports:          [read]
    pos:              [read, create, update]
    stock:            [read, create, update]
    suppliers:        [read]
    users:            [read, update]
    purchase_orders:  [read, status_change]
    receiving:        [read, create]
    returns:          [read, create]
    customers:        [read]
    audit:            [read]
    ecommerce.products: [read, update]
    ecommerce.orders:   [read, status_change]

  manager_stock:         # Niveau 2.5
    stock:            [read, create, update]
    suppliers:        [read, create, update]
    purchase_orders:  [read, create, update]
    receiving:        [read, create]
    returns:          [read]

  caissier:              # Niveau 3
    pos:              [read, create]

  employee:              # Niveau 3.5
    dashboard:        [read]
    pos:              [read]

  ecom_manager:
    ecommerce.products:  [read, create, update, approve]
    ecommerce.orders:    [read, status_change]
    ecommerce.settings:  [read, update]

  ecom_ops:
    ecommerce.orders:    [read, status_change]

  marketing:
    reports:          [read, export]

  # Messaging (AfriTalk)
  # Aligné avec apps/api/src/middleware/authorization.ts
  super_admin:
    messaging:        [read, create, update]
  pdg:
    messaging:        [read, create]
  dr:
    messaging:        [read, create]
  dg:
    messaging:        [read, create]
  employee:
    messaging:        [read, create]
  ecom_manager:
    messaging:        [read, create]
  ecom_ops:
    messaging:        [read, create]
```

Notes:
- Rôle `support` est à lecture seule (sauf `support.session`) et limité dans le temps via `support_until`.
- `super_admin` n’a pas accès aux données métier (POS/Stock/etc.).

## Mapping Menus/Pages (Front)

Source: `apps/web/src/components/Layout.tsx` avec vérification `can(role, module, action)`.

- Dashboard: visible si `can(role, 'stock', 'read')` ou contexte non super_admin.
- POS: `can(role, 'pos', 'read')`
- Stock: `can(role, 'stock', 'read')` (+ Inventaire/Appro/Réceptions)
  - Inventaire (`/inventory`): `can(role, 'stock', 'read')`
  - Appro (`/purchase-orders`): `can(role, 'purchase_orders', 'read')`
  - Réceptions (`/receiving`): `can(role, 'receiving', 'read')`
  - Retours (`/returns`): `can(role, 'returns', 'read')`
- Fournisseurs: `can(role, 'suppliers', 'read')`
- Ventes: `can(role, 'pos', 'read')`
- Clients: `can(role, 'customers', 'read')`
- Ambassadeur: (bouton) visible pour `super_admin`, `pdg`, `dg`.
- Utilisateurs: (bouton) visible pour `super_admin`, `pdg`.
- E‑commerce:
  - Overview: feature flag + accès générique (bouton), les sous-pages:
    - Produits: `can(role, 'ecommerce.products', 'read')`
    - Commandes: `can(role, 'ecommerce.orders', 'read')`
    - Transactions: `can(role, 'ecommerce.orders', 'read')`
    - Clients: (bouton générique)
  - Paramètres e‑commerce: `can(role, 'ecommerce.settings', 'read')`
- Paramètres (généraux): `can(role, 'settings', 'read')`
- Console/Entreprises/Leads (plateforme): visible uniquement en contexte `super_admin` master.

## Traçabilité (Audit)

- Backend: `apps/api/src/services/audit.ts` expose `auditReq(req, entry)` qui persiste en DB (table `auditLog`) si Prisma est disponible, sinon log console.
- Les routes clés appellent `auditReq` après succès.
- Champs: `actorId`, `role`, `action`, `resourceId`, `metadata`, `ip`, `at`.

## Support Technique (accès temporaire)

- Endpoint: `POST /admin/support-token` (sécurisé via `admin.console: update`).
- Réponse: `{ accessToken, role: 'support', support_until, scopes }`.
- Front: `Layout.tsx` propose un bouton “Activer Support (4h)” en contexte Super Admin.
- Les requêtes propagent `x-support-until` (depuis `localStorage`).

## Références Code

- ACL/Permissions: `apps/web/src/utils/acl.ts`
- Garde Backend: `apps/api/src/middleware/authorization.ts`
- Menus Front: `apps/web/src/components/Layout.tsx`
- Auth Backend: `apps/api/src/middleware/auth.ts`
- Audit: `apps/api/src/services/audit.ts`

---

Dernière mise à jour: automatique lors de la refonte RBAC (Phase actuelle).
