# AfriGest Web (apps/web)

## Aperçu
Front public + vitrine + accès app. Thème MUI central conforme à la charte, landing orientée conversion, analytics et consentement.

## Démarrage
```bash
npm install
npm run dev:web
```

API locale requise (voir `docs/ENV.md`).

## Configuration (.env)
Voir `docs/ENV.md` (section Web):
- `VITE_API_URL`
- `VITE_GA_MEASUREMENT_ID` (optionnel)
- `VITE_TURNSTILE_SITE_KEY` (optionnel)
- `VITE_CALENDLY_URL` (optionnel)
- `VITE_PROOF_BOUTIQUES`, `VITE_PROOF_SLA`, `VITE_PROOF_TTFB` (optionnel)

## QA
Voir `docs/QA-LANDING.md` pour la checklist de recette de la landing et du funnel (events + pages + accessibilité/SEO/perf).

## Thème / Charte
Fichier: `src/theme.ts`
- Palette: primary `#1D4ED8`, secondary `#059669`, neutres et sémantiques.
- Typo: Inter (H1..H5 + body/caption).
- Components defaults: `MuiButton`, `MuiPaper`, `MuiOutlinedInput`, `MuiLink`.

Appliqué globalement depuis `src/main.tsx` avec `ThemeProvider` + `CssBaseline`.

## Pages clés
- `src/pages/LandingPage.tsx`: landing, CTAs, UTM + Turnstile, funnel analytics, FAQ/Contact, Pricing.
- `src/pages/ThankYou.tsx`: confirmation + Calendly (UTM), fallback WhatsApp.
- `src/pages/Security.tsx`: page Sécurité publique.
- `src/pages/Storefront/*`: vitrine `/shop` (MVP).

## Composants utiles
- `src/components/PublicHeader.tsx`: nav publique + CTA démo.
- `src/components/FooterPublic.tsx`: liens légaux + réseaux sociaux.
- `src/components/FloatingCTAs.tsx`: WhatsApp + scroll-to-demo.
- `src/components/StickyDemoBar.tsx`: bandeau sticky mobile “Demander une démo”.
- `src/components/ErrorBoundary.tsx`: fallback UI + incidentId + reporting `ui_error`.

## Analytics & Consentement
- `src/utils/privacy/ConsentBanner.tsx`: consentement, activation analytics, outbound tracking.
- Événements clés: `section_view`, `form_view`, `field_focus`, `form_abandon`, `demo_submit_success`, `thank_you_view`, `thank_you_calendly_visible`, `calendly_click`, `ui_error`.
