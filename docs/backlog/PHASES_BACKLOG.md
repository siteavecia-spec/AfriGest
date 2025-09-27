# Backlog Phases 1 → 4

This backlog groups User Stories (US), acceptance criteria, and rough estimates. It is a living document.

## Phase 1 — MVP Guinée Conakry

- [P1-US1] Super Admin: CRUD Entreprises (Master DB)
  - Acceptance: Create/Archive a company; list companies; view details.
  - Estimate: 8–10 pts
- [P1-US2] Super Admin: Mode support (impersonation)
  - Acceptance: SA can switch into a tenant safely and back; logged in audit.
  - Estimate: 5 pts
- [P1-US3] Provisionnement tenant (CLI)
  - Acceptance: `provision-tenant` creates DB/schema, runs migrations, seeds minimal data.
  - Estimate: 8 pts
- [P1-US4] PWA: Manifest + SW + offline caching P0
  - Acceptance: Installable; caches shell; POS works offline (already partially done).
  - Estimate: 3 pts
- [P1-US5] Documentation utilisateur MVP
  - Acceptance: PDG/DG/Employé quick start + FAQ.
  - Estimate: 3 pts

## Phase 2 — Consolidation Multi‑Boutiques

- [P2-US1] Ordres de transfert PDG → Boutiques
  - Acceptance: Create order; DG receives/validates; stock updates; audit trail.
  - Estimate: 8–13 pts
- [P2-US2] Inventaires & écarts (local)
  - Acceptance: Count, variance report, justification; export.
  - Estimate: 8–13 pts
- [P2-US3] Rapport fin de journée (boutique)
  - Acceptance: Daily close report including totals, payments, variances.
  - Estimate: 5–8 pts
- [P2-US4] Dashboard PDG consolidé
  - Acceptance: Cross-boutique KPIs, date filters, CSV export by period.
  - Estimate: 5–8 pts

## Phase 3 — Scalabilité Panafricaine

- [P3-US1] i18n (UI + formats) fr/en
  - Acceptance: Language switch; number/date/currency localized.
  - Estimate: 5–8 pts
- [P3-US2] Facturation électronique locale (pays)
  - Acceptance: Country config; numbering; compliant PDF/JSON payloads.
  - Estimate: 13–21 pts
- [P3-US3] API Partenaires (keys/scopes/quotas)
  - Acceptance: Create/manage API keys; rate limit; audit; OpenAPI docs.
  - Estimate: 13–21 pts
- [P3-US4] Ops multi‑tenant (provision/backup/restore)
  - Acceptance: Automated tools + runbooks; tested restore.
  - Estimate: 8–13 pts

## Phase 4 — Écosystème et IA

- [P4-US1] E‑commerce BE complet
  - Acceptance: Products/Orders/Customers; statuses; stock sync (shared/dedicated); webhooks.
  - Estimate: 21–34 pts
- [P4-US2] Paiements (Orange/MTN/Stripe/PayPal)
  - Acceptance: Tokenized/redirected flows; PCI-safe; receipts.
  - Estimate: 13–21 pts
- [P4-US3] Vitrine publique multi‑tenant (sous-domaine)
  - Acceptance: Catalog/search; customer account; order tracking; SEO basics.
  - Estimate: 13–21 pts
- [P4-US4] Mobile natif (Employé/DG)
  - Acceptance: POS lite + inventory app; offline-first.
  - Estimate: 21–34 pts
- [P4-US5] IA prévision ventes
  - Acceptance: Forecasts per product/store; low-stock proactive alerts.
  - Estimate: 13–21 pts

## Notes
- Estimates are story points ranges; refine per sprint.
- Add risks/deps per ticket during sprint planning.
