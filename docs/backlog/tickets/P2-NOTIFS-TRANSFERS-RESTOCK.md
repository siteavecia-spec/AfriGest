# P2 — Notifications Automatiques (Transferts & Réappro)

## Contexte
Notifier automatiquement les DG/boutiques des événements clés: transfert en attente de réception, seuil critique atteint, demande de réappro.

## Portée
- Règles:
  - Transfert `en_transit` → notifier DG de la boutique de destination.
  - Stock ≤ seuil → créer une alerte et proposer un brouillon de demande de réappro.
  - Demande de réappro créée → notifier PDG/DG concernés.
- Canaux: Messagerie interne (AfriTalk) + toast UI; email (phase ultérieure).

## Détails techniques
- Émetteurs: hooks sur changements de statuts/stock (services Inventaire/Transferts).
- Messagerie: `POST /messaging/message` au DG cible (contenu contextuel + deep link).
- Toast: bus d’événements frontend (store global) + snackbars.
- Audit: `notification.sent` + `notification.read` (si applicable).

## UI/Pages
- `Transfers.tsx`, `Inventory.tsx`: affichage d’alertes.
- `Messaging/Conversations.tsx`: réception des messages système.

## Critères d’acceptation
- Notification émise en < 2s après l’événement.
- Lien ouvre la page concernée pré‑filtrée.

## Tests
- E2E: créer transfert → voir notif DG destination; seuil atteint → voir alerte + brouillon réappro.
- Edge: destinataire indisponible, doublons (idempotence).
