import { AppBar, Box, Button, IconButton, Toolbar, Typography, useMediaQuery, Menu, MenuItem } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { useState } from 'react'
import { trackEvent } from '../utils/analytics'

export default function PublicHeader() {
  const isDesktop = useMediaQuery('(min-width:900px)')
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)

  const navClick = (href: string, section?: string) => () => {
    try { trackEvent('nav_click', { href, section }) } catch {}
    if (href.startsWith('#')) {
      const el = document.querySelector(href)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.location.href = href
    }
    setMenuAnchor(null)
  }

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 2 }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
          <img src="/logo.svg" alt="AfriGest" height={28} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>AfriGest</Typography>
        </Box>
        {isDesktop ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button color="inherit" onClick={navClick('#features', 'features')}>Fonctionnalités</Button>
            <Button color="inherit" onClick={navClick('#pricing', 'pricing')}>Tarifs</Button>
            <Button color="inherit" onClick={navClick('#testimonials', 'testimonials')}>Témoignages</Button>
            <Button color="inherit" onClick={navClick('#partners', 'partners')}>Partenaires</Button>
            <Button color="inherit" onClick={navClick('#faq', 'faq')}>FAQ</Button>
            <Button color="inherit" onClick={navClick('#contact', 'contact')}>Contact</Button>
            <Button color="inherit" href="/security" onClick={() => trackEvent('nav_click', { href: '/security' })}>Sécurité</Button>
            <Button color="inherit" href="/shop" onClick={() => trackEvent('nav_click', { href: '/shop' })}>Boutique</Button>
            <Button variant="contained" onClick={navClick('#demo', 'demo_header')} sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>Demander une démo</Button>
            <Button variant="contained" href="/login" onClick={() => trackEvent('nav_click', { href: '/login' })} sx={{ bgcolor: '#1D4ED8', '&:hover': { bgcolor: '#1E40AF' } }}>Se connecter</Button>
          </Box>
        ) : (
          <>
            <IconButton color="inherit" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="menu">
              <MenuIcon />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
              <MenuItem onClick={navClick('#features', 'features')}>Fonctionnalités</MenuItem>
              <MenuItem onClick={navClick('#pricing', 'pricing')}>Tarifs</MenuItem>
              <MenuItem onClick={navClick('#testimonials', 'testimonials')}>Témoignages</MenuItem>
              <MenuItem onClick={navClick('#partners', 'partners')}>Partenaires</MenuItem>
              <MenuItem onClick={navClick('#faq', 'faq')}>FAQ</MenuItem>
              <MenuItem onClick={navClick('#contact', 'contact')}>Contact</MenuItem>
              <MenuItem onClick={() => { trackEvent('nav_click', { href: '/security' }); window.location.href = '/security'; setMenuAnchor(null) }}>Sécurité</MenuItem>
              <MenuItem onClick={() => { trackEvent('nav_click', { href: '/shop' }); window.location.href = '/shop'; setMenuAnchor(null) }}>Boutique</MenuItem>
              <MenuItem onClick={navClick('#demo', 'demo_header')}>Demander une démo</MenuItem>
              <MenuItem onClick={() => { trackEvent('nav_click', { href: '/login' }); window.location.href = '/login'; setMenuAnchor(null) }}>Se connecter</MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  )
}
