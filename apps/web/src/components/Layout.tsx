import { AppBar, Box, Button, Container, IconButton, Menu, MenuItem, Toolbar, Typography, useMediaQuery, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Badge, TextField, Alert, Stack, Chip } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../store'
import { logout } from '../features/auth/slice'
import OfflineBanner from './OfflineBanner'
import { useEffect, useState } from 'react'
import { messagingConnect } from '../features/messaging/wsMiddleware'
import { logoutApi, adminSupportToken } from '../api/client_clean'
import { useI18n } from '../i18n/i18n'
import { getPendingSales, trySyncSales, getSyncErrors, clearSyncErrors } from '../offline/salesQueue'
import { listPendingReceivings, trySyncReceivings } from '../offline/poQueue'
import { listPendingReturns, trySyncReturns } from '../offline/returnsQueue'
import { useBoutique } from '../context/BoutiqueContext'
import { can } from '../utils/acl'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const role = useSelector((s: RootState) => s.auth.role)
  const dispatch = useDispatch()
  const isDesktop = useMediaQuery('(min-width:900px)')
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [pendingRxCount, setPendingRxCount] = useState<number>(0)
  const [pendingRtCount, setPendingRtCount] = useState<number>(0)
  const [errorCount, setErrorCount] = useState<number>(0)
  const [syncing, setSyncing] = useState(false)
  const [openErrors, setOpenErrors] = useState(false)
  const [errors, setErrors] = useState<Array<{ offlineId: string; error: string; at: string }>>([])
  const { selectedBoutiqueId, setSelectedBoutiqueId, boutiques } = useBoutique()
  const [impersonating, setImpersonating] = useState(false)
  const [impersonateCompany, setImpersonateCompany] = useState<string | null>(null)
  const { locale, setLocale } = useI18n()
  const [companyKey, setCompanyKey] = useState<string | null>(null)
  const [openDebug, setOpenDebug] = useState(false)
  const [supportUntil, setSupportUntil] = useState<string | null>(null)
  // Permission-driven feature visibility
  const hasEcommerce = can(role as any, 'ecommerce.products', 'read') || can(role as any, 'ecommerce.orders', 'read') || can(role as any, 'ecommerce.settings', 'read')
  // Common permission flags for menu disable/tooltip
  const canDash = can(role as any, 'dashboard', 'read')
  const canPosRead = can(role as any, 'pos', 'read')
  const canStockRead = can(role as any, 'stock', 'read')
  const canSuppliersRead = can(role as any, 'suppliers', 'read')
  const canUsersRead = can(role as any, 'users', 'read')
  const hasMessaging = true // messaging access: no ACL defined yet, remove phase gating

  async function refreshSyncStatus() {
    try {
      const pend = await getPendingSales()
      setPendingCount((pend || []).length)
    } catch { setPendingCount(0) }
    try {
      const errs = getSyncErrors()
      setErrorCount((errs || []).length)
    } catch { setErrorCount(0) }
    try {
      const rx = await listPendingReceivings()
      setPendingRxCount((rx || []).length)
    } catch { setPendingRxCount(0) }
    try {
      const rt = await listPendingReturns()
      setPendingRtCount((rt || []).length)
    } catch { setPendingRtCount(0) }
  }

  // lightweight polling and online event
  useEffect(() => {
    // connect messaging WS (always, remove phase gating)
    {
      try { (dispatch as any)(messagingConnect()) } catch {}
    }
    let timer: any
    refreshSyncStatus()
    timer = setInterval(refreshSyncStatus, 30000)
    const onOnline = () => refreshSyncStatus()
    window.addEventListener('online', onOnline)
    return () => { clearInterval(timer); window.removeEventListener('online', onOnline) }
  }, [])

  // Detect impersonation (MVP): localStorage flags set by Admin/Companies "Impersonate"
  useEffect(() => {
    const load = () => {
      try {
        const flag = localStorage.getItem('afrigest_impersonate') === '1'
        const comp = localStorage.getItem('afrigest_impersonate_company') || null
        setImpersonating(flag)
        setImpersonateCompany(comp)
        const c = (localStorage.getItem('afrigest_company') || '').toLowerCase()
        setCompanyKey(c || null)
        const su = localStorage.getItem('afrigest_support_until') || null
        setSupportUntil(su)
      } catch {}
    }
    load()
    const onStorage = (e: StorageEvent) => { if (e.key?.startsWith('afrigest_')) load() }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const go = (path: string) => () => navigate(path)
  const isActive = (path: string) => location.pathname.startsWith(path)
  const isMasterContext = (role === 'super_admin') && !impersonating && (!companyKey || companyKey === 'master')

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9FAFB' }}>
      <AppBar position="sticky" color="primary">
        <Toolbar sx={{ gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <img src="/logo-afrigest.svg" alt="AfriGest" height={28} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>AfriGest</Typography>
            {role && (
              <Chip size="small" variant="outlined" label={`Rôle: ${role}`} sx={{ ml: 1, display: { xs: 'none', sm: 'inline-flex' } }} />
            )}
            {(companyKey !== null) && (
              <Chip size="small" variant="outlined" color="secondary" label={`Entreprise: ${companyKey || '—'}`} sx={{ ml: 1, display: { xs: 'none', sm: 'inline-flex' } }} />
            )}
            {!isMasterContext && selectedBoutiqueId && selectedBoutiqueId !== 'all' && (() => {
              const b = boutiques.find(b => b.id === selectedBoutiqueId)
              return b ? (
                <Chip size="small" variant="outlined" color="default" label={`Boutique: ${b.code ? `${b.code} — ` : ''}${b.name}`} sx={{ ml: 1, display: { xs: 'none', sm: 'inline-flex' } }} />
              ) : null
            })()}
          </Box>
          {/* Global boutique selector (hidden in super admin master context) */}
          {import.meta.env.MODE !== 'production' && (
            <Button size="small" variant="outlined" onClick={() => setOpenDebug(true)}>Debug rôle</Button>
          )}
          {!isMasterContext && (
            <TextField
              select
              size="small"
              label="Boutique"
              value={selectedBoutiqueId}
              onChange={(e) => setSelectedBoutiqueId(e.target.value)}
              sx={{ minWidth: 180, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1, mr: 1 }}
            >
              <MenuItem value="all">Toutes boutiques</MenuItem>
              {boutiques.map(b => (
                <MenuItem key={b.id} value={b.id}>{b.code ? `${b.code} — ` : ''}{b.name}</MenuItem>
              ))}
            </TextField>
          )}
          {isDesktop ? (
            <>
              {!isMasterContext && (
                <>
                  <Button color={isActive('/dashboard') ? 'secondary' : 'inherit'} onClick={go('/dashboard')} disabled={!canDash} title={!canDash ? 'Permission requise' : undefined}>Dashboard</Button>
                  <Button color={isActive('/pos') ? 'secondary' : 'inherit'} onClick={go('/pos')} disabled={!canPosRead} title={!canPosRead ? 'Permission requise' : undefined}>POS</Button>
                </>
              )}
              {isMasterContext && (
                <>
                  <Button color={isActive('/admin/console') ? 'secondary' : 'inherit'} onClick={go('/admin/console')}>Console</Button>
                  <Button color={isActive('/admin/companies') ? 'secondary' : 'inherit'} onClick={go('/admin/companies')}>Entreprises</Button>
                  <Button color={isActive('/leads') ? 'secondary' : 'inherit'} onClick={go('/leads')}>Leads</Button>
                  {/* Support activation (Admin) */}
                  <Button color="inherit" onClick={async () => {
                    try {
                      const json = await adminSupportToken({ hours: 4 })
                      localStorage.setItem('afrigest_support_until', json.support_until)
                      setSupportUntil(json.support_until)
                    } catch (e) { /* ignore */ }
                  }}>Activer Support (4h)</Button>
                </>
              )}
              {hasMessaging && (
                <>
                  <Button color={isActive('/messaging') ? 'secondary' : 'inherit'} onClick={go('/messaging')}>
                    <Badge color="error" overlap="circular" badgeContent={useSelector((s: RootState) => s.messaging?.unreadTotal || 0)}>
                      Messagerie
                    </Badge>
                  </Button>
                  <Button color={isActive('/messaging/presence') ? 'secondary' : 'inherit'} onClick={go('/messaging/presence')}>Présence</Button>
                </>
              )}
              {!isMasterContext && (
                <>
                  {/* Stock & Inventaire (show only if allowed) */}
                  <>
                    <Button color={isActive('/stock') ? 'secondary' : 'inherit'} onClick={go('/stock')} disabled={!canStockRead} title={!canStockRead ? 'Permission requise' : undefined}>Stock</Button>
                    <Button color={isActive('/inventory') ? 'secondary' : 'inherit'} onClick={go('/inventory')} disabled={!canStockRead} title={!canStockRead ? 'Permission requise' : undefined}>Inventaire</Button>
                    <Button color={isActive('/purchase-orders') ? 'secondary' : 'inherit'} onClick={go('/purchase-orders')} disabled={!canStockRead} title={!canStockRead ? 'Permission requise' : undefined}>Appro</Button>
                    <Button color={isActive('/receiving') ? 'secondary' : 'inherit'} onClick={go('/receiving')} disabled={!canStockRead} title={!canStockRead ? 'Permission requise' : undefined}>Réceptions</Button>
                  </>

                  {/* Fournisseurs */}
                  <Button color={isActive('/suppliers') ? 'secondary' : 'inherit'} onClick={go('/suppliers')} disabled={!canSuppliersRead} title={!canSuppliersRead ? 'Permission requise' : undefined}>Fournisseurs</Button>

                  {/* Ventes */}
                  <Button color={isActive('/sales') ? 'secondary' : 'inherit'} onClick={go('/sales')} disabled={!canPosRead} title={!canPosRead ? 'Permission requise' : undefined}>Ventes</Button>
                  {/* Retours */}
                  {can(role as any, 'returns', 'read') && (
                    <Button color={isActive('/returns') ? 'secondary' : 'inherit'} onClick={go('/returns')}>Retours</Button>
                  )}
                  {/* Clients */}
                  {can(role as any, 'customers', 'read') && (
                    <Button color={isActive('/customers') ? 'secondary' : 'inherit'} onClick={go('/customers')}>Clients</Button>
                  )}
                  {/* Ambassadeur (parrainage) visible Super Admin/PDG/DG */}
                  {(role === 'super_admin' || role === 'pdg' || role === 'dg') && (
                    <Button color={isActive('/ambassador') ? 'secondary' : 'inherit'} onClick={go('/ambassador')}>Ambassadeur</Button>
                  )}
                  {/* Utilisateurs: Super Admin & PDG */}
                  {(
                    <Button color={isActive('/users') ? 'secondary' : 'inherit'} onClick={go('/users')} disabled={!canUsersRead} title={!canUsersRead ? 'Permission requise' : undefined}>Utilisateurs</Button>
                  )}

                  {/* Ecommerce (visible si permissions) */}
                  {hasEcommerce && (
                    <>
                      <Button color={isActive('/ecommerce') ? 'secondary' : 'inherit'} onClick={go('/ecommerce')}>Boutique en ligne</Button>
                      {can(role as any, 'ecommerce.products', 'read') && (
                        <Button color={isActive('/ecommerce/products') ? 'secondary' : 'inherit'} onClick={go('/ecommerce/products')}>Produits</Button>
                      )}
                      {can(role as any, 'ecommerce.orders', 'read') && (
                        <Button color={isActive('/ecommerce/orders') ? 'secondary' : 'inherit'} onClick={go('/ecommerce/orders')}>Commandes</Button>
                      )}
                      {can(role as any, 'ecommerce.orders', 'read') && (
                        <Button color={isActive('/ecommerce/payments') ? 'secondary' : 'inherit'} onClick={go('/ecommerce/payments')}>Transactions</Button>
                      )}
                      <Button color={isActive('/ecommerce/customers') ? 'secondary' : 'inherit'} onClick={go('/ecommerce/customers')}>Clients</Button>
                    </>
                  )}
                </>
              )}
              {!isMasterContext && (
                <>
                  {can(role as any, 'settings', 'read') && (
                    <Button color={isActive('/settings') ? 'secondary' : 'inherit'} onClick={go('/settings')}>Paramètres</Button>
                  )}
                  {/* Ecommerce Settings */}
                  {can(role as any, 'ecommerce.settings', 'read') && (
                    <Button color={isActive('/ecommerce/settings') ? 'secondary' : 'inherit'} onClick={go('/ecommerce/settings')}>E‑commerce: Paramètres</Button>
                  )}
                  {/* Dev Tools (Phase 1 QA) */}
                  <Button color={isActive('/dev-tools') ? 'secondary' : 'inherit'} onClick={go('/dev-tools')}>Dev Tools</Button>
                </>
              )}
              {(role === 'super_admin' || role === 'pdg' || role === 'dg') && (
                <>
                  <Button color={isActive('/executive') ? 'secondary' : 'inherit'} onClick={go('/executive')}>Exécutif</Button>
                </>
              )}
              {(role === 'super_admin') && (
                <>
                  <Button color={isActive('/leads') ? 'secondary' : 'inherit'} onClick={go('/leads')}>Leads</Button>
                  <Button color={isActive('/admin/password-reset') ? 'secondary' : 'inherit'} onClick={go('/admin/password-reset')}>Reset MDP (Admin)</Button>
                  <Button color={isActive('/admin/companies') ? 'secondary' : 'inherit'} onClick={go('/admin/companies')}>Entreprises</Button>
                  <Button color={isActive('/admin/audit-log') ? 'secondary' : 'inherit'} onClick={go('/admin/audit-log')}>Audit</Button>
                </>
              )}
              {(role === 'super_admin' || role === 'support') && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ mr: 1 }} title="En attente (Ventes/Réceptions/Retours) / Erreurs de sync">En attente: {pendingCount + pendingRxCount + pendingRtCount} | Err: {errorCount}</Typography>
                  <Button size="small" variant="outlined" onClick={async () => { setSyncing(true); try { await trySyncSales(); await trySyncReceivings(); await trySyncReturns() } finally { setSyncing(false); refreshSyncStatus() } }} disabled={syncing}>Sync</Button>
                  <Button size="small" variant="text" onClick={() => { clearSyncErrors(); refreshSyncStatus() }} disabled={errorCount === 0}>Effacer erreurs</Button>
                  <Button size="small" variant="text" onClick={() => { setErrors(getSyncErrors()); setOpenErrors(true) }} disabled={errorCount === 0}>Voir détails</Button>
                  <Button color="inherit" onClick={async () => { try { await logoutApi() } catch {} ; dispatch(logout()); localStorage.removeItem('afrigest_token'); localStorage.removeItem('afrigest_refresh'); localStorage.removeItem('afrigest_company'); navigate('/login') }}>Déconnexion</Button>
                </Box>
              )}
              {!(role === 'super_admin' || role === 'support') && (
                <Box>
                  <Button color="inherit" onClick={async () => { try { await logoutApi() } catch {} ; dispatch(logout()); localStorage.removeItem('afrigest_token'); localStorage.removeItem('afrigest_refresh'); localStorage.removeItem('afrigest_company'); navigate('/login') }}>Déconnexion</Button>
                </Box>
              )}
            </>
          ) : (
            <>
              <IconButton color="inherit" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="menu">
                <MenuIcon />
              </IconButton>
              <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                {!isMasterContext && (
                  <>
                    <MenuItem disabled={!canDash} title={!canDash ? 'Permission requise' : undefined} onClick={() => { if (!canDash) return; navigate('/dashboard'); setMenuAnchor(null) }}>Dashboard</MenuItem>
                    <MenuItem disabled={!canPosRead} title={!canPosRead ? 'Permission requise' : undefined} onClick={() => { if (!canPosRead) return; navigate('/pos'); setMenuAnchor(null) }}>POS</MenuItem>
                  </>
                )}
                {isMasterContext && (
                  <>
                    <MenuItem onClick={() => { navigate('/admin/console'); setMenuAnchor(null) }}>Console</MenuItem>
                    <MenuItem onClick={() => { navigate('/admin/companies'); setMenuAnchor(null) }}>Entreprises</MenuItem>
                    <MenuItem onClick={() => { navigate('/leads'); setMenuAnchor(null) }}>Leads</MenuItem>
                  </>
                )}
                {hasMessaging && (
                  <>
                    <MenuItem onClick={() => { navigate('/messaging'); setMenuAnchor(null) }}>Messagerie</MenuItem>
                    <MenuItem onClick={() => { navigate('/messaging/presence'); setMenuAnchor(null) }}>Présence</MenuItem>
                  </>
                )}
                {!isMasterContext && (
                  <>
                    <>
                      <MenuItem disabled={!canStockRead} title={!canStockRead ? 'Permission requise' : undefined} onClick={() => { if (!canStockRead) return; navigate('/stock'); setMenuAnchor(null) }}>Stock</MenuItem>
                      <MenuItem disabled={!canStockRead} title={!canStockRead ? 'Permission requise' : undefined} onClick={() => { if (!canStockRead) return; navigate('/inventory'); setMenuAnchor(null) }}>Inventaire</MenuItem>
                      <MenuItem disabled={!canStockRead} title={!canStockRead ? 'Permission requise' : undefined} onClick={() => { if (!canStockRead) return; navigate('/purchase-orders'); setMenuAnchor(null) }}>Appro</MenuItem>
                      <MenuItem disabled={!canStockRead} title={!canStockRead ? 'Permission requise' : undefined} onClick={() => { if (!canStockRead) return; navigate('/receiving'); setMenuAnchor(null) }}>Réceptions</MenuItem>
                    </>
                    <MenuItem disabled={!canSuppliersRead} title={!canSuppliersRead ? 'Permission requise' : undefined} onClick={() => { if (!canSuppliersRead) return; navigate('/suppliers'); setMenuAnchor(null) }}>Fournisseurs</MenuItem>
                    <MenuItem disabled={!canPosRead} title={!canPosRead ? 'Permission requise' : undefined} onClick={() => { if (!canPosRead) return; navigate('/sales'); setMenuAnchor(null) }}>Ventes</MenuItem>
                    {can(role as any, 'returns', 'read') && (
                      <MenuItem onClick={() => { navigate('/returns'); setMenuAnchor(null) }}>Retours</MenuItem>
                    )}
                    {can(role as any, 'customers', 'read') && (
                      <MenuItem onClick={() => { navigate('/customers'); setMenuAnchor(null) }}>Clients</MenuItem>
                    )}
                    {(role === 'super_admin' || role === 'pdg' || role === 'dg') && (
                      <MenuItem onClick={() => { navigate('/ambassador'); setMenuAnchor(null) }}>Ambassadeur</MenuItem>
                    )}
                    <MenuItem disabled={!canUsersRead} title={!canUsersRead ? 'Permission requise' : undefined} onClick={() => { if (!canUsersRead) return; navigate('/users'); setMenuAnchor(null) }}>Utilisateurs</MenuItem>
                    {/* Ecommerce (Overview/Products/Orders/Customers) */}
                    {hasEcommerce && (
                      <>
                        <MenuItem onClick={() => { navigate('/ecommerce'); setMenuAnchor(null) }}>Boutique en ligne</MenuItem>
                        {can(role as any, 'ecommerce.products', 'read') && (
                          <MenuItem onClick={() => { navigate('/ecommerce/products'); setMenuAnchor(null) }}>Produits</MenuItem>
                        )}
                        {can(role as any, 'ecommerce.orders', 'read') && (
                          <MenuItem onClick={() => { navigate('/ecommerce/orders'); setMenuAnchor(null) }}>Commandes</MenuItem>
                        )}
                        {can(role as any, 'ecommerce.orders', 'read') && (
                          <MenuItem onClick={() => { navigate('/ecommerce/payments'); setMenuAnchor(null) }}>Transactions</MenuItem>
                        )}
                        <MenuItem onClick={() => { navigate('/ecommerce/customers'); setMenuAnchor(null) }}>Clients</MenuItem>
                      </>
                    )}
                    {(role === 'super_admin' || role === 'pdg' || role === 'dg') && (
                      <MenuItem onClick={() => { navigate('/executive'); setMenuAnchor(null) }}>Exécutif</MenuItem>
                    )}
                  </>
                )}
                {!isMasterContext && (
                  <>
                    {can(role as any, 'settings', 'read') && (
                      <MenuItem onClick={() => { navigate('/settings'); setMenuAnchor(null) }}>Paramètres</MenuItem>
                    )}
                    {/* Ecommerce Settings */}
                    {can(role as any, 'ecommerce.settings', 'read') && (
                      <MenuItem onClick={() => { navigate('/ecommerce/settings'); setMenuAnchor(null) }}>E‑commerce: Paramètres</MenuItem>
                    )}
                    {/* Dev Tools (Phase 1 QA) */}
                    <MenuItem onClick={() => { navigate('/dev-tools'); setMenuAnchor(null) }}>Dev Tools</MenuItem>
                  </>
                )}
                {(role === 'super_admin') && (
                  <>
                    <MenuItem onClick={() => { navigate('/leads'); setMenuAnchor(null) }}>Leads</MenuItem>
                    <MenuItem onClick={() => { navigate('/admin/password-reset'); setMenuAnchor(null) }}>Reset MDP (Admin)</MenuItem>
                    <MenuItem onClick={() => { navigate('/admin/companies'); setMenuAnchor(null) }}>Entreprises</MenuItem>
                    <MenuItem onClick={() => { navigate('/admin/audit-log'); setMenuAnchor(null) }}>Audit</MenuItem>
                  </>
                )}
                {/* Offline controls (mobile) */}
                {(role === 'super_admin' || role === 'support') && (
                  <>
                    <MenuItem disabled>En attente: {pendingCount + pendingRxCount + pendingRtCount} | Err: {errorCount}</MenuItem>
                    <MenuItem onClick={async () => { setMenuAnchor(null); setSyncing(true); try { await trySyncSales(); await trySyncReceivings(); await trySyncReturns() } finally { setSyncing(false); refreshSyncStatus() } }}>Sync maintenant</MenuItem>
                    <MenuItem disabled={errorCount === 0} onClick={() => { clearSyncErrors(); refreshSyncStatus(); setMenuAnchor(null) }}>Effacer erreurs</MenuItem>
                    <MenuItem disabled={errorCount === 0} onClick={() => { setErrors(getSyncErrors()); setOpenErrors(true); setMenuAnchor(null) }}>Voir détails</MenuItem>
                  </>
                )}
                <MenuItem onClick={async () => { setMenuAnchor(null); try { await logoutApi() } catch {}; dispatch(logout()); localStorage.removeItem('afrigest_token'); localStorage.removeItem('afrigest_refresh'); localStorage.removeItem('afrigest_company'); navigate('/login') }}>Déconnexion</MenuItem>
                <MenuItem>
                  <TextField select size="small" label="Lang" value={locale} onChange={e => setLocale(e.target.value as any)} sx={{ minWidth: 120 }}>
                    <MenuItem value="fr">FR</MenuItem>
                    <MenuItem value="en">EN</MenuItem>
                  </TextField>
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>
      {/* Impersonation banner */}
      {impersonating && (
        <Box sx={{ px: 2, pt: 1 }}>
          <Alert severity="warning" action={
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => {
                try {
                  localStorage.removeItem('afrigest_impersonate')
                  localStorage.removeItem('afrigest_impersonate_company')
                  // Optional: also clear company context
                  localStorage.removeItem('afrigest_company')
                } catch {}
                navigate('/admin/companies')
                setImpersonating(false)
                setImpersonateCompany(null)
              }}>Quitter</Button>
            </Stack>
          }>
            Mode support actif — Entreprise: {impersonateCompany || '—'}
          </Alert>
        </Box>
      )}
      {/* Support active banner */}
      {!!supportUntil && (
        <Box sx={{ px: 2 }}>
          <Alert severity="info" action={
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => {
                try { localStorage.removeItem('afrigest_support_until') } catch {}
                setSupportUntil(null)
              }}>Désactiver</Button>
            </Stack>
          }>
            Support technique actif jusqu'au: {new Date(supportUntil).toLocaleString()}
          </Alert>
        </Box>
      )}
      <OfflineBanner />
      <Container maxWidth="lg" sx={{ py: 3 }}>
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
              const csv = [header.join(','), ...lines.map(l => l.map(v => `"${String(v ?? '').replace(/\"/g,'""')}"`).join(','))].join('\n')
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
      {/* Debug role/permissions dialog (dev only) */}
      <Dialog open={openDebug} onClose={() => setOpenDebug(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Debug rôle & permissions</DialogTitle>
        <DialogContent dividers>
          <List dense>
            <ListItem><ListItemText primary={`Rôle: ${role || '—'}`} /></ListItem>
            <ListItem><ListItemText primary={`Entreprise: ${companyKey || '—'}`} /></ListItem>
            <ListItem><ListItemText primary={`Boutique: ${selectedBoutiqueId || '—'}`} /></ListItem>
          </List>
          <Typography variant="subtitle2" sx={{ mt: 2 }}>Permissions clés (can)</Typography>
          <List dense>
            <ListItem><ListItemText primary={`pos.read: ${can(role as any, 'pos', 'read')}`} /></ListItem>
            <ListItem><ListItemText primary={`pos.create: ${can(role as any, 'pos', 'create')}`} /></ListItem>
            <ListItem><ListItemText primary={`stock.read: ${can(role as any, 'stock', 'read')}`} /></ListItem>
            <ListItem><ListItemText primary={`stock.update: ${can(role as any, 'stock', 'update')}`} /></ListItem>
            <ListItem><ListItemText primary={`suppliers.read: ${can(role as any, 'suppliers', 'read')}`} /></ListItem>
            <ListItem><ListItemText primary={`returns.read: ${can(role as any, 'returns', 'read')}`} /></ListItem>
            <ListItem><ListItemText primary={`customers.read: ${can(role as any, 'customers', 'read')}`} /></ListItem>
            <ListItem><ListItemText primary={`ecommerce.orders.read: ${can(role as any, 'ecommerce.orders', 'read')}`} /></ListItem>
            <ListItem><ListItemText primary={`ecommerce.settings.read: ${can(role as any, 'ecommerce.settings', 'read')}`} /></ListItem>
          </List>
          <Typography variant="body2" color="text.secondary">Boutons visibles: Utilisateurs = {String(role === 'super_admin' || role === 'pdg')} | Ambassadeur = {String(role === 'super_admin' || role === 'pdg' || role === 'dg')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDebug(false)} variant="contained">Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
