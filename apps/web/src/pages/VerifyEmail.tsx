import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Box, Button, CircularProgress, Container, Typography, Stack, TextField } from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { verifyEmail, resendVerificationEmail } from '../api/client_clean'

export default function VerifyEmail() {
  const [search] = useSearchParams()
  const token = search.get('token') || ''
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendMsg, setResendMsg] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)

  useEffect(() => {
    async function run() {
      if (!token) {
        setStatus('error')
        setMessage("Lien de vérification invalide: token manquant.")
        return
      }
      setStatus('loading')
      try {
        await verifyEmail(token)
        setStatus('success')
        setMessage("Adresse e-mail vérifiée avec succès. Vous pouvez maintenant vous connecter.")
      } catch (e: any) {
        setStatus('error')
        setMessage(e?.message || 'Le lien de vérification est invalide ou expiré.')
      }
    }
    run()
  }, [token])

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Box display="flex" flexDirection="column" alignItems="center" textAlign="center" gap={2}>
        <Typography variant="h4" fontWeight={700}>
          Vérification de l'e-mail
        </Typography>
        {status === 'loading' && (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            <CircularProgress />
            <Typography>Vérification en cours...</Typography>
          </Box>
        )}
        {status === 'success' && (
          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64 }} />
            <Typography>{message}</Typography>
            <Button variant="contained" component={Link} to="/login" sx={{ mt: 2 }}>
              Se connecter
            </Button>
          </Box>
        )}
        {status === 'error' && (
          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
            <ErrorOutlineIcon color="error" sx={{ fontSize: 64 }} />
            <Typography color="error">{message}</Typography>
            <Stack spacing={2} sx={{ mt: 2, width: '100%', maxWidth: 440 }}>
              <Typography variant="body2" color="text.secondary">Vous n'avez pas reçu l'e‑mail ou le lien est expiré ? Renseignez votre adresse pour recevoir un nouveau message.</Typography>
              <TextField type="email" label="Votre adresse e‑mail" value={resendEmail} onChange={e => setResendEmail(e.target.value)} fullWidth />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="center">
                <Button variant="contained" disabled={!resendEmail || resendLoading} onClick={async () => {
                  setResendMsg(null)
                  setResendLoading(true)
                  try {
                    await resendVerificationEmail(resendEmail)
                    setResendMsg("E‑mail de vérification renvoyé si le compte existe.")
                  } catch (e: any) {
                    setResendMsg(e?.message || "Impossible d'envoyer l'e‑mail de vérification")
                  } finally {
                    setResendLoading(false)
                  }
                }}>Renvoyer l'e‑mail</Button>
                <Button variant="outlined" component={Link} to="/">Retour à l'accueil</Button>
              </Stack>
              {resendMsg && <Typography variant="caption" color="text.secondary">{resendMsg}</Typography>}
            </Stack>
          </Box>
        )}
      </Box>
    </Container>
  )
}
