import { Box, Button, Container, Paper, Stack, TextField, Typography, ToggleButtonGroup, ToggleButton, Alert } from '@mui/material'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { forgotPassword, forgotPasswordSms, validateOtp } from '../api/client_clean'

export default function ForgotPassword() {
  const [method, setMethod] = useState<'email' | 'sms'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const navigate = useNavigate()

  // Load reCAPTCHA v3 script dynamically if a site key is configured
  useEffect(() => {
    const siteKey = (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY
    if (!siteKey) return
    const id = 'grecaptcha-v3'
    if (document.getElementById(id)) return
    const s = document.createElement('script')
    s.id = id
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
    s.async = true
    document.body.appendChild(s)
    return () => { try { document.body.removeChild(s) } catch {} }
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setLoading(true)
    try {
      if (method === 'email') {
        let captcha: string | undefined
        const siteKey = (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY
        const grecaptcha = (window as any).grecaptcha
        if (siteKey && grecaptcha && typeof grecaptcha.execute === 'function') {
          try {
            // Ensure grecaptcha is ready
            if (typeof grecaptcha.ready === 'function') {
              await new Promise<void>(resolve => grecaptcha.ready(() => resolve()))
            }
            captcha = await grecaptcha.execute(siteKey, { action: 'forgot_password' })
          } catch (_) {
            // ignore captcha errors, backend may require it if enabled
          }
        }
        await forgotPassword(email, captcha)
        setMsg("Si un compte existe pour cette adresse, un email vient d'être envoyé avec le lien de réinitialisation.")
      } else {
        // SMS flow
        let captcha: string | undefined
        const siteKey = (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY
        const grecaptcha = (window as any).grecaptcha
        if (siteKey && grecaptcha && typeof grecaptcha.execute === 'function') {
          try {
            if (typeof grecaptcha.ready === 'function') {
              await new Promise<void>(resolve => grecaptcha.ready(() => resolve()))
            }
            captcha = await grecaptcha.execute(siteKey, { action: 'forgot_password_sms' })
          } catch (_) {}
        }
        if (!otpSent) {
          await forgotPasswordSms(phone, captcha)
          setOtpSent(true)
          setMsg('Un code OTP vous a été envoyé par SMS (valide 10 minutes).')
        } else {
          const res = await validateOtp(phone, otp)
          // Navigate to reset page with token
          navigate(`/reset-password?token=${encodeURIComponent(res.token)}`)
        }
      }
    } catch (e: any) {
      setErr(e?.message || 'Échec de la demande')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={1} sx={{ p: 4, width: '100%' }}>
        <Stack spacing={3} component="form" onSubmit={onSubmit}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Réinitialiser mon mot de passe</Typography>
            <Typography color="text.secondary">Choisissez la méthode et saisissez vos informations</Typography>
          </Box>
          <ToggleButtonGroup value={method} exclusive onChange={(_e, v) => v && setMethod(v)}>
            <ToggleButton value="email">📧 Par email</ToggleButton>
            <ToggleButton value="sms" disabled>📱 Par SMS (bientôt)</ToggleButton>
          </ToggleButtonGroup>
          {method === 'email' ? (
            <TextField type="email" label="Votre adresse email" value={email} onChange={e => setEmail(e.target.value)} required />
          ) : (
            <TextField type="tel" label="Votre numéro de téléphone" value={phone} onChange={e => setPhone(e.target.value)} required />
          )}
          {err && <Alert severity="error">{err}</Alert>}
          {msg && <Alert severity="success">{msg}</Alert>}
          <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Envoi…' : 'Envoyer la demande'}</Button>
        </Stack>
      </Paper>
    </Container>
  )
}
