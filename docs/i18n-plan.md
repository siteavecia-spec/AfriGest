# i18n Plan (Skeleton)

## Goals
- Support French/English UI with localized formats (dates, numbers, currency).

## Approach
- Introduce i18n library (e.g., i18next) with lazy-loaded namespaces.
- Extract UI strings; default language fr-FR; fallback en.
- Use browser language detection with override per user.

## Data & Currency
- Store tenant default currency and locale.
- Normalize reporting across currencies (conversion rules if needed).

## QA & Testing
- Pseudo-localization environment.
- Screenshots per locale; automated checks for missing keys.

## Performance
- Code-splitting by locale; caching translations.

## Rollout
- Phase 1: skeleton + key screens (Login, Dashboard, POS)
- Phase 2: rest of UI; docs; partner API messages
