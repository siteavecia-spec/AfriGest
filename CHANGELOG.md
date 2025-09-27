# Changelog

## [Unreleased]
- Stabilisation de la landing et du funnel de conversion
- Ajout d’un thème MUI central conforme à la charte (palette, typo Inter, radius, defaults composants)
- CTA "Demander une démo" proéminent dans le `PublicHeader` (desktop + mobile)
- Composants `FloatingCTAs` (WhatsApp + scroll-to-demo) et `StickyDemoBar` (mobile)
- Capture des UTM et ajout à la demande de démo; UTM persistées et injectées vers Calendly sur `/thank-you`
- Blocage du bouton d’envoi tant que Turnstile n’est pas validé (si clé présente)
- Événements analytics du funnel: `section_view`, `form_view`, `field_focus`, `form_abandon`, `demo_submit_success`, `thank_you_view`, `thank_you_calendly_visible`, `calendly_click`
- `ErrorBoundary` global autour des pages publiques (Landing, Security, ThankYou) avec reporting `ui_error` + incidentId et liens support (Email/WhatsApp)
- `FooterPublic` enrichi des réseaux sociaux (LinkedIn, X, Facebook, YouTube)
- `docs/ENV.md` mis à jour (variables Web) et `docs/QA-LANDING.md` ajouté (checklist de recette)
- Migration sélective des couleurs codées en dur vers les tokens du thème (hero, CTA banner, features, titres, bouton du formulaire)

## [Historique]
- Initialisation des pages publiques et de la vitrine `/shop` (MVP)
