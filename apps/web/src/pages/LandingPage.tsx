import { useEffect, useState } from 'react'
import { Box, Button, Container, Grid, Paper, Stack, TextField, Typography, Avatar } from '@mui/material'
import { createDemoRequestPublic, getTopClientsPublic, validateReferralPublic } from '../api/client_clean'

export default function LandingPage() {
  const [clients, setClients] = useState<Array<{ id: string; name: string; sector: string; logoUrl?: string }>>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // Demo form state
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [hp, setHp] = useState('') // honeypot
  const [referral, setReferral] = useState('')
  const [referralValid, setReferralValid] = useState<null | { ok: boolean; owner?: string | null }>(null)

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
    setLoading(true)
    setMsg(null)
    try {
      await createDemoRequestPublic({ name, company, email, phone: phone || undefined, message: message || undefined, referralCode: referral || undefined, honeypot: hp || undefined } as any)
      setMsg('Merci! Votre demande de démo a bien été envoyée. Nous vous recontacterons rapidement.')
      setName(''); setCompany(''); setEmail(''); setPhone(''); setMessage(''); setReferral(''); setReferralValid(null); setHp('')
    } catch (e: any) {
      setMsg(e?.message || 'Impossible d\'envoyer votre demande pour le moment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Box sx={{ bgcolor: '#0B1221', color: 'white', py: { xs: 6, md: 10 } }}>
        <Container>
          <Typography variant="h3" fontWeight={800}>AfriGest</Typography>
          <Typography variant="h6" color="rgba(255,255,255,0.8)" sx={{ mt: 1, maxWidth: 720 }}>
            La plateforme de gestion pour les commerces africains. Multi‑boutique, offline‑first, rapide et adaptée à chaque métier.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
            <Button href="/login" variant="contained" color="secondary">Se connecter</Button>
            <Button href="#demo" variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>Demander une démo</Button>
          </Stack>
        </Container>
      </Box>

      <Container sx={{ py: 6 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>Ils nous font confiance</Typography>
        <Grid container spacing={2}>
          {clients.map(c => (
            <Grid item xs={12} sm={6} md={4} key={c.id}>
              <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar variant="rounded" src={c.logoUrl} sx={{ width: 48, height: 48 }}>
                  {c.name.substring(0,1)}
                </Avatar>
                <Box>
                  <Typography fontWeight={600}>{c.name}</Typography>
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

      <Container id="demo" sx={{ pb: 8 }}>
        <Paper sx={{ p: 3 }}>
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
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="contained" disabled={loading}>Envoyer</Button>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </>
  )
}
