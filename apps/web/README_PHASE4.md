# Phase 4 — Paiements réels (Plan technique BE/FE + Sécurité)

Ce document présente l’architecture cible, les endpoints à implémenter côté serveur, les intégrations front, la sécurité et les scénarios de test pour activer des paiements réels (Stripe, PayPal, Mobile Money MTN/Orange) dans AfriGest.

## Objectifs
- Accepter des paiements en ligne (carte, PayPal, Mobile Money) pour les commandes e‑commerce.
- Assurer la mise à jour fiable du `paymentStatus` et du `status` des commandes.
- Respecter les bonnes pratiques de sécurité (stockage des secrets, conformité PCI en mode redirection/tokenisation).

## Architecture (vue d’ensemble)
- Front (apps/web): déclenche les intents/ordres/initialisations via API *server-side* et affiche les statuts.
- Back (apps/api – à implémenter): expose des endpoints tenant‑scopés:
  - `POST /api/tenants/:tenantId/ecommerce/payments/stripe/intent`
  - `POST /api/tenants/:tenantId/ecommerce/payments/paypal/order`
  - `POST /api/tenants/:tenantId/ecommerce/payments/mtn/init`
  - `POST /api/tenants/:tenantId/ecommerce/payments/orange/init`
  - Webhooks: `/webhooks/stripe`, `/webhooks/paypal`, `/webhooks/mtn`, `/webhooks/orange`
- DB: table `ecommerce_orders` avec `paymentStatus` (`pending|paid|failed|refunded`) et `status` (`received|prepared|shipped|delivered|returned`).

## Endpoints serveur (proposés)
- Stripe
  - `POST /.../stripe/intent` → crée PaymentIntent (amount, currency, metadata: orderId/tenantId), retourne `clientSecret`.
  - Webhook `/webhooks/stripe` → `payment_intent.succeeded|payment_intent.payment_failed` → met à jour `paymentStatus` de l’ordre.
- PayPal
  - `POST /.../paypal/order` → crée un *order* et renvoie `approveUrl`.
  - Webhook `/webhooks/paypal` → `CHECKOUT.ORDER.APPROVED|COMPLETED` → met à jour `paymentStatus`.
- Mobile Money (MTN/Orange)
  - `POST /.../mtn/init` et `POST /.../orange/init` → init transaction (amount/phone/metadata).
  - Webhooks opérateurs → mise à jour `paymentStatus`.

Notes:
- Les endpoints front existants (`ecomPaymentsStripeIntent`, `ecomPaymentsPayPalOrder`, `ecomPaymentsMtnInit`, `ecomPaymentsOrangeInit`) sont déjà câblés côté client et attendent le backend.

## Gestion des commandes
- Création commande (`ecomCreateOrder`) avec `payment.provider` = `cod|stripe|paypal|mtn_momo|orange_momo`.
- Passage `paymentStatus`:
  - `pending` par défaut après création.
  - `paid` via webhook prestataire.
  - `failed` sur échec/cancel.
- Option: autoriser déclenchement de capture côté serveur (Stripe/PayPal) si mode `authorize` séparé.

## Sécurité & conformité
- Secrets (
  - Stripe secret key, PayPal client/secret, MTN/Orange API keys): **jamais** côté client, uniquement serveur (env/vault).
- PCI DSS: éviter le transit de numéros de carte via notre backend (utiliser JS/SDK Stripe tokenisation). Redirections/SDK PayPal pour carte.
- Webhooks: valider la signature (Stripe `Stripe-Signature`, PayPal Webhook ID, HMAC MoMo/Orange).
- Logging: tracer `X-Request-Id`, anonymiser PII sensible.
- Anti‑fraude (base): verrouillage tentative, contrôles montant/devise, réplications idempotentes (`idempotencyKey`).

## Feature flags
- `VITE_ENABLE_PAYMENTS`, `VITE_ENABLE_MOBILE_MONEY`, `VITE_ENABLE_PAYPAL`, `VITE_ENABLE_STRIPE` contrôlent l’affichage côté front.
- Côté serveur: flags/paramètres par *tenant* pour activer chaque prestataire.

## UX/Ergonomie
- `Storefront/Checkout`: afficher état `pending/processing/paid/failed` et guidance post‑paiement.
- Pages admin:
  - `/ecommerce/payments` (créée) pour supervision.
  - `/ecommerce/orders` → badge `paymentStatus`.
  - `/ecommerce/settings` → section “Paiements (Phase 4)”.

## Scénarios de test
1. Stripe (test): créer commande `payment=stripe`, confirmer par carte test → `paid` via webhook.
2. PayPal (sandbox): `approveUrl` puis callback → `paid`.
3. MTN/Orange (sandbox/stub): init + réception webhook simulé → `paid`.
4. Cas d’échec: montant invalide, devise non supportée, signature webhook invalide.
5. Idempotence: rejouer webhook → aucun double comptage.

## Checklist implémentation serveur
- [ ] Créer endpoints 4 prestataires (tenant‑scoped) + validations payloads.
- [ ] Implémenter webhooks (signature + idempotence) et MAJ `paymentStatus`.
- [ ] Stocker secrets prestataires par tenant (DB chiffrée ou secret manager).
- [ ] Ajouter modèles de logs/alertes pour erreurs paiements.
- [ ] Tests d’intégration sandbox (Stripe/PayPal) + simulateurs MoMo.

## Roadmap incrémentale
1. Stripe (courbe d’apprentissage faible, tokenisation facile) → PayPal → MoMo.
2. Surveiller latences (<2s jusqu’à page confirmation) et taux de succès.
3. Durcir anti‑fraude (3‑D Secure déjà géré par Stripe selon carte).

## Tests cURL (exemples)

Remplacez `TENANT_ID` par l’identifiant du tenant courant (entête `x-company` ou résolution interne), et ajustez le port/API_URL.

### Stripe — PaymentIntent (serveur)

```bash
curl -X POST "http://localhost:4000/api/tenants/TENANT_ID/ecommerce/payments/stripe/intent" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' -H 'x-company: <COMPANY>' \
  -d '{
    "items": [{ "sku": "demo", "quantity": 1, "price": 1000, "currency": "usd" }],
    "customer": { "email": "test@example.com" }
  }'
```

### Stripe — Webhook (signature requise en réel)

```bash
curl -X POST "http://localhost:4000/api/tenants/TENANT_ID/ecommerce/webhooks/stripe" \
  -H 'Content-Type: application/json' \
  --data '{ "type": "payment_intent.succeeded", "data": { "object": { "id": "pi_fake", "amount": 1000, "currency": "usd", "metadata": { "orderId": "ORDER_ID" } } } }'
```

### PayPal — Webhook (sandbox)

```bash
curl -X POST "http://localhost:4000/api/tenants/TENANT_ID/ecommerce/webhooks/paypal" \
  -H 'Content-Type: application/json' \
  --data '{ "event_type": "CHECKOUT.ORDER.APPROVED", "resource": { "id": "ORDER_ID", "status": "COMPLETED", "amount": { "value": "1000", "currency_code": "GNF" } } }'
```

### MTN — Init (stub) puis Webhook

```bash
# Init (retournera 202 si non configuré)
curl -X POST "http://localhost:4000/api/tenants/TENANT_ID/ecommerce/payments/mtn/init" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' -H 'x-company: <COMPANY>' \
  -d '{ "amount": 1000, "currency": "GNF", "phone": "+224600000000" }'

# Webhook succès
curl -X POST "http://localhost:4000/api/tenants/TENANT_ID/ecommerce/webhooks/mtn" \
  -H 'Content-Type: application/json' \
  --data '{ "status": "success", "orderId": "ORDER_ID", "amount": 1000, "currency": "GNF" }'
```

### Orange — Init (stub) puis Webhook

```bash
# Init (retournera 202 si non configuré)
curl -X POST "http://localhost:4000/api/tenants/TENANT_ID/ecommerce/payments/orange/init" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' -H 'x-company: <COMPANY>' \
  -d '{ "amount": 1000, "currency": "GNF", "phone": "+224600000000" }'

# Webhook succès
curl -X POST "http://localhost:4000/api/tenants/TENANT_ID/ecommerce/webhooks/orange" \
  -H 'Content-Type: application/json' \
  --data '{ "status": "success", "orderId": "ORDER_ID", "amount": 1000, "currency": "GNF" }'
```
