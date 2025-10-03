# Sprint 02 — Plan (ELECTO AFRICA fit)

## Horizon
- Durée: 2 semaines
- Objectifs: Clore les finitions pour cas ELECTO AFRICA (QR transferts, POS split tender, notifications auto) et stabiliser E2E.

## Portée (Tickets)
- P1-POS-SPLIT-TENDER — POS Paiement Mixte (MoMo + Cash)
- P2-TRANSFERS-QR — Transferts: QR (Génération + Scan)
- P2-NOTIFS-TRANSFERS-RESTOCK — Notifications Automatiques (Transferts & Réappro)
- E2E — Stabilisation CI: MoMo callbacks + Messaging REST

## Critères d’acceptation Sprint
- POS: une vente peut être réglée en plusieurs moyens (MoMo + Cash), reçu ventilé
- Transfert: QR généré et scanné à la réception, statut mis à jour, audit
- Notifications: envoi auto DG/PDG sur événements (transit, seuil, réappro), idempotence
- CI: exécution Playwright des suites MoMo + Messagerie, rapports dans pipeline

## Capacités & Rôles
- Backend: 2
- Frontend: 2
- QA: 1

## Risques & Mitigation
- Scan QR cross‑device: prévoir fallback upload image + test cam permissions
- Environnements MoMo: utiliser sandbox/tests et mocks si indisponibles

## Démo
- POS split tender live (vente mixte)
- Flux transfert: création → PDF QR → scan réception
- Notifications automatiques reçues en AfriTalk

## Suivi
- Standups quotidiens, board tickets, état E2E CI
