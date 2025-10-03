# P1 — POS: Paiement Mixte (MoMo + Cash)

## Contexte
Au POS, permettre un règlement multi‑moyens dans une même vente (ex: 100 000 XOF Mobile Money + 79 800 XOF Espèces).

## Portée
- UI POS: ajouter une section "Paiements" avec lignes (mode, montant), total et reste dû.
- Validation: somme des lignes == total (± arrondi).
- Reçu: ventiler par mode.

## Détails techniques
- Modèle vente: stocker un tableau des paiements { type, amount, ref? }.
- Intégration MoMo: conserver le flux actuel (init/confirm), et autoriser un complément cash.
- TVA: aucun changement (calcul déjà par lignes articles).
- Audit: `pos.sale.created` avec détail des modes.

## UI/Pages
- `Pos.tsx`: panneau "Paiements" (ajouter, supprimer, éditer lignes), calcul auto du reste dû.
- `ReceiptModal.tsx`: affichage ventilé par mode.

## Critères d’acceptation
- Saisie fluide des montants; blocage si reste dû ≠ 0.
- Reçu affiche correctement la ventilation.

## Tests
- E2E: panier → régler en deux modes → reçu → stock décrémenté.
- Edge: montants incohérents, suppression d’une ligne, annulation.
