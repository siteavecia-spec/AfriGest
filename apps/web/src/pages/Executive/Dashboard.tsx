import { useEffect, useMemo, useState } from 'react'
import { Box, Card, CardContent, Grid, Stack, Typography, Button } from '@mui/material'
import Page from '../../components/Page'
import { ecomListOrders } from '../../api/client_clean'
import { getStockSummary } from '../../api/client_clean'
import { useBoutique } from '../../context/BoutiqueContext'

export default function ExecutiveDashboard() {
  const { selectedBoutiqueId } = useBoutique()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ordersToday, setOrdersToday] = useState(0)
  const [revenueToday, setRevenueToday] = useState(0)
  const [lowStockCount, setLowStockCount] = useState<number | null>(null)
  const [series, setSeries] = useState<Array<{ day: string; orders: number; revenue: number }>>([])
  const [posSeries, setPosSeries] = useState<Array<{ day: string; sales: number; revenue: number }>>([])
  const [posSalesToday, setPosSalesToday] = useState(0)
  const [posRevenueToday, setPosRevenueToday] = useState(0)
  const [ordersTodayList, setOrdersTodayList] = useState<Array<{ id: string; total: number; currency: string; createdAt?: string; paymentStatus?: string }>>([])
  const [deliveredToday, setDeliveredToday] = useState(0)
  const [returnRate7d, setReturnRate7d] = useState(0)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        // Orders KPIs (ecommerce only for now)
        const res = await ecomListOrders(200, 0)
        const list = (res.items || [])
        const start = new Date(); start.setHours(0,0,0,0)
        const end = new Date(); end.setHours(23,59,59,999)
        const today = list.filter((o: any) => {
          const t = o.createdAt ? new Date(o.createdAt).getTime() : 0
          return t >= start.getTime() && t <= end.getTime()
        })
        setOrdersToday(today.length)
        setRevenueToday(today.reduce((s: number, o: any) => s + Number(o.total || 0), 0))
        setOrdersTodayList(today.map((o: any) => ({ id: o.id, total: Number(o.total || 0), currency: o.currency || 'GNF', createdAt: o.createdAt, paymentStatus: o.paymentStatus || 'pending' })))

        // Advanced KPIs
        setDeliveredToday(today.filter((o: any) => (o.status || '').toLowerCase() === 'delivered').length)
        // 7d return rate = returned / delivered in last 7 days
        const start7 = new Date(); start7.setHours(0,0,0,0); start7.setDate(start7.getDate() - 6)
        const last7 = list.filter((o: any) => {
          const t = o.createdAt ? new Date(o.createdAt).getTime() : 0
          return t >= start7.getTime() && t <= end.getTime()
        })
        const delivered7 = last7.filter((o: any) => (o.status || '').toLowerCase() === 'delivered').length
        const returned7 = last7.filter((o: any) => (o.status || '').toLowerCase() === 'returned').length
        setReturnRate7d(delivered7 > 0 ? (returned7 / delivered7) * 100 : 0)

        // Build last 7 days series (client-side mock)
        const days: Array<{ date: Date; key: string }> = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setHours(0,0,0,0)
          d.setDate(d.getDate() - i)
          days.push({ date: d, key: d.toISOString().slice(0,10) })
        }
        const map: Record<string, { orders: number; revenue: number }> = {}
        days.forEach(d => { map[d.key] = { orders: 0, revenue: 0 } })
        list.forEach((o: any) => {
          if (!o.createdAt) return
          const k = new Date(o.createdAt).toISOString().slice(0,10)
          if (!map[k]) return
          map[k].orders += 1
          map[k].revenue += Number(o.total || 0)
        })
        const ecomSeries = days.map(d => ({ day: d.key, orders: map[d.key]?.orders || 0, revenue: map[d.key]?.revenue || 0 }))
        setSeries(ecomSeries)

        // POS (local audit-based estimate for today)
        try {
          const raw = localStorage.getItem('afrigest_audit')
          const arr: Array<{ action?: string; at?: string; details?: string }> = raw ? JSON.parse(raw) : []
          const startMs = start.getTime(); const endMs = end.getTime()
          const posToday = arr.filter(e => e.action === 'sale_create' && e.at && (() => { const t = new Date(e.at).getTime(); return t >= startMs && t <= endMs })())
          const count = posToday.length
          const sum = posToday.reduce((s, e) => {
            // details example: "total: 15000"
            const m = (e.details || '').match(/total:\s*(\d+(?:[.,]\d+)?)/i)
            const val = m ? Number(m[1].replace(',', '.')) : 0
            return s + (Number.isFinite(val) ? val : 0)
          }, 0)
          setPosSalesToday(count)
          setPosRevenueToday(sum)
          // Build POS 7-day series
          const posMap: Record<string, { sales: number; revenue: number }> = {}
          days.forEach(d => { posMap[d.key] = { sales: 0, revenue: 0 } })
          arr.forEach(e => {
            if (e.action !== 'sale_create' || !e.at) return
            const k = new Date(e.at).toISOString().slice(0,10)
            if (!posMap[k]) return
            posMap[k].sales += 1
            const m = (e.details || '').match(/total:\s*(\d+(?:[.,]\d+)?)/i)
            const val = m ? Number(m[1].replace(',', '.')) : 0
            posMap[k].revenue += Number.isFinite(val) ? val : 0
          })
          setPosSeries(days.map(d => ({ day: d.key, sales: posMap[d.key]?.sales || 0, revenue: posMap[d.key]?.revenue || 0 })))
        } catch {}
      } catch (e: any) {
        setOrdersToday(0); setRevenueToday(0)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const s = await getStockSummary(selectedBoutiqueId || 'all')
        const lows = (s.summary || []).filter((x: any) => (x.quantity || 0) <= 5)
        setLowStockCount(lows.length)
      } catch {
        setLowStockCount(null)
      }
    })()
  }, [selectedBoutiqueId])

  return (
    <Page title="Tableau de bord — Exécutif" subtitle="Vue synthétique PDG/DG">
      {error && <Typography color="text.secondary" sx={{ mb: 2 }}>{error}</Typography>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <Button size="small" variant="outlined" onClick={() => {
          try {
            const header = ['day','orders','revenue']
            const esc = (v: any) => '"' + String(v ?? '').replace(/"/g,'""') + '"'
            const lines = series.map(r => [r.day, String(r.orders), String(r.revenue)])
            const csv = [header.join(','), ...lines.map(r => r.map(esc).join(','))].join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'executive_kpis_7days.csv'
            a.click(); URL.revokeObjectURL(url)
          } catch {}
        }}>Exporter KPI (CSV)</Button>
        <Button size="small" variant="outlined" onClick={() => {
          try {
            const esc = (v: any) => '"' + String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ') + '"'
            const dateStr = new Date().toISOString().slice(0,10)
            const summary = [
              ['date', dateStr],
              ['ecom_orders_today', String(ordersToday)],
              ['ecom_revenue_today', String(revenueToday)],
              ['pos_sales_today', String(posSalesToday)],
              ['pos_revenue_today', String(posRevenueToday)]
            ].map(r => r.map(esc).join(',')).join('\n')
            const header = ['id','total','currency','paymentStatus','createdAt']
            const lines = ordersTodayList.map(o => [o.id, String(o.total), o.currency, o.paymentStatus || 'pending', o.createdAt || '']).map(r => r.map(esc).join(','))
            const csv = `${summary}\n\n${header.join(',')}\n${lines.join('\n')}`
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `executive_summary_${dateStr}.csv`
            a.click(); URL.revokeObjectURL(url)
          } catch {}
        }}>Exporter Synthèse (CSV)</Button>
        <Button size="small" variant="outlined" onClick={() => {
          try {
            const esc = (v: any) => '"' + String(v ?? '').replace(/"/g,'""') + '"'
            const header = ['day','ecom_orders','ecom_revenue','pos_sales','pos_revenue']
            // Merge series by day (assume aligned order)
            const map: Record<string, { eo: number; er: number; ps: number; pr: number }> = {}
            series.forEach(s => { map[s.day] = { eo: s.orders, er: s.revenue, ps: 0, pr: 0 } })
            posSeries.forEach(p => { const m = map[p.day] || { eo: 0, er: 0, ps: 0, pr: 0 }; m.ps = p.sales; m.pr = p.revenue; map[p.day] = m })
            const days = Object.keys(map).sort()
            const lines = days.map(d => [d, String(map[d].eo), String(map[d].er), String(map[d].ps), String(map[d].pr)].map(esc).join(','))
            const csv = [header.join(','), ...lines].join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'executive_combined_7days.csv'
            a.click(); URL.revokeObjectURL(url)
          } catch {}
        }}>Exporter combiné 7j (CSV)</Button>
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card><CardContent>
            <Typography variant="subtitle2" color="text.secondary">Commandes en ligne (jour)</Typography>
            <Typography variant="h4">{loading ? '…' : ordersToday}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card><CardContent>
            <Typography variant="subtitle2" color="text.secondary">CA en ligne (jour)</Typography>
            <Typography variant="h4">{loading ? '…' : revenueToday.toLocaleString('fr-FR')}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card><CardContent>
            <Typography variant="subtitle2" color="text.secondary">Ventes POS (jour)</Typography>
            <Typography variant="h6" sx={{ mb: 0.5 }}>{loading ? '…' : `${posSalesToday} vente(s)`}</Typography>
            <Typography color="text.secondary">{posRevenueToday.toLocaleString('fr-FR')}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card><CardContent>
            <Typography variant="subtitle2" color="text.secondary">Commandes livrées (jour)</Typography>
            <Typography variant="h4">{deliveredToday}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card><CardContent>
            <Typography variant="subtitle2" color="text.secondary">Taux de retour (7j)</Typography>
            <Typography variant="h4">{returnRate7d.toFixed(1)}%</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card><CardContent>
            <Typography variant="subtitle2" color="text.secondary">Alertes stock (≤ 5)</Typography>
            <Typography variant="h4">{lowStockCount == null ? '—' : lowStockCount}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12}>
          <Card><CardContent>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Actions rapides</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" href="/ecommerce/orders">Voir commandes e‑commerce</Button>
              <Button variant="outlined" href="/pos">POS</Button>
              <Button variant="outlined" href="/stock">Stock</Button>
              <Button variant="outlined" href="/tasks">Tâches</Button>
            </Stack>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Revenu 7 jours (mock)</Typography>
              <Box sx={{ width: '100%', height: 100 }}>
                {series.length > 0 ? (
                  <svg viewBox={`0 0 700 100`} width="100%" height="100%">
                    {(() => {
                      const max = useMemo(() => Math.max(1, ...series.map(s => s.revenue)), [series])
                      const pts = useMemo(() => series.map((s, i) => {
                        const x = (i / 6) * 680 + 10
                        const y = 90 - (s.revenue / max) * 80
                        return `${x},${y}`
                      }).join(' '), [series, max])
                      const circles = useMemo(() => series.map((s, i) => {
                        const x = (i / 6) * 680 + 10
                        const y = 90 - (s.revenue / Math.max(1, max)) * 80
                        return { x, y, k: s.day }
                      }), [series, max])
                      return (
                        <>
                          <polyline fill="none" stroke="#1976d2" strokeWidth="2" points={pts} />
                          {circles.map(c => (
                            <circle key={c.k} cx={c.x} cy={c.y} r={3} fill="#1976d2" />
                          ))}
                        </>
                      )
                    })()}
                  </svg>
                ) : (
                  <Typography color="text.secondary">Aucune donnée récente.</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Page>
  )
}
