import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Grid, Typography } from '@mui/material'
import { getSalesSummary, getStockSummary } from '../api/client_clean'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [top, setTop] = useState<{ name?: string; sku?: string; quantity: number; total: number } | null>(null)
  const [lowAlerts, setLowAlerts] = useState(0)

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
      } catch (e: any) {
        setError(e?.message || 'Erreur chargement KPIs')
      } finally {
        setLoading(false)
      }
    })()
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
      </Grid>
    </Box>
  )
}
