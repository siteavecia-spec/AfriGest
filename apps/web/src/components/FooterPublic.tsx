import { Box, Container, Link, Stack, Typography, IconButton } from '@mui/material'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import XIcon from '@mui/icons-material/X'
import FacebookIcon from '@mui/icons-material/Facebook'
import YouTubeIcon from '@mui/icons-material/YouTube'

export default function FooterPublic() {
  return (
    <Box component="footer" sx={{ bgcolor: '#0B1221', color: 'rgba(255,255,255,0.9)', py: 4, mt: 6 }}>
      <Container>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Typography variant="body2">© {new Date().getFullYear()} AfriGest. Tous droits réservés.</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Link href="/legal" underline="hover" color="inherit">Mentions légales</Link>
            <Link href="/privacy" underline="hover" color="inherit">Confidentialité</Link>
            <Link href="/terms" underline="hover" color="inherit">Conditions</Link>
            <Link href="/security" underline="hover" color="inherit">Sécurité</Link>
            <Stack direction="row" spacing={1} sx={{ ml: 1 }}>
              <IconButton href="https://www.linkedin.com/company/afrigest" target="_blank" rel="noopener" aria-label="LinkedIn" size="small" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                <LinkedInIcon fontSize="small" />
              </IconButton>
              <IconButton href="https://x.com/afrigest" target="_blank" rel="noopener" aria-label="X" size="small" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                <XIcon fontSize="small" />
              </IconButton>
              <IconButton href="https://facebook.com/afrigest" target="_blank" rel="noopener" aria-label="Facebook" size="small" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                <FacebookIcon fontSize="small" />
              </IconButton>
              <IconButton href="https://youtube.com/@afrigest" target="_blank" rel="noopener" aria-label="YouTube" size="small" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                <YouTubeIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
