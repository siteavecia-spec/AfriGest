# Phase 3 – Hardening & Performance

Dernière mise à jour: 2025-09-26

## Objectifs
- Robustesse: meilleure gestion des erreurs, idempotence, files offline.
- Performance: latence P95/P99 sous 200 ms pour endpoints clés, pagination stricte.
- Observabilité: métriques de base, logs enrichis, alertes simples.
- Sécurité: durcissement JWT, CORS non-dev, headers HTTP.
- UX/Qualité: accessibilité, exports volumineux, micro-optimisations UI.

## Priorités (Semaine 1)
- API: tests de fumée automatisés (Supertest) sur `/health`, `/products`, `/sales`, `/stock`.
- Performance: revue des requêtes et index DB (lorsque `USE_DB=true`), limites de page par défaut.
- Observabilité: normaliser les messages d’erreur (avec `ReqID`), latence et taux d’erreurs via logs structurés.
- POS Offline: tests de la file (succès/erreurs, idempotence `offlineId`).

## Actions détaillées
- API
  - Valider headers `X-Total-Count` partout (fait Phase 2).
  - Ajouter `X-RateLimit-*` (fait Phase 2+).
  - Supertest en process (sans serveur) pour réponses 200 et formats JSON attendus.
- Web
  - Virtualisation listes si nécessaire (Stock, POS), mémoïsations.
  - Exports CSV/PDF avec feedback progressif pour gros volumes.
- Sécurité
  - Vérifier expiration/rotation JWT, routes sensibles, CORS.

## Validation & CI
- Étapes CI:
  - Build API/Web, lint.
  - Supertest (in-process) après build.
  - Happy path (serveur démarré) ensuite.

## Indicateurs
- Latence P95/P99 sur endpoints clés.
- Taux d’erreurs (4xx/5xx).
- Temps de build CI et stabilité des tests.
