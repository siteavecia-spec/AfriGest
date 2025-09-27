import { useEffect, useState } from 'react'
import { Alert, Box, Button, Snackbar } from '@mui/material'
import { setupOutboundLinkTracking } from '../analytics'

function initAnalytics() {
  try {
    const id = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID
    if (!id) return
    // Minimal GA4 setup
    ;(window as any).dataLayer = (window as any).dataLayer || []
    function gtag(){ (window as any).dataLayer.push(arguments) }
    ;(window as any).gtag = gtag
    gtag('js', new Date())
    gtag('config', id)
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    document.head.appendChild(s)
  } catch {}
}

export default function ConsentBanner() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    try {
      const id = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID
      if (!id) return
      const consent = localStorage.getItem('afrigest_consent')
      if (consent === 'granted') {
        initAnalytics()
        setupOutboundLinkTracking()
        return
      }
      if (consent !== 'denied') setOpen(true)
    } catch {}
  }, [])

  const accept = () => {
    try { localStorage.setItem('afrigest_consent', 'granted') } catch {}
    initAnalytics()
    setupOutboundLinkTracking()
    setOpen(false)
  }
  const decline = () => {
    try { localStorage.setItem('afrigest_consent', 'denied') } catch {}
    setOpen(false)
  }

  if (!open) return null
  return (
    <Snackbar open={open} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert severity="info" icon={false} sx={{ bgcolor: '#111827', color: 'white', '& .MuiAlert-action': { alignItems: 'center' } }}
        action={<Box>
          <Button size="small" onClick={accept} sx={{ color: '#059669' }}>Accepter</Button>
          <Button size="small" onClick={decline} sx={{ color: 'rgba(255,255,255,0.85)' }}>Refuser</Button>
        </Box>}>
        Nous utilisons des cookies pour mesurer l'audience et améliorer l'expérience. Aucune donnée sensible n'est collectée sans votre consentement.
      </Alert>
    </Snackbar>
  )
}
