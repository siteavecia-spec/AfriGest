import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Grid, Typography } from '@mui/material'
import { getSalesSummary, getStockSummary, ecomGetSummary } from '../api/client_clean'
import { useNavigate } from 'react-router-dom'
import { msgGetPresence } from '../api/messaging'
import { showEcommerce } from '../config/featureFlags'

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [top, setTop] = useState<{ name?: string; sku?: string; quantity: number; total: number } | null>(null)
  const [lowAlerts, setLowAlerts] = useState(0)
  // Ecommerce KPIs (placeholders until wired to API)
  const [onlineCount, setOnlineCount] = useState(0)
  const [conversion, setConversion] = useState(0)
  const [onlineRevenue, setOnlineRevenue] = useState(0)
  const [onlinePaidCount, setOnlinePaidCount] = useState(0)
  const [onlineAOV, setOnlineAOV] = useState(0)
  const [presence, setPresence] = useState<Array<{ userId: string; status: 'online'|'idle'|'offline'; lastSeen: string }>>([])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const s = await getSalesSummary()
        setCount(s.today.count)
        setTotal(s.today.total)
        setTop(s.topProduct || null)
        // Low stock alerts (default boutique bq-1)
        const bq = 'bq-1'
        const summary = await getStockSummary(bq)
        let globalTh = 5
        try {
          const v = localStorage.getItem('afrigest_low_threshold')
          if (v) globalTh = Number(v)
        } catch {}
        let per: Record<string, number> = {}
        try {
          const raw = localStorage.getItem('afrigest_low_threshold_per')
          per = raw ? JSON.parse(raw) : {}
        } catch {}
        const n = summary.summary.filter(r => r.quantity <= (per[r.productId] ?? globalTh)).length
        setLowAlerts(n)
        try {
          const es = await ecomGetSummary()
          setOnlineCount(es.today.onlineCount || 0)
          setConversion(es.today.conversionRate || 0)
          setOnlineRevenue(Number(es.today.onlineRevenue || 0))
          setOnlinePaidCount(Number(es.today.paidCount || 0))
          setOnlineAOV(Number(es.today.averageOrderValuePaid || 0))
        } catch {}
      } catch (e: any) {
        setError(e?.message || 'Erreur chargement KPIs')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Presence polling (AfriTalk)
  useEffect(() => {
    let timer: any
    const loadPresence = async () => {
      try {
        const res = await msgGetPresence()
        setPresence(res.items || [])
      } catch {}
    }
    loadPresence()
    timer = setInterval(loadPresence, 30000)
    return () => { clearInterval(timer) }
  }, [])

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Tableau de bord</Typography>
      {error && <Typography color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Ventes du jour</Typography>
              <Typography variant="h4">{loading ? '…' : count}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Chiffre d'affaires (GNF)</Typography>
              <Typography variant="h4">{loading ? '…' : total.toLocaleString('fr-FR')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Top produit (Qté)</Typography>
              <Typography variant="h6">{top ? `${top.name || top.sku || 'Produit'} — ${top.quantity}` : (loading ? '…' : 'N/A')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Alertes stock faible</Typography>
              <Typography variant="h4">{loading ? '…' : lowAlerts}</Typography>
              <Box sx={{ mt: 1 }}>
                <Button size="small" variant="outlined" onClick={() => navigate('/stock')}>Voir le stock</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Ventes en ligne (jour)</Typography>
              <Typography variant="h4">{loading ? '…' : onlineCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">CA en ligne (jour)</Typography>
              <Typography variant="h4">{loading ? '…' : onlineRevenue.toLocaleString('fr-FR')} GNF</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Cmd en ligne payées (jour)</Typography>
              <Typography variant="h4">{loading ? '…' : onlinePaidCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Taux de conversion</Typography>
              <Typography variant="h4">{loading ? '…' : `${conversion.toFixed(2)}%`}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Panier moyen en ligne (jour)</Typography>
              <Typography variant="h4">{loading ? '…' : onlineAOV.toLocaleString('fr-FR')} GNF</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Présence (AfriTalk)</Typography>
              {presence.length === 0 ? (
                <Typography color="text.secondary">Aucun utilisateur connecté.</Typography>
              ) : (
                <Box sx={{ mt: 1 }}>
                  {presence.slice(0, 6).map(p => (
                    <Box key={`${p.userId}-${p.lastSeen}`} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{p.userId}</Typography>
                      <Typography variant="body2">{p.status === 'online' ? '🟢' : p.status === 'idle' ? '🟡' : '⚪'} {new Date(p.lastSeen).toLocaleTimeString()}</Typography>
                    </Box>
                  ))}
                  {presence.length > 6 && <Typography variant="caption" color="text.secondary">+ {presence.length - 6} autres…</Typography>}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
