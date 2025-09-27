import { Box, Button, useMediaQuery } from '@mui/material'
import { trackEvent } from '../utils/analytics'

export default function StickyDemoBar() {
  const isMobile = useMediaQuery('(max-width:600px)')
  if (!isMobile) return null
  return (
    <Box sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, bgcolor: '#111827', color: 'white', py: 1, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1300, boxShadow: '0 -2px 8px rgba(0,0,0,0.25)' }}>
      <Box sx={{ fontSize: 14 }}>Prêt à démarrer ?</Box>
      <Button size="small" variant="contained" onClick={() => { try { trackEvent('sticky_demo_click') } catch {}; const el = document.getElementById('demo'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>Demander une démo</Button>
    </Box>
  )
}
