import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Container, Grid, Paper, Stack, TextField, Typography, Avatar, Divider } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { createDemoRequestPublic, getTopClientsPublic, validateReferralPublic } from '../api/client_clean'
import FooterPublic from '../components/FooterPublic'
import { setDocumentTitle, setMetaDescription, setOpenGraph, setTwitterCard } from '../utils/seo'
import { trackEvent } from '../utils/analytics'
import { testimonials, partners } from '../data/marketing'
import BrandLogo from '../components/BrandLogo'
import PublicHeader from '../components/PublicHeader'
import ConsentBanner from '../utils/privacy/ConsentBanner'
import FloatingCTAs from '../components/FloatingCTAs'
import StickyDemoBar from '../components/StickyDemoBar'
import StorefrontIcon from '@mui/icons-material/Storefront'
import CloudOffIcon from '@mui/icons-material/CloudOff'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import InsightsIcon from '@mui/icons-material/Insights'
import SecurityIcon from '@mui/icons-material/Security'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'

export default function LandingPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Array<{ id: string; name: string; sector: string; logoUrl?: string }>>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // Demo form state
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [utm, setUtm] = useState('')
  const [hp, setHp] = useState('') // honeypot
  const [referral, setReferral] = useState('')
  const [referralValid, setReferralValid] = useState<null | { ok: boolean; owner?: string | null }>(null)
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined)
  const TURNSTILE_KEY = (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || ''
  const devLog = (...args: any[]) => { try { if ((import.meta as any).env?.MODE === 'development') console.debug('[analytics]', ...args) } catch {} }

  useEffect(() => {
    ;(async () => {
      try {
        const list = await getTopClientsPublic()
        setClients(list)
      } catch {
        // ignore
      }
    })()
  }, [])

  // Capture UTM params once on mount
  useEffect(() => {
    try {
      const search = window.location.search
      if (!search) return
      const params = new URLSearchParams(search)
      const keys = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','ref']
      const entries: string[] = []
      keys.forEach(k => { const v = params.get(k); if (v) entries.push(`${k}=${v}`) })
      if (entries.length > 0) {
        const s = entries.join('&')
        setUtm(s)
        try { localStorage.setItem('afrigest_utm', s) } catch {}
      }
    } catch {}
  }, [])

  // Optional: load Cloudflare Turnstile script and render widget
  useEffect(() => {
    if (!TURNSTILE_KEY) return
    try {
      const existing = document.querySelector('script[data-afrigest="turnstile"]')
      if (existing) return
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      s.async = true
      s.defer = true
      s.setAttribute('data-afrigest', 'turnstile')
      document.head.appendChild(s)
      const onLoad = () => {
        try {
          ;(window as any).turnstile?.render('#turnstile-container', {
            sitekey: TURNSTILE_KEY,
            callback: (token: string) => setCaptchaToken(token),
            'error-callback': () => setCaptchaToken(undefined),
            'expired-callback': () => setCaptchaToken(undefined),
          })
        } catch {}
      }
      s.addEventListener('load', onLoad)
      return () => { s.removeEventListener('load', onLoad) }
    } catch {}
  }, [TURNSTILE_KEY])

  useEffect(() => {
    // SEO polish for production
    setDocumentTitle('AfriGest — La gestion moderne, simple et accessible')
    setMetaDescription("AfriGest est une plateforme SaaS de gestion multi‑boutiques conçue pour l'Afrique: ventes, stock, e‑commerce, tableaux de bord et plus.")
    setOpenGraph({
      title: 'AfriGest',
      description: "Plateforme SaaS de gestion pour commerces africains: multi‑boutiques, offline‑first, e‑commerce, KPIs.",
      siteName: 'AfriGest',
      url: typeof window !== 'undefined' ? window.location.origin : undefined,
    })
    setTwitterCard({ title: 'AfriGest', description: 'Gestion moderne pour commerces africains', cardType: 'summary' })
  }, [])

  // JSON-LD (Organization + SoftwareApplication)
  useEffect(() => {
    try {
      const elId = 'afrigest-jsonld'
      if (document.getElementById(elId)) return
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.id = elId
      const json = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            'name': 'AfriGest',
            'url': window.location.origin,
            'logo': `${window.location.origin}/logo.svg`,
          },
          {
            '@type': 'SoftwareApplication',
            'name': 'AfriGest',
            'applicationCategory': 'BusinessApplication',
            'operatingSystem': 'Web',
            'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
          },
        ],
      }
      script.text = JSON.stringify(json)
      document.head.appendChild(script)
    } catch {}
  }, [])

  // Section view analytics (IntersectionObserver) + form_view when demo enters viewport
  useEffect(() => {
    const ids = ['trust', 'features', 'how-it-works', 'testimonials', 'partners', 'pricing', 'faq', 'contact', 'demo']
    const seen = new Set<string>()
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const id = e.target.getAttribute('id') || ''
          if (id && !seen.has(id)) {
            seen.add(id)
            devLog('section_view', { section: id })
            try { trackEvent('section_view', { section: id }) } catch {}
            if (id === 'demo') {
              devLog('form_view', { form: 'demo' })
              try { trackEvent('form_view', { form: 'demo' }) } catch {}
            }
          }
        }
      })
    }, { threshold: 0.4 })
    ids.forEach(id => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  // Field focus funnel tracking and abandon detection
  const [touched, setTouched] = useState(false)
  const focusedFields = new Set<string>()
  const onFieldFocus = (field: string) => () => {
    setTouched(true)
    if (!focusedFields.has(field)) {
      focusedFields.add(field)
      devLog('field_focus', { form: 'demo', field })
      try { trackEvent('field_focus', { form: 'demo', field }) } catch {}
    }
  }
  useEffect(() => {
    const onBeforeUnload = () => {
      if (touched && !submittedRef.current) {
        devLog('form_abandon', { form: 'demo', trigger: 'beforeunload' })
        try { navigator.sendBeacon && navigator.sendBeacon('/noop', '') } catch {}
        try { trackEvent('form_abandon', { form: 'demo' }) } catch {}
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && touched && !submittedRef.current) {
        devLog('form_abandon', { form: 'demo', trigger: 'visibilitychange' })
        try { trackEvent('form_abandon', { form: 'demo' }) } catch {}
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [touched])

  const submittedRef = { current: false }

  useEffect(() => {
    let active = true
    const code = referral.trim()
    if (!code) { setReferralValid(null); return }
    ;(async () => {
      try {
        const res = await validateReferralPublic(code)
        if (active) setReferralValid(res)
      } catch {
        if (active) setReferralValid({ ok: false })
      }
    })()
    return () => { active = false }
  }, [referral])

  const onSubmitDemo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (TURNSTILE_KEY && !captchaToken) { return }
    setLoading(true)
    setMsg(null)
    try {
      const composedMsg = utm ? `${message || ''}\n\n[utm] ${utm}` : message
      await createDemoRequestPublic({ name, company, email, phone: phone || undefined, message: composedMsg || undefined, captcha: captchaToken })
      setMsg('Merci! Votre demande de démo a bien été envoyée. Nous vous recontacterons rapidement.')
      devLog('demo_submit_success', { location: 'landing', method: 'form' })
      trackEvent('demo_submit_success', { location: 'landing', method: 'form' })
      setName(''); setCompany(''); setEmail(''); setPhone(''); setMessage(''); setReferral(''); setReferralValid(null); setHp('')
      setCaptchaToken(undefined)
      submittedRef.current = true
      try { navigate('/thank-you') } catch {}
    } catch (e: any) {
      setMsg(e?.message || 'Impossible d\'envoyer votre demande pour le moment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PublicHeader />
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 6, md: 10 } }}>
        <Container>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <BrandLogo height={40} />
                <Typography variant="h3" fontWeight={800}>AfriGest</Typography>
              </Stack>
              <Typography variant="h6" sx={{ mt: 1, color: (t) => alpha(t.palette.common.white, 0.92) }}>
                La plateforme de gestion moderne pour les commerces africains. Multi‑boutique, offline‑first, e‑commerce intégré.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
                <Button href="/login" onClick={() => trackEvent('cta_login_click', { location: 'hero' })} variant="contained" sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}>Se connecter</Button>
                <Button href="#demo" onClick={() => trackEvent('cta_demo_click', { location: 'hero' })} variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.7)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>Demander une démo</Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: { xs: 'center', md: 'right' } }}>
                <img src="/og-image.svg" alt="Aperçu produit AfriGest" loading="eager" width="560" height="320" style={{ maxWidth: '100%', height: 'auto', borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container id="trust" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>Ils nous font confiance</Typography>
        <Grid container spacing={{ xs: 1.5, md: 2 }}>
          {clients.map(c => (
            <Grid item xs={12} sm={6} md={4} key={c.id}>
              <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar variant="rounded" src={c.logoUrl} sx={{ width: 48, height: 48 }}>
                  {c.name.substring(0,1)}
                </Avatar>
                <Box>
                  <Typography fontWeight={600} sx={{ color: 'text.primary' }}>{c.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{c.sector}</Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
          {clients.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary">Bientôt nos références seront affichées ici.</Typography>
            </Grid>
          )}
        </Grid>
      </Container>

      {/* Social proof metrics (env-configurable) */}
      <Container sx={{ py: { xs: 2, md: 3 } }}>
        {(() => { const env: any = (import.meta as any).env || {}; const n1 = env.VITE_PROOF_BOUTIQUES || '+50'; const n2 = env.VITE_PROOF_SLA || '99.9%'; const n3 = env.VITE_PROOF_TTFB || '<2s'; return (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={800}>{n1}</Typography>
              <Typography color="text.secondary">Boutiques actives</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={800}>{n2}</Typography>
              <Typography color="text.secondary">SLA disponibilité</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={800} title="Temps de chargement médian">{n3}</Typography>
              <Typography color="text.secondary">Temps de chargement</Typography>
            </Paper>
          </Grid>
        </Grid>
        ) })()}
      </Container>

      {/* How it works section */}
      <Container id="how-it-works" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>Comment ça marche ?</Typography>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="overline" sx={{ color: 'secondary.main' }}>Étape 1</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>Onboarding</Typography>
              <Typography color="text.secondary">Nous configurons votre entreprise (boutiques, utilisateurs, devise) et importons vos produits.</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="overline" sx={{ color: 'secondary.main' }}>Étape 2</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>Opérations</Typography>
              <Typography color="text.secondary">Encaissez en caisse (offline‑first), suivez le stock, transferts, et ventes en temps réel.</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="overline" sx={{ color: 'secondary.main' }}>Étape 3</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>E‑commerce</Typography>
              <Typography color="text.secondary">Activez la boutique en ligne, gérez les commandes, paiements et logistique depuis AfriGest.</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Testimonials section */}
      <Container id="testimonials" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>Témoignages</Typography>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {testimonials.map((t, idx) => (
            <Grid key={idx} item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                  {`"${t.quote}"`}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>— {t.author}{t.role ? `, ${t.role}` : ''}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Partners section */}
      <Container id="partners" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>Partenaires & Intégrations</Typography>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {partners.map(p => (
            <Grid key={p.name} item xs={6} sm={4} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                {p.logo ? (
                  <a href={p.url || '#'} target={p.url ? '_blank' : undefined} rel={p.url ? 'noopener noreferrer' : undefined}>
                    <img src={p.logo} alt={p.name} loading="lazy" width="120" height="40" style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }} />
                  </a>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>{p.name}</Typography>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA banner */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 4, md: 6 }, mt: 2 }}>
        <Container>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="h5" fontWeight={800}>Prêt à démarrer ?</Typography>
              <Typography sx={{ color: (t) => alpha(t.palette.common.white, 0.92) }}>Découvrez la vitrine en ligne et créez vos premières ventes.</Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button href="/shop" onClick={() => trackEvent('cta_shop_click', { location: 'cta_banner' })} aria-label="Découvrir la boutique" variant="contained" sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}>Voir la boutique</Button>
              <Button href="/login" onClick={() => trackEvent('cta_login_click', { location: 'cta_banner' })} aria-label="Se connecter" variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.7)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>Se connecter</Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Features section to increase attractiveness */}
      <Container id="features" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>Pourquoi choisir AfriGest ?</Typography>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <StorefrontIcon color="primary" />
                <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>Multi‑boutiques</Typography>
              </Stack>
              <Typography color="text.secondary">Gérez plusieurs points de vente, transferts et stocks consolidés en temps réel.</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CloudOffIcon color="primary" />
                <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>Offline‑first</Typography>
              </Stack>
              <Typography color="text.secondary">Continuez à encaisser même sans réseau, synchronisation automatique ensuite.</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ShoppingCartIcon color="primary" />
                <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>E‑commerce intégré</Typography>
              </Stack>
              <Typography color="text.secondary">Vitrine en ligne, commandes et paiements unifiés, CDN pour médias privés.</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <InsightsIcon color="primary" />
                <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>KPIs & tableaux de bord</Typography>
              </Stack>
              <Typography color="text.secondary">Pilotez le chiffre d'affaires, marges et top produits avec des indicateurs clairs.</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <SecurityIcon color="primary" />
                <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>Sécurité & conformité</Typography>
              </Stack>
              <Typography color="text.secondary">JWT, chiffrement, audit, et bonnes pratiques RGPD adaptées au contexte local.</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AutoAwesomeIcon color="primary" />
                <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>Scalable & adaptable</Typography>
              </Stack>
              <Typography color="text.secondary">Architecture multi‑tenant, white‑label, personnalisable sans forker le code.</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Pricing section */}
      <Container id="pricing" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>Tarifs</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Des offres simples et transparentes. Contactez‑nous pour un devis adapté à votre activité et au nombre de boutiques.</Typography>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700}>Starter</Typography>
              <Typography color="text.secondary" sx={{ my: 1 }}>1 boutique, fonctionnalités essentielles</Typography>
              <Divider sx={{ my: 2 }} />
              <Button fullWidth href="#demo" variant="contained" onClick={() => trackEvent('pricing_cta_click', { plan: 'starter' })} sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>Obtenir un devis</Button>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderColor: '#1D4ED8', borderWidth: 2, borderStyle: 'solid' }}>
              <Typography variant="h6" fontWeight={800}>Business</Typography>
              <Typography color="text.secondary" sx={{ my: 1 }}>Jusqu'à 5 boutiques, e‑commerce inclus</Typography>
              <Divider sx={{ my: 2 }} />
              <Button fullWidth href="#demo" variant="contained" onClick={() => trackEvent('pricing_cta_click', { plan: 'business' })} sx={{ bgcolor: '#1D4ED8', '&:hover': { bgcolor: '#1E40AF' } }}>Obtenir un devis</Button>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700}>Entreprise</Typography>
              <Typography color="text.secondary" sx={{ my: 1 }}>Multi‑pays, SLA, intégrations avancées</Typography>
              <Divider sx={{ my: 2 }} />
              <Button fullWidth href="#demo" variant="outlined" onClick={() => trackEvent('pricing_cta_click', { plan: 'enterprise' })}>Parler à un expert</Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Container id="demo" sx={{ pb: { xs: 6, md: 8 } }}>
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>Demander une démo</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Laissez vos coordonnées, notre équipe vous contactera pour planifier une démonstration. Les comptes ne sont pas créés en libre-service.</Typography>
          {msg && <Typography color="text.secondary" sx={{ mb: 2 }}>{msg}</Typography>}
          <Stack spacing={2} component="form" onSubmit={onSubmitDemo}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Nom" value={name} onChange={e => setName(e.target.value)} required />
              <TextField label="Entreprise" value={company} onChange={e => setCompany(e.target.value)} required sx={{ flex: 1 }} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField type="email" label="Email" value={email} onChange={e => setEmail(e.target.value)} required sx={{ flex: 1 }} />
              <TextField label="Téléphone (optionnel)" value={phone} onChange={e => setPhone(e.target.value)} />
            </Stack>
            <TextField label="Message (optionnel)" value={message} onChange={e => setMessage(e.target.value)} multiline minRows={3} />
            <TextField label="Code parrain (optionnel)" value={referral} onChange={e => setReferral(e.target.value)} helperText={referralValid == null ? "" : referralValid.ok ? (referralValid.owner ? `Code valide (parrain: ${referralValid.owner})` : 'Code valide') : 'Code invalide'} error={referralValid != null && !referralValid.ok} />
            {/* Honeypot field (hidden from users, bots may fill) */}
            <TextField label="Site web" value={hp} onChange={e => setHp(e.target.value)} sx={{ position: 'absolute', left: -9999, top: -9999, width: 1, height: 1, opacity: 0 }} tabIndex={-1} aria-hidden="true" />
            {!!TURNSTILE_KEY && (
              <Box id="turnstile-container" sx={{ my: 1 }} />
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {TURNSTILE_KEY && !captchaToken && (
                <Typography variant="caption" color="text.secondary">Veuillez compléter la vérification avant d'envoyer.</Typography>
              )}
              <Button type="submit" onClick={() => trackEvent('demo_submit_click')} variant="contained" disabled={loading || (TURNSTILE_KEY && !captchaToken)} sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}>Envoyer</Button>
            </Box>
          </Stack>
        </Paper>
      </Container>

      <StickyDemoBar />
      <FloatingCTAs />
      <ConsentBanner />
      <FooterPublic />
    </>
  )
}
