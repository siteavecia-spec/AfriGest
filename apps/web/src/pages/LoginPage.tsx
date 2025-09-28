import { Box, Button, Container, Paper, Stack, TextField, Typography, Grid, InputAdornment, IconButton, Divider, Alert, Checkbox, FormControlLabel } from '@mui/material'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { setCredentials } from '../features/auth/slice'
import { login, resendVerificationEmail } from '../api/client_clean'
import BusinessIcon from '@mui/icons-material/Business'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { CircularProgress, Link as MuiLink } from '@mui/material'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resendMsg, setResendMsg] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await login({ email, password, company })
      // Persist for API calls and protected routing
      localStorage.setItem('afrigest_token', res.accessToken)
      localStorage.setItem('afrigest_refresh', res.refreshToken)
      const companyKey = (company || '').toLowerCase()
      if (companyKey === 'master') {
        // Master context: do not set tenant company/email; route to admin console
        try { localStorage.removeItem('afrigest_company') } catch {}
        try { localStorage.removeItem('afrigest_email') } catch {}
        dispatch(setCredentials({ token: res.accessToken, role: res.role }))
        navigate('/admin/companies')
        return
      }
      if (remember) {
        localStorage.setItem('afrigest_company', company)
        localStorage.setItem('afrigest_email', email)
      } else {
        try { localStorage.removeItem('afrigest_company') } catch {}
        try { localStorage.removeItem('afrigest_email') } catch {}
      }
      dispatch(setCredentials({ token: res.accessToken, role: res.role }))
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Échec de connexion')
    } finally {
      setLoading(false)
    }
  }

  // Prefill from localStorage for convenience
  useEffect(() => {
    try {
      const savedCompany = localStorage.getItem('afrigest_company') || ''
      const savedEmail = localStorage.getItem('afrigest_email') || ''
      if (savedCompany) setCompany(savedCompany)
      if (savedEmail) setEmail(savedEmail)
    } catch {}
  }, [])

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'stretch', background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)' }}>
      <Container maxWidth="md" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ height: '100%', p: { xs: 3, md: 5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box sx={{ mb: 2 }}>
                <img src="/logo-afrigest.svg" alt="AfriGest" style={{ height: 48 }} />
              </Box>
              <Typography variant="h3" fontWeight={800} color="primary" gutterBottom>
                Bienvenue
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                La gestion moderne, simple et accessible
              </Typography>
              <Divider sx={{ my: 3, maxWidth: 240 }} />
              <Typography variant="body1" color="text.secondary">
                Connectez-vous pour accéder à votre tableau de bord, vos ventes, votre stock et votre e‑commerce.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
              <Stack spacing={2.5} component="form" onSubmit={onSubmit}>
                <Box>
                  <Typography variant="h5" fontWeight={700}>Connexion</Typography>
                  <Typography variant="body2" color="text.secondary">Veuillez renseigner vos identifiants</Typography>
                </Box>
                <TextField
                  label="Entreprise (Code/Subdomaine)"
                  placeholder="ex: demo"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  required
                  autoComplete="organization"
                  InputProps={{ startAdornment: (
                    <InputAdornment position="start"><BusinessIcon color="action" /></InputAdornment>
                  ) }}
                  helperText="Saisissez le code de votre entreprise. Pour tester: demo"
                />
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  InputProps={{ startAdornment: (
                    <InputAdornment position="start"><EmailIcon color="action" /></InputAdornment>
                  ) }}
                  helperText="Votre adresse professionnelle"
                />
                <TextField
                  label="Mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><LockIcon color="action" /></InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton aria-label="afficher le mot de passe" onClick={() => setShowPassword(v => !v)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  helperText="Au moins 8 caractères recommandés"
                />
                {error && <Alert severity="error" variant="outlined">{error}</Alert>}
                {resendMsg && <Alert severity="info" variant="outlined">{resendMsg}</Alert>}

                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <FormControlLabel control={<Checkbox checked={remember} onChange={(_, c) => setRemember(c)} />} label="Se souvenir de moi" />
                  <MuiLink component={RouterLink} to="/forgot-password" underline="hover" variant="body2">
                    Mot de passe oublié ?
                  </MuiLink>
                </Stack>

                <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ py: 1.2 }} disableElevation>
                  {loading ? (<><CircularProgress size={20} sx={{ mr: 1 }} /> Connexion…</>) : 'Se connecter'}
                </Button>
                <Stack direction="row" justifyContent="flex-end" alignItems="center">
                  <Button variant="text" size="small" disabled={!email || resendLoading} onClick={async () => {
                    setResendMsg(null)
                    if (!email) return
                    setResendLoading(true)
                    try {
                      await resendVerificationEmail(email)
                      setResendMsg("E‑mail de vérification renvoyé si le compte existe.")
                    } catch (e: any) {
                      setResendMsg(e?.message || "Impossible d'envoyer l'e‑mail de vérification")
                    } finally {
                      setResendLoading(false)
                    }
                  }}>Renvoyer l'e‑mail</Button>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Besoin d’aide ? Contactez le support ou votre administrateur.
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
