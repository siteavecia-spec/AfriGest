import { Alert, Box, Button, Container, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { resetPasswordWithToken, validateResetToken } from '../api/client_clean'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

function calcStrength(pw: string) {
  let score = 0
  if (pw.length >= 8) score += 1
  if (/[A-Z]/.test(pw)) score += 1
  if (/[a-z]/.test(pw)) score += 1
  if (/\d/.test(pw)) score += 1
  if (/[^A-Za-z0-9]/.test(pw)) score += 1
  return (score / 5) * 100
}

export default function ResetPassword() {
  const q = useQuery()
  const token = q.get('token') || ''
  const [email, setEmail] = useState<string>('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        if (!token) throw new Error('Lien invalide')
        const res = await validateResetToken(token)
        if (active) setEmail(res.email)
      } catch (e: any) {
        if (active) setErr(e?.message || 'Lien invalide ou expiré')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [token])

  const strength = calcStrength(pw)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setOk(null)
    if (!token) { setErr('Lien invalide'); return }
    setSubmitting(true)
    try {
      await resetPasswordWithToken(token, pw, pw2)
      setOk('Votre mot de passe a été réinitialisé avec succès. Vous pouvez vous connecter.')
      setTimeout(() => navigate('/login'), 1500)
    } catch (e: any) {
      setErr(e?.message || 'Impossible de réinitialiser le mot de passe')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={1} sx={{ p: 4, width: '100%' }}>
        <Stack spacing={3} component="form" onSubmit={onSubmit}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Créer un nouveau mot de passe</Typography>
            <Typography color="text.secondary">{email ? `Compte: ${email}` : 'Vérification du lien…'}</Typography>
          </Box>
          {loading && <LinearProgress />}
          {!loading && (
            <>
              <TextField type="password" label="Nouveau mot de passe" value={pw} onChange={e => setPw(e.target.value)} required />
              <Box>
                <LinearProgress variant="determinate" value={strength} sx={{ height: 8, borderRadius: 1, mb: 1 }} />
                <Typography variant="caption" color="text.secondary">8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 spécial</Typography>
              </Box>
              <TextField type="password" label="Confirmer le mot de passe" value={pw2} onChange={e => setPw2(e.target.value)} required />
              {err && <Alert severity="error">{err}</Alert>}
              {ok && <Alert severity="success">{ok}</Alert>}
              <Button type="submit" variant="contained" disabled={submitting || loading}>{submitting ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}</Button>
            </>
          )}
        </Stack>
      </Paper>
    </Container>
  )
}
