# Comptes de test (mode sans DB)

Ce document décrit les comptes de test disponibles, leurs rôles et les fonctionnalités accessibles. Il est destiné aux recettes fonctionnelles et aux démonstrations.

## Accès Super Admin (Master)
- **Entreprise**: `master`
- **Email**: `admin@demo.local`
- **Mot de passe**: `Admin123!`
- **Contexte**: Console master (pas de boutique)
- **Pages clés**: `/admin/console`, `/admin/companies`, `/leads`, `/admin/password-reset`

Notes:
- Pas de sélecteur de boutique, ni de menus tenant (masqués côté UI master).
- Impersonation possible depuis `/admin/companies` (un bandeau « Mode support actif » apparaît, bouton « Quitter » pour revenir à la console).

## Accès Super Admin (Tenant demo)
- **Entreprise**: `demo`
- **Email**: `admin@demo.local`
- **Mot de passe**: `Admin123!`
- **Contexte**: Tenant (boutiques, modules opérationnels)

## Accès PDG (Tenant demo)
- **Entreprise**: `demo`
- **Email**: `pdg@demo.local`
- **Mot de passe**: `Admin123!`

## Accès DG (Tenant demo)
- **Entreprise**: `demo`
- **Email**: `dg@demo.local`
- **Mot de passe**: `Admin123!`

## Accès Employé (Tenant demo)
- **Entreprise**: `demo`
- **Email**: `employee@demo.local`
- **Mot de passe**: `Admin123!`

---

# Fonctionnalités par rôle (résumé)
Basé sur l'ACL du front (`apps/web/src/utils/acl.ts`) et les middlewares/permissions de l'API.

## Super Admin (master, company=master)
- **Console master**: `/admin/console`, `/admin/companies`, `/leads`, `/admin/password-reset`.
- **UI**: pas de sélecteur de boutique, pas de menus tenant (masqués dans `components/Layout.tsx`).
- **Support**: peut « Impersonate » une entreprise dans `/admin/companies` (bandeau et sortie via bouton « Quitter »).

## Super Admin (tenant, company=demo)
- **Accès élargi**: Dashboard, POS, Stock (lecture + CRUD), Fournisseurs (CRUD), Paramètres, E‑commerce (si flag activé).
- **Utilisateurs**: lecture/CRUD si DB activée; en mode sans DB certaines routes peuvent être restreintes.
- **Outils**: Dev Tools (seed) accessibles.

## PDG
- **Lecture**: Dashboard, Stock, Fournisseurs, E‑commerce (overview).
- **Rapports**: lecture/export.
- **Paramètres**: lecture.
- **POS**: lecture (pas de création).
- **Utilisateurs**: lecture.

## DG
- **POS**: lecture + création.
- **Stock**: lecture + mise à jour (ajustements/entrées).
- **Fournisseurs**: lecture + création/mise à jour.
- **E‑commerce**: Products (lecture/mise à jour), Orders (lecture/changement de statut).
- **Rapports**: lecture.

## Employé
- **POS**: lecture + création.
- **Autres modules**: limités selon ACL (souvent non visibles).

---

# URLs utiles
- **Front**: http://localhost:5174
- **API**: http://localhost:4001

---

# Notes d'usage
- Pour tester les KPIs Dashboard et POS, sélectionnez **Boutique Principale** dans la barre supérieure.
- Le **mode sans DB** utilise des stores mémoire; certaines pages (ex: users CRUD) peuvent être limitées tant que la base n'est pas activée.
- Pour passer du **master** au **tenant**, utilisez **Impersonate** dans `/admin/companies` ou reconnectez‑vous avec `company=demo`.
