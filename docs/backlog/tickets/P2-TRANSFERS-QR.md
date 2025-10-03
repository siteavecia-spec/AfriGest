# P2 — Transferts: QR (Génération + Scan)

## Contexte
Pour les transferts inter-boutiques, permettre la génération d’un QR code unique par ordre de transfert (PDF imprimable) et la réception par scan en boutique (mobile/desktop) afin d’accélérer et fiabiliser la saisie.

## Portée
- Génération QR côté départ: PDF avec QR + récap transfert (id, source, destination, items, quantités).
- Scan QR côté réception: décoder transfertId (+ checksum), pré‑remplir la réception et valider.
- Statuts: `en_transit` → `reçu`.

## Détails techniques
- Format QR: `transfer:{tenantId}:{transferId}:{checksum}`.
- PDF: réutiliser `jspdf` (voir `apps/web/src/components/ReceiptModal.tsx`).
- Scan: composant lecteur QR (lib web de scan vidéo), fallback upload image.
- API: `GET /api/tenants/:tenantId/transfers/:id` (récap), `POST /receiving` pour valider.
- Audit: log `transfer.qr.generated` et `transfer.received.scanned`.

## UI/Pages
- `Transfers.tsx`: bouton "Imprimer QR" sur un transfert.
- `Receiving.tsx`: champ/lecteur QR + bouton "Scanner un transfert".

## Sécurité
- Checksum (HMAC court) pour éviter collisions/forgeries.
- RBAC: `transfers: read/write` requis.

## Critères d’acceptation
- QR généré contient un id valide et permet la réception sans saisie manuelle.
- Erreur claire si QR invalide/expiré.
- PDF imprimable responsive.

## Tests
- E2E: créer transfert → générer PDF → scanner et réceptionner.
- Edge cases: QR illisible, transfert déjà reçu, boutique incorrecte.
