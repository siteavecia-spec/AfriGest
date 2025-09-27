import React from 'react'
import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { trackEvent } from '../utils/analytics'

type Props = { children: React.ReactNode }

type State = { hasError: boolean }

export default class ErrorBoundary extends React.Component<Props, State> {
  private incidentId: string | null = null
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any, info: any) {
    try {
      // Build rich context for diagnostics
      const url = typeof window !== 'undefined' ? window.location.href : ''
      const route = typeof window !== 'undefined' ? window.location.pathname : ''
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
      const referrer = typeof document !== 'undefined' ? document.referrer : ''
      this.incidentId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      // Send to analytics (failsafe)
      try { trackEvent('ui_error', { error: String(error), info: String(info), url, route, userAgent, referrer, incidentId: this.incidentId }) } catch {}
      if (import.meta && (import.meta as any).env?.MODE === 'development') {
        // eslint-disable-next-line no-console
        console.error('[ErrorBoundary]', { error, info, url, route, userAgent, referrer, incidentId: this.incidentId })
      }
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ bgcolor: '#F9FAFB', minHeight: '50vh', py: { xs: 6, md: 10 } }}>
          <Container sx={{ textAlign: 'center' }}>
            <Typography variant="h5" fontWeight={800} gutterBottom>Un problème est survenu</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Veuillez recharger la page. Si le problème persiste, contactez le support.
            </Typography>
            {this.incidentId && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                ID d'incident: {this.incidentId}
              </Typography>
            )}
            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} justifyContent="center">
              <Button variant="contained" onClick={() => window.location.reload()} sx={{ bgcolor: '#1D4ED8', '&:hover': { bgcolor: '#1E40AF' } }}>Recharger</Button>
              <Button variant="outlined" onClick={() => { try { window.open('mailto:contact@afrigest.app?subject=Incident%20AfriGest&body=' + encodeURIComponent(`Bonjour,\n\nUn problème est survenu.\nID d'incident: ${this.incidentId || ''}\nURL: ${typeof window !== 'undefined' ? window.location.href : ''}\n`)) } catch {} }}>Contacter le support (Email)</Button>
              <Button variant="outlined" onClick={() => { try { window.open('https://wa.me/2250700000000?text=' + encodeURIComponent(`Incident AfriGest ${this.incidentId || ''} — ${typeof window !== 'undefined' ? window.location.href : ''}`),'_blank','noopener') } catch {} }}>WhatsApp</Button>
            </Stack>
          </Container>
        </Box>
      )
    }
    return this.props.children
  }
}
