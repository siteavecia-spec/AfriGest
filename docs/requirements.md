# AfriGest — Cahier des charges (MVP)

## 1. Vision & Contexte
- Plateforme SaaS multi‑tenants pour la gestion de boutiques (Guinée Conakry en MVP), scalable et réutilisable (white‑label) sans modification du code.
- Performances: <3s sur 3G, responsive 100%, accessibilité WCAG 2.1 AA.
- Sécurité: RGPD/local, TLS, audit, sauvegardes 3‑2‑1.

## 2. Rôles & RBAC
- Super Admin (plateforme)
- PDG/Admin (entreprise)
- DG (entreprise)
- Employé (caisse)

Guard front: routes protégées par rôle.
Guard back: middleware `requireAuth` + `requireRole`.

## 3. Architecture
- Monorepo `apps/` (web, api) + `infra/` + `packages/` (futurs)
- Multi‑tenants: base master + base par tenant (reporté tant que hors‑DB). Pour MVP offline/low‑data, stockage en mémoire avec fallback.

## 4. Stack technique
- Frontend: React 18, Vite, Redux Toolkit, MUI, IndexedDB (idb)
- Backend: Node/Express/TypeScript, JWT (access/refresh), bcrypt
- DB cible: PostgreSQL + Prisma (intégration reportée); pour l’instant stores mémoire
- PWA: service worker (à venir), offline queue

## 5. Branding UI/UX
- Couleurs primaires/neutres définies, typographie Inter, grille 8px, bords 4‑8px
- Theme MUI centralisé (`apps/web/src/theme.ts`)
- Reçus: branding (logo, nom, slogan, adresse, téléphone), numérotation par boutique + préfixe.

## 6. Périmètre MVP (fonctionnel)
- Authentification (login/logout) + conservation token + `x-company`
- Tableau de bord (placeholder KPIs)
- POS (caisse) offline‑capable
  - Recherche produit, scan code‑barres/SKU, panier multi‑lignes
  - Remises par ligne + remise globale, modes de paiement (cash/mobile money/carte), réf. paiement
  - Reçus imprimables + export PDF, branding + numérotation
  - Offline queue (IndexedDB) + synchronisation auto
- Stock
  - Création produit
  - Entrées de stock
  - Résumé de stock par boutique
  - Seuil d’alerte global + export CSV; ajustements de stock avec motif + audit consultable
- Fournisseurs
  - Liste + création (édition/suppression à étendre sur UI)

## 7. API (MVP stores mémoire)
- Auth: `/auth/login`, `/auth/refresh`, `/auth/logout`
- Produits: `GET /products`, `POST /products`
- Fournisseurs: `GET /suppliers`, `POST /suppliers`, `PUT /suppliers/:id`, `DELETE /suppliers/:id`
- Stock: `GET /stock/summary?boutiqueId=...`, `POST /stock/entries`, `POST /stock/adjust`, `GET /stock/audit?productId=...`
- Ventes: `POST /sales` (support `offlineId`), `GET /sales` (simple)
- Headers requis: `Authorization: Bearer`, `x-company`

## 8. Frontend (routes)
- Public: `/login`
- Protégées: `/dashboard`, `/pos`, `/stock` (PDG/DG/Super Admin), `/suppliers` (PDG/DG/Super Admin), `/settings` (PDG/Super Admin)

## 9. Offline & PWA
- IndexedDB: file d’attente des ventes
- Service worker + stratégie de cache: à implémenter (prochaines étapes)

## 10. Sécurité
- JWT access/refresh (implémenté côté API), RBAC middleware, résolution tenant via en‑tête `x-company` (demo)

## 11. Déploiement & Infra
- Dev local (Vite/Express). Docker compose pour Postgres (optionnel, reporté si faible connexion)
- Cible: AWS/DigitalOcean; stockage fichiers: S3‑compatible (post‑MVP)

## 12. Roadmap (proposée)
1) MVP sans DB (terminé en grande partie)
2) Prisma + Postgres (master/tenant), migration données en mémoire → DB
3) Inventaire avancé, seuils par produit, fournisseurs CRUD complet (UI)
4) PWA (SW, pre‑cache, offline banner), perf <3s 3G
5) PDF reçus avancés + envoi (email/WhatsApp, post‑MVP)

## 13. Fait / À faire (MVP)
- Fait
  - Auth + routes protégées + rôles (front/back)
  - POS: recherche, scan, panier multi‑lignes, remises, paiements, reçu print/PDF, offline queue
  - Stock: produits, entrées, résumé, seuil global + CSV, ajustements + audit
  - Fournisseurs: liste + création (API CRUD OK; UI edit/delete à compléter)
  - Branding: paramètres société en localStorage + numéro de reçu
- À faire (sans DB)
  - UI fournisseurs: édition/suppression
  - POS: hold/resume (en place), edit quantités rapide, raccourcis
  - Stock: seuil par produit
  - PWA: SW + offline banner
- À faire (avec DB)
  - Intégration Prisma (master/tenant), seed, migrations
  - Persistance complète produits/stock/ventes/fournisseurs

## 14. Annexes
- Dossiers clés
  - `apps/web/src/pages/Pos.tsx`, `apps/web/src/pages/Stock.tsx`, `apps/web/src/pages/Suppliers.tsx`, `apps/web/src/pages/Settings.tsx`
  - `apps/web/src/components/ReceiptModal.tsx`, `apps/web/src/components/Layout.tsx`
  - `apps/api/src/routes/*`, `apps/api/src/stores/memory.ts`
- Paramètres entreprise: `apps/web/src/utils/settings.ts`

## 15. Module de Gestion de Produits Multi‑Secteurs (MVP)

### Objectifs
- Flexibilité: s’adapter à chaque secteur via des templates d’attributs.
- Simplicité: n’afficher que les champs pertinents.
- Scalabilité: ajouter de nouveaux secteurs sans refonte.
- Personnalisation: attributs personnalisés par PDG (post‑MVP DB; MVP localStorage possible).

### Architecture
- Noyau Produit (commun): `sku`, `name`, `price`, `cost`, `barcode`, `taxRate`, `isActive`.
- EAV léger (attrs): `Product.attrs: Record<string, any>` pour champs sectoriels.
- `Product.sector?: string` pour la clé secteur.
- Templates sectoriels (in‑memory MVP): `apps/api/src/stores/memory.ts` exporte `sectorTemplates`.
- Endpoints:
  - `GET /products/templates` → liste des templates
  - `POST /products` → accepte `{ sector, attrs }`

### Templates sectoriels (MVP)
- retail (Commerce de détail): `supplier`, `ref`, `promoPrice`, `minStock`
- restaurant: `ingredients`, `allergens`, `prepTime`, `bomCost`
- fashion: `size`, `color`, `material`, `season`
- electronics: `brand`, `model`, `serial`, `warranty`
- pharmacy: `dci`, `dosage`, `form`, `batch`, `expiry`
- grocery: `category`, `expiry`, `shelfStock`, `promo`
- beauty: `brand`, `range`, `keyIngredients`, `expiry`
- generic: aucun attribut imposé

### Frontend
- Création produit (Stock): sélection du secteur + rendu dynamique des attributs selon le template.
- Catalogue produit (à venir): filtres par secteur + recherche sur champs communs et attributs clés.

### Alertes (prochaines étapes)
- Pharmacie: produits expirant bientôt (via `attrs.expiry`).
- Grocery/Beauty: péremption.

### Roadmap module
- v1 (MVP in‑memory): templates statiques + attrs en JSON; UI de création dynamique.
- v2 (DB): schéma Prisma EAV, templates administrables (Super Admin), attributs custom PDG.

## 16. Module de Parrainage — Ambassadeurs AfriGest (MVP adapté onboarding manuel)

### Contexte & Objectifs
- Intégration au flux existant: demande de démo → validation par l'équipe → création de compte manuelle.
- Objectifs: crédibilité (social proof), tracking, récompenses sans compromettre la qualité de l'onboarding.

### Processus (simplifié MVP)
1) PDG existants disposent d'un code parrainage (ex: `AFG-MTX5B2`).
2) Ils partagent un lien de démo pré-rempli `https://afrigest.com/?ref=AFG-MTX5B2`.
3) Prospect remplit le formulaire « Demander une démo » avec le champ « Code parrain (optionnel) ».
4) Code validé en temps réel côté landing via endpoint public.
5) L'équipe traite la demande; lors de la création manuelle du compte, attribution automatique du parrainage (phase ultérieure DB).

### Fonctionnalités (MVP)
- Landing public avec formulaire de démo (pas d'auto‑signup) et liste dynamique de 5 meilleurs clients (logos inclus).
- Champ « Code parrain (optionnel) » avec validation public API.
- Stockage des demandes de démo (MVP en mémoire; DB ensuite).

### API (MVP in‑memory, public)
- `GET /public/clients-top` → top 5 références (nom, secteur, logoUrl).
- `GET /public/referrals/validate?code=...` → `{ ok, owner? }`.
- `POST /public/demo-requests` → `{ name, company, email, phone?, message?, referralCode? }`.

### Données (MVP in‑memory)
- `publicClients` avec `logoUrl` (exemples/placeholder).
- `demoRequests` pour centraliser les leads.

### Roadmap module
- v1: validation code côté landing + stockage des demandes (MVP en mémoire).
- v2: schéma DB (tables `referral_codes`, `referral_requests`, `referral_rewards`), endpoints sécurisés PDG/Admin, tableau de bord, notifications (Mailjet/SendGrid), règles métier (30j, plafonds), anti‑fraude, export/reporting.

## 17. Fonctionnalité — Mot de passe oublié (MVP puis sécurité avancée)

### Contexte & Objectifs
- Contexte: les utilisateurs (PDG, DG, Employés) peuvent oublier leurs identifiants; besoin d’un mécanisme sécurisé de récupération.
- Objectifs: accessibilité (autonome, rapide), sécurité (tokens/OTP, expiration), UX adaptée au contexte (email/SMS), multi‑canal.

### Workflow (vue d’ensemble)
1) Page de connexion → lien « Mot de passe oublié ? » (`/forgot-password`).
2) Choix méthode: email (token JWT 15 min) ou SMS (OTP 6 chiffres 10 min).
3) Email: saisie et validation; génération token et envoi lien sécurisé; page `/reset-password?token=...`.
4) SMS: saisie téléphone et validation; envoi OTP; page de saisie OTP puis réinitialisation.
5) Création d’un nouveau mot de passe → validation règles → mise à jour BD → invalidation sessions → redirection connexion + succès.

### Données (cible DB)
Table `password_reset_requests` (par tenant), avec index:
- `id`, `user_id`, `reset_token` (JWT), `otp_code` (SMS), `reset_method` ('email'|'sms'), `expires_at`, `used`, `ip_address`, `user_agent`, timestamps.

### Endpoints (API)
- `POST /api/auth/forgot-password` → { email, method: 'email'|'sms', captcha }
- `POST /api/auth/validate-reset-token` → { token } OU { phone, otp }
- `POST /api/auth/reset-password` → { token, newPassword, confirmPassword }
- `POST /api/super-admin/force-password-reset` → { user_id, tenant_id, reason }

### Sécurité
- Rate limiting: max 3 tentatives/heure/IP; activer reCAPTCHA v3 après 2 échecs.
- Règles mot de passe (serveur): min 8, majuscule, minuscule, nombre, spécial, bloque mots de passe communs, validité 90 j, historique 5.
- Tokens/OTP: usage unique, expiration courte (15 min email, 10 min SMS), chiffrement en BD.
- Revocation sessions: déconnexion de tous les appareils après reset.
- Audit: log de toutes les demandes, anonymisation des logs après 30 j; conformité RGPD.

### Email (MVP)
- Template: « Réinitialisation de votre mot de passe AfriGest » avec lien `{resetLink}`; validité 15 min.
- Génération token: JWT `{ sub: userId, type: 'password_reset' }`, `expiresIn: '15m'`, `issuer: 'afrigest'`, `jti` unique.

### SMS/OTP (étape 2)
- Envoi via API locale (Orange/MTN): message « Code AfriGest: {OTP}, valide 10 min ».
- OTP: `Math.floor(100000 + Math.random() * 900000).toString()`.

### UI (frontend)
- `/forgot-password`: choix email/SMS; formulaire dynamique; captcha après échecs; déclenche l’envoi (email ou SMS).
- `/reset-password`: page saisie mot de passe (via token) ou OTP + nouveau mot de passe; indicateur de force et règles visuelles; validation puis succès.
- Lien « Mot de passe oublié ? » sous le formulaire de connexion.

### Super Admin (administration)
- Forcer réinitialisation: sélectionner un utilisateur, saisir raison (obligatoire), confirmer; log + notification; invalider sessions.

### Déploiement (phases)
1) Semaine 1 — Base: email + token JWT, pages front, validation mots de passe.
2) Semaine 2 — Sécurité: SMS/OTP, rate limit, reCAPTCHA et anti‑bots.
3) Semaine 3 — Admin/Monitoring: interface SA, logs/alertes, tests sécurité.
4) Semaine 4 — Optimisation: UX/UI, tests multi‑secteurs, doc utilisateur.

### Métriques
- Taux de réussite > 85%; temps moyen < 2 minutes; NPS > +40; 0 incident lié au reset.

### Détails d'implémentation complémentaires (MVP livré + extensions)

#### SMS/OTP (Phase 2 – livré côté API, UI activée)
- Demande OTP: `POST /auth/forgot-password { phone, method: 'sms' }` → génère OTP 6 chiffres valide 10 min; envoi via `sendSMS()` (intégration provider locale à brancher)
- Validation OTP: `POST /auth/validate-reset-token { phone, otp }` → renvoie un token court (10 min) pour réutiliser `POST /auth/reset-password`
- Réinitialisation: identique au flux email, avec vérifications de complexité et blocage mots de passe communs (liste de base incluse)

#### Super Admin — Réinitialisation forcée (MVP livré)
- Endpoint: `POST /super-admin/force-password-reset { email, reason }` (protégé rôle `super_admin`)
- Génère un token reset (15 min) et envoie un email dédié « Réinitialisation de votre mot de passe » (template HTML brandé)
- UI minimale: page `/admin/password-reset` (web) pour saisir email + raison

#### Sécurité additionnelle (MVP + Roadmap)
- reCAPTCHA v3: vérification côté API si `RECAPTCHA_SECRET` présent; front charge dynamiquement la lib si `VITE_RECAPTCHA_SITE_KEY` défini
- Rate limiting: 3 demandes/heure/IP sur `/auth/forgot-password`
- Blocage mots de passe communs: contrôle serveur (liste de base; à étendre/paramétrer)
- Invalidation de sessions: à brancher sur store de sessions / liste de révocation JWT (placeholder prévu)

#### Variables d'environnement (matrix)
- API
  - `RESET_TOKEN_SECRET`: secret JWT pour tokens de reset
  - `WEB_URL`: base URL du front pour composer les liens (ex: `https://app.afrigest.com`)
  - `RECAPTCHA_SECRET` (optionnel): clé secrète reCAPTCHA v3 pour valider les tokens côté serveur
  - SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO`, `MAIL_CC` (optionnel)
  - SMS: `SMS_FROM` (ID émetteur); (provider/API keys à ajouter lors de l'intégration réelle)
- Web
  - `VITE_API_URL`: URL base de l'API
  - `VITE_RECAPTCHA_SITE_KEY` (optionnel): clé site reCAPTCHA v3; si présente, le front transmet un token

#### Checklist de tests (manuels)
1) Email
   - Demande: `/forgot-password` → email
   - Validation token: `/auth/validate-reset-token { token }` → ok
   - Réinitialisation: `/reset-password?token=…` → complexe OK, mots de passe communs refusés
2) SMS/OTP
   - Demande OTP: `/forgot-password` → SMS (console log en MVP)
   - Validation OTP: `POST /auth/validate-reset-token { phone, otp }` → `token` court
   - Réinitialisation: `POST /auth/reset-password { token, newPassword, confirmPassword }`
3) Super Admin
   - Forcer: `/admin/password-reset` → email avec lien + motif
4) Sécurité
   - reCAPTCHA: activer `RECAPTCHA_SECRET`/`VITE_RECAPTCHA_SITE_KEY` et vérifier refus sans captcha
   - Rate limit: >3 demandes/h IP → 429
   - Règles mot de passe: refuser `password`, `123456`, etc.
