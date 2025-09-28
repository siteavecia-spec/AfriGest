import { useEffect, useState } from 'react'
import { Box, Button, Grid, Typography, TextField } from '@mui/material'
import { getSalesSummary, getStockSummary, ecomGetSummary, listSales, sendAlertsDigest, API_URL, ecomGetOverview } from '../api/client_clean'
import { loadCompanySettings } from '../utils/settings'
import { useNavigate } from 'react-router-dom'
import { msgGetPresence } from '../api/messaging'
import { showEcommerce } from '../config/featureFlags'
import { useBoutique } from '../context/BoutiqueContext'
import ErrorBanner from '../components/ErrorBanner'
import { useI18n } from '../i18n/i18n'
import Page from '../components/Page'
import KpiCard from '../components/KpiCard'

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { selectedBoutiqueId } = useBoutique()
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
  const [topProducts, setTopProducts] = useState<Array<{ sku: string; quantity: number; revenue: number }>>([])
  const currency = (loadCompanySettings().currency || 'XOF')
  const [digestMsg, setDigestMsg] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await getSalesSummary(selectedBoutiqueId)
      setCount(s.today.count)
      setTotal(s.today.total)
      setTop(s.topProduct || null)
      // Low stock alerts (selected boutique)
      const summary = await getStockSummary(selectedBoutiqueId)
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
      // Only attempt e-commerce KPIs if the module is enabled (Phase 4+)
      if (showEcommerce) {
        try {
          const es = await ecomGetSummary()
          setOnlineCount(es.today.onlineCount || 0)
          setConversion(es.today.conversionRate || 0)
          setOnlineRevenue(Number(es.today.onlineRevenue || 0))
          setOnlinePaidCount(Number(es.today.paidCount || 0))
          setOnlineAOV(Number(es.today.averageOrderValuePaid || 0))
          try { setTopProducts((es.today as any).topProducts || []) } catch {}
        } catch {}
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement KPIs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // re-run when boutique changes
  }, [selectedBoutiqueId])

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
    <Page title={t('nav.dashboard') || 'Dashboard'}>
      {error && <ErrorBanner message={error} onRetry={fetchAll} />}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <KpiCard title="Ventes du jour" value={loading ? undefined : count} loading={loading} />
        </Grid>
        <Grid item xs={12} md={4}>
          <KpiCard title={`Chiffre d'affaires (${currency})`} value={loading ? undefined : total.toLocaleString('fr-FR')} loading={loading} />
        </Grid>
        <Grid item xs={12} md={4}>
          <KpiCard title="Top produit (Qté)" value={loading ? undefined : (top ? `${top.name || top.sku || 'Produit'} — ${top.quantity}` : 'N/A')} loading={loading} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Alertes stock faible</Typography>
              <Typography variant="h4">{loading ? '…' : lowAlerts}</Typography>
              <Box sx={{ mt: 1 }}>
                <Button size="small" variant="outlined" onClick={() => navigate('/stock')}>Voir le stock</Button>
                <Button size="small" sx={{ ml: 1 }} onClick={async () => {
                  try {
                    const batchSize = 1000
                    let offset = 0
                    const all: any[] = []
                    while (true) {
                      const batch = await listSales(batchSize, offset)
                      all.push(...batch)
                      if (!batch || batch.length < batchSize) break
                      offset += batchSize
                    }
                    const now = new Date()
                    const y = now.getFullYear(); const m = now.getMonth(); const d = now.getDate()
                    const start = new Date(y, m, d).getTime(); const end = start + 24*60*60*1000
                    const todays = all.filter(r => { const t = new Date(r.createdAt).getTime(); return t >= start && t < end })
                    const header = ['id','boutiqueId','createdAt','paymentMethod','currency','total','items']
                    const lines = todays.map(r => [
                      r.id,
                      r.boutiqueId,
                      new Date(r.createdAt).toISOString(),
                      r.paymentMethod,
                      r.currency,
                      String(r.total),
                      (r.items || []).map((it:any) => `${it.productId}:${it.quantity}x${it.unitPrice - (it.discount||0)}`).join('|')
                    ])
                    const esc = (v: any) => '"' + String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ') + '"'
                    const csv = [header.join(','), ...lines.map(r => r.map(esc).join(','))].join('\n')
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'ventes_du_jour.csv'
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch (e) { /* ignore */ }
                }}>{t('dashboard.export_today_csv') || 'Exporter ventes du jour (CSV)'}</Button>
                <Button size="small" variant="outlined" sx={{ ml: 1 }} onClick={async () => {
                  try {
                    const today = new Date()
                    const y = today.getFullYear(); const m = (today.getMonth()+1).toString().padStart(2,'0'); const d = today.getDate().toString().padStart(2,'0')
                    const date = `${y}-${m}-${d}`
                    const token = localStorage.getItem('afrigest_token')
                    const company = localStorage.getItem('afrigest_company')
                    const qs = new URLSearchParams({ date, boutiqueId: selectedBoutiqueId || 'all' })
                    const res = await fetch(`${API_URL}/sales/eod?${qs.toString()}`, { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(company ? { 'x-company': company } : {}) } })
                    if (!res.ok) throw new Error(await res.text())
                    const json = await res.json() as { lines: Array<{ id: string; boutiqueId: string; createdAt: string; paymentMethod: string; currency: string; total: number; items: string }> }
                    const header = ['id','boutiqueId','createdAt','paymentMethod','currency','total','items']
                    const lines = (json.lines || []).map(r => [r.id, r.boutiqueId, r.createdAt, r.paymentMethod, r.currency, String(r.total), r.items])
                    const esc = (v: any) => '"' + String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ') + '"'
                    const csv = [header.join(','), ...lines.map(r => r.map(esc).join(','))].join('\n')
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `eod_${date}.csv`
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch { /* ignore */ }
                }}>Exporter fin de journée (CSV)</Button>
                <Button size="small" variant="outlined" sx={{ ml: 1 }} onClick={async () => {
                  try {
                    const today = new Date()
                    const y = today.getFullYear(); const m = (today.getMonth()+1).toString().padStart(2,'0'); const d = today.getDate().toString().padStart(2,'0')
                    const date = `${y}-${m}-${d}`
                    const token = localStorage.getItem('afrigest_token')
                    const company = localStorage.getItem('afrigest_company')
                    const qs = new URLSearchParams({ date, boutiqueId: selectedBoutiqueId || 'all' })
                    const res = await fetch(`${API_URL}/sales/eod?${qs.toString()}`, { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(company ? { 'x-company': company } : {}) } })
                    if (!res.ok) throw new Error(await res.text())
                    const json = await res.json() as { date: string; boutiqueId: string; totals: { count: number; revenue: number; payments: Record<string, number> }; lines: Array<{ id: string; boutiqueId: string; createdAt: string; paymentMethod: string; currency: string; total: number }> }
                    const jsPDFModule = await import('jspdf')
                    const jsPDF = (jsPDFModule as any).jsPDF || jsPDFModule.default
                    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
                    const pageWidth = pdf.internal.pageSize.getWidth()
                    const margin = 36
                    let yPos = margin
                    pdf.setFontSize(14)
                    pdf.text(`Rapport fin de journée — ${json.date}`, margin, yPos)
                    yPos += 18
                    pdf.setFontSize(10)
                    pdf.text(`Boutique: ${json.boutiqueId}`, margin, yPos); yPos += 14
                    pdf.text(`Ventes: ${json.totals.count} • CA: ${Number(json.totals.revenue||0).toLocaleString('fr-FR')} ${loadCompanySettings().currency || 'XOF'}`, margin, yPos)
                    yPos += 14
                    const payments = Object.entries(json.totals.payments || {})
                    if (payments.length > 0) {
                      pdf.text('Paiements:', margin, yPos); yPos += 12
                      payments.forEach(([k,v]) => { pdf.text(`- ${k}: ${Number(v||0).toLocaleString('fr-FR')}`, margin + 14, yPos); yPos += 12 })
                    }
                    yPos += 6
                    pdf.setDrawColor(200)
                    pdf.line(margin, yPos, pageWidth - margin, yPos)
                    yPos += 16
                    pdf.setFontSize(11)
                    pdf.text('Lignes', margin, yPos); yPos += 14
                    pdf.setFontSize(10)
                    // Table header
                    pdf.text('Heure', margin, yPos)
                    pdf.text('Boutique', margin + 120, yPos)
                    pdf.text('Paiement', margin + 220, yPos)
                    pdf.text('Devise', margin + 320, yPos)
                    pdf.text('Total', margin + 380, yPos)
                    yPos += 12
                    pdf.setDrawColor(230)
                    const rows = (json.lines || []).slice(0, 50) // limiter l’aperçu
                    rows.forEach(r => {
                      pdf.text(new Date(r.createdAt).toLocaleTimeString(), margin, yPos)
                      pdf.text(String(r.boutiqueId||''), margin + 120, yPos)
                      pdf.text(String(r.paymentMethod||''), margin + 220, yPos)
                      pdf.text(String(r.currency||''), margin + 320, yPos)
                      pdf.text(String(r.total||0), margin + 380, yPos)
                      yPos += 12
                      if (yPos > pdf.internal.pageSize.getHeight() - margin - 24) {
                        pdf.addPage(); yPos = margin
                      }
                    })
                    pdf.save(`eod_${date}.pdf`)
                  } catch {}
                }}>Exporter fin de journée (PDF)</Button>
                <Button size="small" variant="outlined" sx={{ ml: 1 }} onClick={async () => {
                  try {
                    setDigestMsg(null)
                    const res = await sendAlertsDigest({ days: 30, sector: 'all' })
                    setDigestMsg(`Digest envoyé. Total alertes: ${res.total}`)
                    setTimeout(() => setDigestMsg(null), 3000)
                  } catch (e: any) {
                    setDigestMsg(e?.message || 'Erreur envoi digest')
                    setTimeout(() => setDigestMsg(null), 4000)
                  }
                }}>{t('dashboard.send_alerts_digest') || 'Envoyer digest alertes'}</Button>
                {digestMsg && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{digestMsg}</Typography>}
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <TextField
                    label="Du"
                    type="date"
                    size="small"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Au"
                    type="date"
                    size="small"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Button size="small" variant="outlined" onClick={async () => {
                    try {
                      if (!fromDate || !toDate) return
                      const token = localStorage.getItem('afrigest_token')
                      const company = localStorage.getItem('afrigest_company')
                      const qs = new URLSearchParams({ from: fromDate, to: toDate, boutiqueId: selectedBoutiqueId || 'all' })
                      const res = await fetch(`${API_URL}/sales/overview?${qs.toString()}`, { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(company ? { 'x-company': company } : {}) } })
                      if (!res.ok) throw new Error(await res.text())
                      const json = await res.json() as { dailySeries: Array<{ date: string; count: number; revenue: number }>, periodTotals: { count: number; revenue: number; payments: Record<string, number> } }
                      const header = ['date','count','revenue']
                      const lines = (json.dailySeries || []).map(r => [r.date, String(r.count), String(r.revenue)])
                      // Add totals as last row with simple annotation
                      lines.push(['TOTAL', String(json.periodTotals?.count || 0), String(json.periodTotals?.revenue || 0)])
                      const esc = (v: any) => '"' + String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ') + '"'
                      const csv = [header.join(','), ...lines.map(r => r.map(esc).join(','))].join('\n')
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `overview_${fromDate}_${toDate}.csv`
                      a.click()
                      URL.revokeObjectURL(url)
                    } catch { /* ignore */ }
                  }}>Exporter période (CSV)</Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {showEcommerce && (
          <>
            <Grid item xs={12} md={4}>
              <KpiCard title="Ventes en ligne (jour)" value={loading ? undefined : onlineCount} loading={loading} />
            </Grid>
            <Grid item xs={12} md={4}>
              <KpiCard title="CA en ligne (jour)" value={loading ? undefined : onlineRevenue.toLocaleString('fr-FR')} loading={loading} suffix={currency} />
            </Grid>
            <Grid item xs={12} md={4}>
              <KpiCard title="Cmd en ligne payées (jour)" value={loading ? undefined : onlinePaidCount} loading={loading} />
            </Grid>
            <Grid item xs={12} md={4}>
              <KpiCard title="Taux de conversion" value={loading ? undefined : `${conversion.toFixed(2)}%`} loading={loading} />
            </Grid>
            <Grid item xs={12} md={4}>
              <KpiCard title="Panier moyen en ligne (jour)" value={loading ? undefined : onlineAOV.toLocaleString('fr-FR')} loading={loading} suffix={currency} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Top produits e‑commerce (jour)</Typography>
                  {loading ? (
                    <Typography color="text.secondary">…</Typography>
                  ) : (topProducts && topProducts.length > 0 ? (
                    <Box sx={{ mt: 1 }}>
                      {topProducts.slice(0, 5).map((p, i) => (
                        <Box key={`${p.sku}-${i}`} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">{p.sku}</Typography>
                          <Typography variant="body2">{p.quantity} pcs · {Number(p.revenue||0).toLocaleString('fr-FR')} GNF</Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography color="text.secondary">Aucune vente e‑commerce aujourd'hui.</Typography>
                  ))}
                  <Box sx={{ mt: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => {
                      try {
                        const header = ['metric','value']
                        const rows = [
                          ['onlineCount', String(onlineCount)],
                          ['onlineRevenue', String(onlineRevenue)],
                          ['conversionRate', String(conversion)],
                          ['paidCount', String(onlinePaidCount)],
                          ['averageOrderValue', String(onlineAOV)]
                        ]
                        const esc = (v: any) => '"' + String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ') + '"'
                        const csv = [header.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = 'ecommerce_today.csv'
                        a.click()
                        URL.revokeObjectURL(url)
                      } catch {}
                    }}>Exporter e‑commerce (jour) CSV</Button>
                    <Button size="small" variant="outlined" sx={{ ml: 1 }} onClick={async () => {
                      try {
                        if (!fromDate || !toDate) return
                        const ov = await ecomGetOverview(fromDate, toDate)
                        const header = ['date','count','revenue']
                        const lines = (ov.dailySeries || []).map(r => [r.date, String(r.count), String(r.revenue)])
                        lines.push(['TOTAL', String(ov.periodTotals?.count || 0), String(ov.periodTotals?.revenue || 0)])
                        const esc = (v: any) => '"' + String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ') + '"'
                        const csv = [header.join(','), ...lines.map(r => r.map(esc).join(','))].join('\n')
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `ecommerce_overview_${fromDate}_${toDate}.csv`
                        a.click()
                        URL.revokeObjectURL(url)
                      } catch {}
                    }}>Exporter e‑commerce (période) CSV</Button>
                    <Button size="small" variant="outlined" sx={{ ml: 1 }} onClick={async () => {
                      try {
                        if (!fromDate || !toDate) return
                        const ov = await ecomGetOverview(fromDate, toDate)
                        const header = ['periodFrom','periodTo','sku','quantity','revenue']
                        const rows = (ov.topProducts || []).map(p => [fromDate, toDate, String(p.sku || ''), String(p.quantity || 0), String(p.revenue || 0)])
                        const esc = (v: any) => '"' + String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ') + '"'
                        const csv = [header.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `ecommerce_top_products_${fromDate}_${toDate}.csv`
                        a.click()
                        URL.revokeObjectURL(url)
                      } catch {}
                    }}>Exporter top produits e‑commerce (période) CSV</Button>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Sélectionnez une période (Du/Au) avant d’exporter.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
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
    </Page>
  )
}
