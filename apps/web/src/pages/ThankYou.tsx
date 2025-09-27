import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { useEffect } from 'react'
import { trackEvent } from '../utils/analytics'

export default function ThankYouPage() {
  const calendlyUrl = (import.meta as any).env?.VITE_CALENDLY_URL as string | undefined
  const openCalendlyWithUtm = () => {
    try { trackEvent('calendly_click', { location: 'thank_you' }) } catch {}
    let url = calendlyUrl!
    try {
      const utm = localStorage.getItem('afrigest_utm')
      if (utm) {
        const hasQuery = url.includes('?')
        url = `${url}${hasQuery ? '&' : '?'}utm=${encodeURIComponent(utm)}`
      }
    } catch {}
    window.open(url, '_blank', 'noopener')
  }
  useEffect(() => {
    try { trackEvent('thank_you_view') } catch {}
    if (calendlyUrl) {
      try { trackEvent('thank_you_calendly_visible') } catch {}
    }
  }, [])
  return (
    <Box sx={{ bgcolor: '#F9FAFB', py: { xs: 6, md: 10 }, textAlign: 'center' }}>
      <Container>
        <Typography variant="h4" fontWeight={800} gutterBottom>Merci pour votre demande de démo</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Notre équipe vous recontactera rapidement pour planifier une démonstration personnalisée.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          <Button href="/" variant="outlined">Retour à l’accueil</Button>
          {calendlyUrl ? (
            <Button onClick={openCalendlyWithUtm} variant="contained" sx={{ bgcolor: '#1D4ED8', '&:hover': { bgcolor: '#1E40AF' } }}>Planifier un appel</Button>
          ) : (
            <Button onClick={() => { try { trackEvent('whatsapp_click', { location: 'thank_you' }) } catch {}; window.open('https://wa.me/2250700000000', '_blank', 'noopener') }} variant="contained" sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>Parler sur WhatsApp</Button>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
