# QA Checklist – Landing & Public Flows

This checklist verifies the public website conversion funnel and stability. Use a test build with the correct environment.

## Pre‑requisites
- [ ] Set `apps/web/.env` (see `docs/ENV.md`):
  - `VITE_API_URL`
  - `VITE_GA_MEASUREMENT_ID` (optional)
  - `VITE_TURNSTILE_SITE_KEY` (optional)
  - `VITE_CALENDLY_URL` (optional)
  - `VITE_PROOF_BOUTIQUES`, `VITE_PROOF_SLA`, `VITE_PROOF_TTFB` (optional)
- [ ] In dev, keep console open to view `[analytics]` logs.

## Landing Page (/) – Content & Navigation
- [ ] Hero shows brand, pitch and CTAs (Login, Demander une démo). (`apps/web/src/pages/LandingPage.tsx`)
- [ ] Header nav anchors scroll smoothly to: `#features`, `#pricing`, `#testimonials`, `#partners`, `#faq`, `#contact`, `#demo`. (`apps/web/src/components/PublicHeader.tsx`)
- [ ] Social proof metrics use env values or fallbacks. (`VITE_PROOF_*`)
- [ ] Testimonials and Partners render without layout shift (images lazy + sized).
- [ ] FAQ and Contact sections visible with correct content.
- [ ] Footer has legal links and social icons opening in a new tab. (`apps/web/src/components/FooterPublic.tsx`)

## Conversion Funnel Analytics
- [ ] ConsentBanner: accept consent (if GA enabled). (`apps/web/src/utils/privacy/ConsentBanner.tsx`)
- [ ] Scroll to `#demo`: `form_view` event fired.
- [ ] Focus each form field once: `field_focus` events fired (one per field).
- [ ] Leave the page or hide the tab after focusing a field and before submit: `form_abandon` fired.
- [ ] Submit form successfully: `demo_submit_success` fired and redirect to `/thank-you`.
- [ ] If Turnstile enabled, submit is disabled until verification is completed.

## Thank You Page (/thank-you)
- [ ] `thank_you_view` event fired on load.
- [ ] If `VITE_CALENDLY_URL` set:
  - [ ] `thank_you_calendly_visible` fired.
  - [ ] Clicking "Planifier un appel" opens Calendly with `utm=` appended from `afrigest_utm`.
- [ ] If Calendly not set: WhatsApp CTA appears and opens a new tab.

## Storefront (MVP)
- [ ] `/shop` shows catalog and `/shop/cart`, `/shop/checkout` load without errors.
- [ ] Adding to cart updates the cart badge. (`apps/web/src/components/Storefront/Header.tsx`)

## Error Handling (Stability)
- [ ] Temporarily inject `throw new Error('test')` in `LandingPage.tsx` to simulate an error.
  - [ ] ErrorBoundary fallback displays with an incident ID and support CTAs (Email / WhatsApp).
  - [ ] `ui_error` event is sent (with url, route, userAgent, referrer, incidentId).
  - [ ] Clicking "Recharger" recovers the UI.

## Accessibility & SEO
- [ ] Skip link is visible when focused and moves focus to main content. (`apps/web/index.html`)
- [ ] Heading hierarchy is logical; labels and alt attributes are present.
- [ ] JSON‑LD injected for Organization and SoftwareApplication.

## Performance (smoke)
- [ ] No obvious layout shifts; images have fixed dimensions.
- [ ] Initial load and scroll are smooth in desktop and mobile viewports.

## Notes
- Dev‑only console logs for analytics are enabled when `import.meta.env.MODE === 'development'`; not visible in production builds.
