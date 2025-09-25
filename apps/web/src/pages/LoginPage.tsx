import { Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { setCredentials } from '../features/auth/slice'
import { login, resendVerificationEmail } from '../api/client_clean'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resendMsg, setResendMsg] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [loading, setLoading] = useState(false)
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
      localStorage.setItem('afrigest_company', company)
      localStorage.setItem('afrigest_email', email)
      dispatch(setCredentials({ token: res.accessToken, role: res.role }))
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Échec de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={1} sx={{ p: 4, width: '100%' }}>
        <Stack spacing={3} component="form" onSubmit={onSubmit}>
          <Box>
            <Typography variant="h4" color="primary" fontWeight={700}>AfriGest</Typography>
            <Typography color="text.secondary">La gestion moderne, simple et accessible</Typography>
          </Box>
          <TextField label="Entreprise (Code/Subdomaine)" value={company} onChange={e => setCompany(e.target.value)} required />
          <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <TextField label="Mot de passe" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <Typography color="error" variant="body2">{error}</Typography>}
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2">
              <a href="/forgot-password">Mot de passe oublié ?</a>
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="body2" color="text.secondary">
              Adresse non vérifiée ?
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
              }}>Renvoyer l'e‑mail de vérification</Button>
            </Typography>
            {resendMsg && <Typography variant="caption" color="text.secondary">{resendMsg}</Typography>}
          </Box>
        </Stack>
      </Paper>
    </Container>
  )
}
