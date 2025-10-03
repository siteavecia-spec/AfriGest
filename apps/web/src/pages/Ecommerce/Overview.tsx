import { useEffect, useMemo, useState } from 'react'
import { Box, Card, CardContent, Grid, Typography, Stack, Button, TextField, MenuItem, Chip } from '@mui/material'
import { ecomListOrders, ecomGetOverview } from '../../api/client_clean'
import { useNavigate } from 'react-router-dom'

export default function EcommerceOverview() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kpis, setKpis] = useState<{ onlineSalesToday: number; onlineRevenueToday: number; conversionRate?: number } | null>(null)
  const [orders, setOrders] = useState<Array<{ id: string; total: number; currency: string; createdAt?: string; paymentStatus?: string }>>([])
  const [sectorFilter, setSectorFilter] = useState<'all'|'generic'|'electronics'|'fashion'>('all')
  const [from, setFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 6)
    return d.toISOString().slice(0,10)
  })
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [overview, setOverview] = useState<null | {
    periodTotals: { count: number; revenue: number; payments: Record<string, number>; averageOrderValue: number }
    dailySeries: Array<{ date: string; count: number; revenue: number }>
    topProducts: Array<{ sku: string; quantity: number; revenue: number }>
    paymentMix?: Record<string, number>
  }>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await ecomListOrders()
        const list = (res.items || []).map((o: any) => ({ id: o.id, total: Number(o.total || 0), currency: o.currency || 'GNF', createdAt: o.createdAt, paymentStatus: o.paymentStatus || 'pending', sector: (o as any).sector }))
        setOrders(list)
        // Load overview for default period
        const ov = await ecomGetOverview(from, to)
        setOverview({ periodTotals: ov.periodTotals, dailySeries: ov.dailySeries, topProducts: ov.topProducts, paymentMix: (ov as any).paymentMix })
        // Initial KPIs computed once (will also be recomputed via useMemo below)
        const start = new Date(); start.setHours(0,0,0,0)
        const end = new Date(); end.setHours(23,59,59,999)
        const today = list.filter(o => {
          const t = o.createdAt ? new Date(o.createdAt).getTime() : 0
          return t >= start.getTime() && t <= end.getTime()
        })
        setKpis({ onlineSalesToday: today.length, onlineRevenueToday: today.reduce((s, o) => s + (o.total || 0), 0), conversionRate: 0 })
      } catch (e: any) {
        setError(e?.message || 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    })()
    // Fetch once; KPIs below recomputed from orders + sectorFilter
  }, [])

  const todayKpis = useMemo(() => {
    try {
      const start = new Date(); start.setHours(0,0,0,0)
      const end = new Date(); end.setHours(23,59,59,999)
      const today = orders.filter((o: any) => {
        const t = o.createdAt ? new Date(o.createdAt).getTime() : 0
        const inDay = t >= start.getTime() && t <= end.getTime()
        const matchesSector = sectorFilter === 'all' ? true : (o.sector === sectorFilter)
        return inDay && matchesSector
      })
      const onlineSalesToday = today.length
      const onlineRevenueToday = today.reduce((s, o) => s + (o.total || 0), 0)
      return { onlineSalesToday, onlineRevenueToday }
    } catch {
      return { onlineSalesToday: 0, onlineRevenueToday: 0 }
    }
  }, [orders, sectorFilter])
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Boutique en ligne — Vue d’ensemble</Typography>
      {error && <Typography color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <TextField select size="small" label="Secteur" value={sectorFilter} onChange={e => setSectorFilter(e.target.value as any)} sx={{ minWidth: 180 }}>
          <MenuItem value="all">Tous</MenuItem>
          <MenuItem value="generic">Générique</MenuItem>
          <MenuItem value="electronics">Électronique</MenuItem>
          <MenuItem value="fashion">Mode</MenuItem>
        </TextField>
        <TextField size="small" type="date" label="Du" value={from} onChange={e => setFrom(e.target.value)} />
        <TextField size="small" type="date" label="Au" value={to} onChange={e => setTo(e.target.value)} />
        <Button size="small" variant="contained" onClick={async () => {
          try { setLoading(true); const ov = await ecomGetOverview(from, to); setOverview({ periodTotals: ov.periodTotals, dailySeries: ov.dailySeries, topProducts: ov.topProducts, paymentMix: (ov as any).paymentMix }) } catch (e:any) { setError(e?.message || 'Erreur KPIs'); } finally { setLoading(false) }
        }}>Actualiser KPIs</Button>
        <Button size="small" variant="outlined" onClick={() => navigate('/ecommerce/payments')}>Transactions</Button>
        <Button size="small" variant="outlined" onClick={() => {
          try {
            const header = ['id','total','currency','paymentStatus','createdAt']
            const esc = (v: any) => '"' + String(v ?? '').replace(/\"/g,'\"\"').replace(/\n/g,' ') + '"'
            const lines = orders.map(o => [o.id, String(o.total), o.currency, o.paymentStatus || 'pending', o.createdAt || ''])
            const csv = [header.join(','), ...lines.map(r => r.map(esc).join(','))].join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.download = 'ecommerce_orders_overview.csv'
            a.click(); URL.revokeObjectURL(url)
          } catch {}
        }}>Exporter commandes (CSV)</Button>
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Ventes en ligne (jour)</Typography>
              <Typography variant="h4">{loading ? '…' : todayKpis.onlineSalesToday}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">CA en ligne (jour)</Typography>
              <Typography variant="h4">{loading ? '…' : todayKpis.onlineRevenueToday.toLocaleString('fr-FR')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Ticket moyen (jour)</Typography>
              <Typography variant="h4">{(() => {
                const n = todayKpis.onlineSalesToday
                const rev = todayKpis.onlineRevenueToday
                const avg = n > 0 ? rev / n : 0
                return loading ? '…' : avg.toLocaleString('fr-FR')
              })()}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Ticket moyen (période)</Typography>
              <Typography variant="h4">{overview ? overview.periodTotals.averageOrderValue.toLocaleString('fr-FR') : '…'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Mix paiements (période)</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                {overview && overview.paymentMix && Object.keys(overview.paymentMix).length > 0 ? (
                  Object.entries(overview.paymentMix).map(([prov, amt]) => (
                    <Chip key={prov} label={`${prov}: ${(amt || 0).toLocaleString('fr-FR')}`} />
                  ))
                ) : (
                  <Typography color="text.secondary">Aucune transaction.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
