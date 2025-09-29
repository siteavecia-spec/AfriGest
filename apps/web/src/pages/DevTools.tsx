import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Grid, Stack, Typography, Alert, TextField, MenuItem } from '@mui/material'
import { devSeedBasic, devSeedSales, devGetStatus } from '../api/client_clean'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../store'
import { setCredentials } from '../features/auth/slice'

export default function DevToolsPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ products: number; suppliers: number; sales: number; stockAudits: number; lowAlerts: number } | null>(null)
  const [seeds, setSeeds] = useState<{ basicAt: string | null; salesAt: string | null } | null>(null)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const currentRole = useSelector((s: RootState) => s.auth.role) as 'super_admin'|'pdg'|'dg'|'employee'|null
  const [devRole, setDevRole] = useState<'super_admin'|'pdg'|'dg'|'employee'>(currentRole || 'employee')

  async function run(action: 'basic' | 'sales') {
    setMessage(null)
    setError(null)
    setBusy(true)
    try {
      if (action === 'basic') {
        const res = await devSeedBasic()
        setMessage(`Basic seed: OK. Stocks appliqués: ${res.applied.length}`)
      } else {
        const res = await devSeedSales()
        setMessage(`Sales seed: OK. Ventes créées: ${res.created.length}`)
      }
      await refresh()
    } catch (e: any) {
      setError(e?.message || 'Action échouée')
    } finally {
      setBusy(false)
    }
  }

  async function refresh() {
    setError(null)
    try {
      const s = await devGetStatus()
      setStatus(s.counts)
      setSeeds(s.seeds)
    } catch (e: any) {
      setError(e?.message || 'Impossible de charger le statut')
    }
  }

  useEffect(() => { refresh() }, [])

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Dev Tools (Phase 1 QA)</Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="outlined" disabled={busy} onClick={() => run('basic')}>Seed: Produits/Stock/Fournisseur</Button>
            <Button variant="outlined" disabled={busy} onClick={() => run('sales')}>Seed: Ventes du jour</Button>
            <Button disabled={busy} onClick={refresh}>Rafraîchir statut</Button>
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Ces actions nécessitent un compte PDG ou Super Admin et utiliseront votre tenant courant (header x-company).
          </Typography>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined"><CardContent>
                <Typography variant="subtitle2" color="text.secondary">Produits</Typography>
                <Typography variant="h5">{status ? status.products : '…'}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined"><CardContent>
                <Typography variant="subtitle2" color="text.secondary">Fournisseurs</Typography>
                <Typography variant="h5">{status ? status.suppliers : '…'}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined"><CardContent>
                <Typography variant="subtitle2" color="text.secondary">Ventes (total)</Typography>
                <Typography variant="h5">{status ? status.sales : '…'}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined"><CardContent>
                <Typography variant="subtitle2" color="text.secondary">Audits de stock</Typography>
                <Typography variant="h5">{status ? status.stockAudits : '…'}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card variant="outlined"><CardContent>
                <Typography variant="subtitle2" color="text.secondary">Alertes stock (bq-1)</Typography>
                <Typography variant="h5">{status ? status.lowAlerts : '…'}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined"><CardContent>
                <Typography variant="subtitle2" color="text.secondary">Dernier seed: Produits/Stock/Fournisseur</Typography>
                <Typography variant="body2">{seeds?.basicAt ? new Date(seeds.basicAt).toLocaleString() : '—'}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined"><CardContent>
                <Typography variant="subtitle2" color="text.secondary">Dernier seed: Ventes du jour</Typography>
                <Typography variant="body2">{seeds?.salesAt ? new Date(seeds.salesAt).toLocaleString() : '—'}</Typography>
              </CardContent></Card>
            </Grid>
          </Grid>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <Button size="small" variant="text" onClick={() => navigate('/dashboard')}>Aller au Dashboard</Button>
            <Button size="small" variant="text" onClick={() => navigate('/stock')}>Aller au Stock</Button>
            <Button size="small" variant="text" onClick={() => navigate('/pos')}>Aller au POS</Button>
            <Button size="small" variant="text" onClick={() => navigate('/suppliers')}>Aller aux Fournisseurs</Button>
          </Stack>
          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Test local — Sélecteur de rôle (sans BDD)</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                <TextField select size="small" label="Rôle (dev)" value={devRole} onChange={e => setDevRole(e.target.value as any)} sx={{ minWidth: 220 }}>
                  <MenuItem value="super_admin">Super Admin</MenuItem>
                  <MenuItem value="pdg">PDG</MenuItem>
                  <MenuItem value="dg">DG</MenuItem>
                  <MenuItem value="employee">Employé</MenuItem>
                </TextField>
                <Button variant="outlined" onClick={() => {
                  try {
                    localStorage.setItem('afrigest_token', 'dev')
                    dispatch(setCredentials({ token: 'dev', role: devRole }))
                    setMessage(`Rôle courant défini: ${devRole}`)
                  } catch (e: any) {
                    setError(e?.message || 'Impossible de définir le rôle dev')
                  }
                }}>Appliquer</Button>
                <Typography variant="body2" color="text.secondary">Rôle actuel: {currentRole || '—'}</Typography>
              </Stack>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </Box>
  )
}
