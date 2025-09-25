import { AppBar, Box, Button, Container, IconButton, Menu, MenuItem, Toolbar, Typography, useMediaQuery, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Badge } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../store'
import { logout } from '../features/auth/slice'
import OfflineBanner from './OfflineBanner'
import { useEffect, useState } from 'react'
import { messagingConnect } from '../features/messaging/wsMiddleware'
import { showEcommerce, showMessaging } from '../config/featureFlags'
import { logoutApi } from '../api/client_clean'
import { getPendingSales, trySyncSales, getSyncErrors, clearSyncErrors } from '../offline/salesQueue'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const role = useSelector((s: RootState) => s.auth.role)
  const dispatch = useDispatch()
  const isDesktop = useMediaQuery('(min-width:900px)')
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [errorCount, setErrorCount] = useState<number>(0)
  const [syncing, setSyncing] = useState(false)
  const [openErrors, setOpenErrors] = useState(false)
  const [errors, setErrors] = useState<Array<{ offlineId: string; error: string; at: string }>>([])

  async function refreshSyncStatus() {
    try {
      const pend = await getPendingSales()
      setPendingCount((pend || []).length)
    } catch { setPendingCount(0) }
    try {
      const errs = getSyncErrors()
      setErrorCount((errs || []).length)
    } catch { setErrorCount(0) }
  }

  // lightweight polling and online event
  useEffect(() => {
    // connect messaging WS (only if messaging enabled)
    if (showMessaging) {
      try { (dispatch as any)(messagingConnect()) } catch {}
    }
    let timer: any
    refreshSyncStatus()
    timer = setInterval(refreshSyncStatus, 30000)
    const onOnline = () => refreshSyncStatus()
    window.addEventListener('online', onOnline)
    return () => { clearInterval(timer); window.removeEventListener('online', onOnline) }
  }, [])

  const go = (path: string) => () => navigate(path)
  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9FAFB' }}>
      <AppBar position="static" color="primary">
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>AfriGest</Typography>
          {isDesktop ? (
            <>
              <Button color={isActive('/dashboard') ? 'secondary' : 'inherit'} onClick={go('/dashboard')}>Dashboard</Button>
              <Button color={isActive('/pos') ? 'secondary' : 'inherit'} onClick={go('/pos')}>POS</Button>
              {showMessaging && (
                <>
                  <Button color={isActive('/messaging') ? 'secondary' : 'inherit'} onClick={go('/messaging')}>
                    <Badge color="error" overlap="circular" badgeContent={useSelector((s: RootState) => s.messaging?.unreadTotal || 0)}>
                      Messagerie
                    </Badge>
                  </Button>
                  <Button color={isActive('/messaging/presence') ? 'secondary' : 'inherit'} onClick={go('/messaging/presence')}>Présence</Button>
                </>
              )}
              {(role === 'super_admin' || role === 'pdg' || role === 'dg') && (
                <>
                  <Button color={isActive('/stock') ? 'secondary' : 'inherit'} onClick={go('/stock')}>Stock</Button>
                  <Button color={isActive('/suppliers') ? 'secondary' : 'inherit'} onClick={go('/suppliers')}>Fournisseurs</Button>
                  <Button color={isActive('/ambassador') ? 'secondary' : 'inherit'} onClick={go('/ambassador')}>Ambassadeur</Button>
                  <Button color={isActive('/users') ? 'secondary' : 'inherit'} onClick={go('/users')}>Utilisateurs</Button>
                  {/* Ecommerce (Overview/Products/Orders/Customers) */}
                  {showEcommerce && (
                    <>
                      <Button color={isActive('/ecommerce') ? 'secondary' : 'inherit'} onClick={go('/ecommerce')}>Boutique en ligne</Button>
                      <Button color={isActive('/ecommerce/products') ? 'secondary' : 'inherit'} onClick={go('/ecommerce/products')}>Produits</Button>
                      <Button color={isActive('/ecommerce/orders') ? 'secondary' : 'inherit'} onClick={go('/ecommerce/orders')}>Commandes</Button>
                      <Button color={isActive('/ecommerce/customers') ? 'secondary' : 'inherit'} onClick={go('/ecommerce/customers')}>Clients</Button>
                    </>
                  )}
                </>
              )}
              {(role === 'super_admin' || role === 'pdg') && (
                <>
                  <Button color={isActive('/settings') ? 'secondary' : 'inherit'} onClick={go('/settings')}>Paramètres</Button>
                  {/* Ecommerce Settings */}
                  {showEcommerce && (
                    <Button color={isActive('/ecommerce/settings') ? 'secondary' : 'inherit'} onClick={go('/ecommerce/settings')}>E‑commerce: Paramètres</Button>
                  )}
                </>
              )}
              {(role === 'super_admin') && (
                <>
                  <Button color={isActive('/leads') ? 'secondary' : 'inherit'} onClick={go('/leads')}>Leads</Button>
                  <Button color={isActive('/admin/password-reset') ? 'secondary' : 'inherit'} onClick={go('/admin/password-reset')}>Reset MDP (Admin)</Button>
                </>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ mr: 1 }} title="Ventes en attente / Erreurs de sync">Offline: {pendingCount} | Err: {errorCount}</Typography>
                <Button size="small" variant="outlined" onClick={async () => { setSyncing(true); try { await trySyncSales() } finally { setSyncing(false); refreshSyncStatus() } }} disabled={syncing}>Sync</Button>
                <Button size="small" variant="text" onClick={() => { clearSyncErrors(); refreshSyncStatus() }} disabled={errorCount === 0}>Effacer erreurs</Button>
                <Button size="small" variant="text" onClick={() => { setErrors(getSyncErrors()); setOpenErrors(true) }} disabled={errorCount === 0}>Voir détails</Button>
                <Button color="inherit" onClick={async () => { try { await logoutApi() } catch {} ; dispatch(logout()); localStorage.removeItem('afrigest_token'); localStorage.removeItem('afrigest_refresh'); localStorage.removeItem('afrigest_company'); navigate('/login') }}>Déconnexion</Button>
              </Box>
            </>
          ) : (
            <>
              <IconButton color="inherit" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="menu">
                <MenuIcon />
              </IconButton>
              <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                <MenuItem onClick={() => { navigate('/dashboard'); setMenuAnchor(null) }}>Dashboard</MenuItem>
                <MenuItem onClick={() => { navigate('/pos'); setMenuAnchor(null) }}>POS</MenuItem>
                {showMessaging && (
                  <>
                    <MenuItem onClick={() => { navigate('/messaging'); setMenuAnchor(null) }}>Messagerie</MenuItem>
                    <MenuItem onClick={() => { navigate('/messaging/presence'); setMenuAnchor(null) }}>Présence</MenuItem>
                  </>
                )}
                {(role === 'super_admin' || role === 'pdg' || role === 'dg') && (
                  <>
                    <MenuItem onClick={() => { navigate('/stock'); setMenuAnchor(null) }}>Stock</MenuItem>
                    <MenuItem onClick={() => { navigate('/suppliers'); setMenuAnchor(null) }}>Fournisseurs</MenuItem>
                    <MenuItem onClick={() => { navigate('/ambassador'); setMenuAnchor(null) }}>Ambassadeur</MenuItem>
                    <MenuItem onClick={() => { navigate('/users'); setMenuAnchor(null) }}>Utilisateurs</MenuItem>
                    {/* Ecommerce (Overview/Products/Orders/Customers) */}
                    {showEcommerce && (
                      <>
                        <MenuItem onClick={() => { navigate('/ecommerce'); setMenuAnchor(null) }}>Boutique en ligne</MenuItem>
                        <MenuItem onClick={() => { navigate('/ecommerce/products'); setMenuAnchor(null) }}>Produits</MenuItem>
                        <MenuItem onClick={() => { navigate('/ecommerce/orders'); setMenuAnchor(null) }}>Commandes</MenuItem>
                        <MenuItem onClick={() => { navigate('/ecommerce/customers'); setMenuAnchor(null) }}>Clients</MenuItem>
                      </>
                    )}
                  </>
                )}
                {(role === 'super_admin' || role === 'pdg') && (
                  <>
                    <MenuItem onClick={() => { navigate('/settings'); setMenuAnchor(null) }}>Paramètres</MenuItem>
                    {/* Ecommerce Settings */}
                    {showEcommerce && (
                      <MenuItem onClick={() => { navigate('/ecommerce/settings'); setMenuAnchor(null) }}>E‑commerce: Paramètres</MenuItem>
                    )}
                  </>
                )}
                {(role === 'super_admin') && (
                  <>
                    <MenuItem onClick={() => { navigate('/leads'); setMenuAnchor(null) }}>Leads</MenuItem>
                    <MenuItem onClick={() => { navigate('/admin/password-reset'); setMenuAnchor(null) }}>Reset MDP (Admin)</MenuItem>
                  </>
                )}
                {/* Offline controls (mobile) */}
                <MenuItem disabled>Offline: {pendingCount} | Err: {errorCount}</MenuItem>
                <MenuItem onClick={async () => { setMenuAnchor(null); setSyncing(true); try { await trySyncSales() } finally { setSyncing(false); refreshSyncStatus() } }}>Sync maintenant</MenuItem>
                <MenuItem disabled={errorCount === 0} onClick={() => { clearSyncErrors(); refreshSyncStatus(); setMenuAnchor(null) }}>Effacer erreurs</MenuItem>
                <MenuItem disabled={errorCount === 0} onClick={() => { setErrors(getSyncErrors()); setOpenErrors(true); setMenuAnchor(null) }}>Voir détails</MenuItem>
                <MenuItem onClick={async () => { setMenuAnchor(null); try { await logoutApi() } catch {}; dispatch(logout()); localStorage.removeItem('afrigest_token'); localStorage.removeItem('afrigest_refresh'); localStorage.removeItem('afrigest_company'); navigate('/login') }}>Déconnexion</MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>
      <OfflineBanner />
      <Container sx={{ py: 3 }}>
        <Outlet />
      </Container>
      <Dialog open={openErrors} onClose={() => setOpenErrors(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Erreurs de synchronisation</DialogTitle>
        <DialogContent dividers>
          {errors.length === 0 ? (
            <Typography color="text.secondary">Aucune erreur récente.</Typography>
          ) : (
            <List dense>
              {errors.slice().reverse().slice(0, 100).map((e, idx) => (
                <ListItem key={`${e.offlineId}-${idx}`} alignItems="flex-start">
                  <ListItemText
                    primary={`OfflineID: ${e.offlineId}`}
                    secondary={`${new Date(e.at).toLocaleString()} — ${e.error}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={async () => {
            setSyncing(true)
            try { await trySyncSales() } finally { setSyncing(false); refreshSyncStatus(); setErrors(getSyncErrors()) }
          }} disabled={syncing}>Réessayer</Button>
          <Button onClick={() => {
            try {
              const rows = getSyncErrors()
              const header = ['offlineId','error','at']
              const lines = rows.map(r => [r.offlineId, r.error.replace(/\n/g,' ').replace(/"/g,'""'), r.at])
              const csv = [header.join(','), ...lines.map(l => l.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(','))].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'sync_errors.csv'
              a.click()
              URL.revokeObjectURL(url)
            } catch {}
          }} disabled={errors.length === 0}>Exporter CSV</Button>
          <Button onClick={() => { clearSyncErrors(); setErrors([]); refreshSyncStatus() }} disabled={errors.length === 0}>Effacer</Button>
          <Button variant="contained" onClick={() => setOpenErrors(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
