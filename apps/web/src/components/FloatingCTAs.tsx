import { Box, Fab, Stack, Tooltip } from '@mui/material'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { trackEvent } from '../utils/analytics'
import { getWhatsAppHref } from '../utils/contact'

export default function FloatingCTAs() {
  const goDemo = () => {
    try { trackEvent('floating_cta_click', { target: 'demo' }) } catch {}
    const el = document.getElementById('demo')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const goWhatsApp = () => {
    try { trackEvent('floating_cta_click', { target: 'whatsapp' }) } catch {}
    window.open(getWhatsAppHref(), '_blank', 'noopener')
  }

  return (
    <Box sx={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1300 }}>
      <Stack spacing={1} alignItems="flex-end">
        <Tooltip title="Parler à un expert (WhatsApp)">
          <Fab color="success" size="medium" onClick={goWhatsApp} aria-label="WhatsApp">
            <WhatsAppIcon />
          </Fab>
        </Tooltip>
        <Tooltip title="Aller à la démo">
          <Fab color="primary" size="medium" onClick={goDemo} aria-label="Aller à la démo">
            <ArrowDownwardIcon />
          </Fab>
        </Tooltip>
      </Stack>
    </Box>
  )
}
