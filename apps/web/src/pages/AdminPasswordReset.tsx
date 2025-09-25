import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { forcePasswordReset } from '../api/client_clean'

export default function AdminPasswordReset() {
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setOk(null)
    setErr(null)
    setLoading(true)
    try {
      await forcePasswordReset(email, reason)
      setOk("Demande envoyée. Un email de réinitialisation a été transmis à l'utilisateur.")
      setEmail(''); setReason('')
    } catch (e: any) {
      setErr(e?.message || 'Échec de la réinitialisation forcée')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Stack spacing={3} component="form" onSubmit={onSubmit}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Réinitialisation de mot de passe (Admin)</Typography>
            <Typography color="text.secondary">Super Admin uniquement</Typography>
          </Box>
          <TextField type="email" label="Email de l'utilisateur" value={email} onChange={e => setEmail(e.target.value)} required />
          <TextField label="Raison" value={reason} onChange={e => setReason(e.target.value)} required multiline minRows={3} />
          {err && <Alert severity="error">{err}</Alert>}
          {ok && <Alert severity="success">{ok}</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Envoi…' : 'Forcer la réinitialisation'}</Button>
          </Box>
        </Stack>
      </Paper>
    </Container>
  )
}
