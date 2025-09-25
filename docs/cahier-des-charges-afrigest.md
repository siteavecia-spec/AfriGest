# Cahier des Charges – AfriGest

Dernière mise à jour: 2025-09-25

## 1) Contexte et Objectif Stratégique

- Contexte: réseaux de boutiques multi‑sites avec besoins de visibilité temps réel (ventes, trésorerie), gestion stocks multi‑entités, harmonisation des processus, auditabilité.
- Solution: Plateforme SaaS multi‑entités (multi‑tenants) pour l’Afrique, déploiement initial en Guinée Conakry.
- Rôles clés:
  - Super Admin (plateforme): onboarding et gestion des entreprises clientes.
  - PDG/Admin (entreprise): pilotage de toutes les boutiques via un tableau de bord consolidé.
  - DG (direction de boutique): opérations quotidiennes (ventes, stock local, rapports).
  - Employé: caisse et tâches opérationnelles restreintes.
- Objectif principal: solution scalable, sécurisée, white‑label, réutilisable, sans fork du code base; time‑to‑market réduit pour chaque client.

## 2) Identité & Charte Graphique

- Nom: AfriGest; Slogan: La gestion moderne, simple et accessible
- Valeurs: Professionnalisme, Sécurité, Efficacité, Évolutivité, Adaptabilité
- Public: TPE/PME/ETI africaines multiboutiques (retail, textile, électroménager, cosmétique, agroalimentaire…)
- Charte (à appliquer dans l’UI):
  - Couleurs primaires: Bleu #1D4ED8, Vert #059669
  - Neutres: Gris foncé #111827 (texte), Gris clair #E5E7EB (UI), Blanc #FFFFFF
  - Typo: Inter, hiérarchie claire (H1→Body)
  - Style: minimaliste, pro, épuré, inspiré Material, grille 8px, arrondis 4/8px, ombres légères, lightweight
  - Logo: connectivité, croissance, Afrique (variantes v/h/icône)

## 3) Architecture Technique & Contraintes

- Stack: Front (React 18 + Vite, Redux Toolkit, MUI), Back (Node/Express), DB (PostgreSQL + Prisma)
- Multi‑tenant: 1 base par entreprise (tenant), DB maître pour métadonnées, auth centralisée → redirection client
- Auth: JWT + refresh, bcrypt; Storage: S3 ou équivalent
- Infra: AWS/DigitalOcean (Nginx + CDN), SMS/Notifications: Orange/MTN
- Sécurité: RGPD/lois locales, anonymisation, export/suppression, chiffrement (TDE, TLS1.3+), audit logs, sauvegarde 3‑2‑1, validation (injections/XSS)
- Performance & UX: PWA hors‑ligne (Service Worker, IndexedDB), <3s sur 3G, responsive, WCAG 2.1 AA

## 4) RBAC – Structure Utilisateurs & Permissions

- Super Admin (0): pilotage plateforme, entreprises, abonnements
- PDG/Admin (1): boutiques, DG/employés, catalogue, stock global et transferts, dashboard consolidé
- DG (2): ventes, transferts reçus, inventaires, rapports fin de journée
- Employé (3): caisse, ventes, consultation stock

## 5) Fonctionnalités & User Stories (extraits)

- Tableaux de bord contextuels: Super Admin, PDG (consolidé: CA, bénéfice, top produits, KPIs), DG (boutique), Employé (caisse)
- Stock hiérarchique: global PDG (arrivages, transferts), local DG (réception, inventaires, écarts)
- Vente & Caisse: scan code‑barres, paiements (cash/Mobile Money/carte), reçus/logo, offline (queue + resync)
- Comptabilité & Reporting: revenus/dépenses par boutique, marges, exports PDF/Excel
- Utilisateurs & RBAC: gestion comptes/permissions, rôles personnalisables, 2FA optionnelle
- Vitrine & pré‑connexion: landing publique, tarifs, témoignages, contact/onboarding

## 6) Déploiement par Phases

- Phase 1 – MVP Guinée (3 mois)
  - Utilisateurs (Super Admin, PDG, Employé), Vente & Caisse (offline), Stock simplifié, Dashboard basique, Fournisseurs light
- Phase 2 – Consolidation multi‑boutiques (2 mois)
  - Stock hiérarchique + transferts, Dashboard consolidé PDG, Comptabilité de base et export
- Phase 3 – Scalabilité panafricaine (3 mois)
  - Internationalisation (devises), facturation électronique, API partenaires
- Phase 4 – Écosystème & IA (4‑6 mois)
  - E‑commerce, mobile natif, IA prévision des ventes

## 7) Onboarding (processus)

1. Lead via vitrine → 2. Contact/validation → 3. Provisionnement tenant par Super Admin → 4. Configuration initiale PDG (logo, devise, boutiques, utilisateurs) → 5. Formation/support

## 8) Business Model

- Abonnements SaaS: Starter, Pro, Enterprise; Services pro, formation

## 9) Livrables

- Docs techniques/utilisateur, Web app (PWA), API sécurisée multi‑tenants, DB (maître + template), procédures déploiement/sauvegarde

---

## 10) Modules Livrés & Spécifications (liens internes)

- E‑Commerce (Phase 1) – Spec: `docs/ecommerce-spec.md`
  - Endpoints: `orders`, `customers`, `sync-inventory`, `summary`
  - Paiements: Stripe (PaymentIntent + Webhook) + COD
  - Sync stock (deltas, mode partagé mémoire Phase 1)
  - Dashboard: KPIs “Ventes en ligne”, “CA en ligne”, “Cmd payées (jour)”, “Panier moyen (jour)”
  - Runbook QA: tests COD/Stripe/KPIs/Sync inventaire

- AfriTalk (Phase 4.2) – Spec: `docs/afritalk-spec.md`
  - WebSocket (Socket.io) + Redis adapter, REST messaging (conversations, messages, read, notifications)
  - Présence: snapshot `/presence` + events `presence:update`
  - Messagerie 1‑1: Conversations/Chat (read receipts ✓✓), badge non‑lus, brouillon “💬 Discuss” depuis Commandes
  - Dashboard: widget “Présence (AfriTalk)” + page dédiée “Présence”
  - RBAC: Employé → PDG interdit (audit `forbidden_attempt`)
  - Runbook QA: connexions WS, envoi/réception, read, présence, permissions

> Changelog: `docs/CHANGELOG.md` (Phase 1 E‑commerce)

---

## 11) État d’Avancement

- E‑commerce (Phase 1): livrée (in‑memory + Prisma fallback) – paiements Stripe/COD, endpoints, Dashboard KPIs, Runbook QA
- AfriTalk (Phase 4.2): MVP livré – WS + REST, présence, UI Admin (Conversations/Chat), widget & page présence, Runbook QA
- Prochaines itérations:
  - E‑commerce Phase 2: Stripe.js côté Admin, observabilité (export CSV/Logs), storefront public (Phase 1 COD, puis Stripe)
  - AfriTalk Phase 4.2+: navigation “Discuss” vers DG par défaut (si `dgUserId`), amélioration page présence (filtres, “Démarrer un chat”), métriques WS

## 12) Annexes & ENV

- ENV API essentiels:
  - E‑commerce: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - AfriTalk: `REDIS_URL=redis://localhost:6379`
- Migrations Prisma (tenant):
  - E‑commerce (déjà en place), AfriTalk: `npx prisma migrate dev --schema ./src/generated/tenant/schema.prisma --name afritalk_init` + `npx prisma generate`

---

Ce document maître consolide le cahier des charges et renvoie vers les spécifications détaillées par module. Les sections “Runbook QA” permettent de valider rapidement chaque phase livrée.
