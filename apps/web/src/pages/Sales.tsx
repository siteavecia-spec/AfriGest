import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Container, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { listSalesPaged } from '../api/client_clean'
import { useBoutique } from '../context/BoutiqueContext'
import ErrorBanner from '../components/ErrorBanner'

export default function SalesPage() {
  const { selectedBoutiqueId, boutiques } = useBoutique()
  const [items, setItems] = useState<Array<any>>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [limit, setLimit] = useState(100)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState<number | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [bqFilter, setBqFilter] = useState<string>(selectedBoutiqueId || 'all')
  const todayStr = new Date().toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState<string>(todayStr)
  const [toDate, setToDate] = useState<string>(todayStr)
  const [payment, setPayment] = useState<'all'|'cash'|'mobile_money'|'card'>('all')

  async function load() {
    setLoading(true)
    setMessage(null)
    try {
      const { items, total } = await listSalesPaged(limit, page * limit)
      setItems(items)
      setTotal(total)
    } catch (e: any) {
      setMessage(e?.message || 'Erreur chargement ventes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, page])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const fromTs = fromDate ? new Date(fromDate + 'T00:00:00').getTime() : Number.NEGATIVE_INFINITY
    const toTs = toDate ? new Date(toDate + 'T23:59:59').getTime() : Number.POSITIVE_INFINITY
    return items.filter((s: any) => {
      // date filter
      const t = new Date(s.createdAt).getTime()
      if (Number.isFinite(fromTs) && t < fromTs) return false
      if (Number.isFinite(toTs) && t > toTs) return false
      // boutique filter
      if (bqFilter && bqFilter !== 'all' && s.boutiqueId !== bqFilter) return false
      // payment filter
      if (payment !== 'all' && String(s.paymentMethod || '').toLowerCase() !== payment) return false
      // text filter
      if (!q) return true
      const base = `${s.id} ${s.boutiqueId} ${s.paymentMethod} ${s.currency}`.toLowerCase()
      const lines = (s.items || []).map((it: any) => `${it.productId}:${it.quantity}x${it.unitPrice - (it.discount||0)}`).join(' ').toLowerCase()
      return base.includes(q) || lines.includes(q)
    })
  }, [items, query, bqFilter, fromDate, toDate, payment])

  const exportCsv = (rows: any[]) => {
    try {
      const header = ['id','boutiqueId','createdAt','paymentMethod','currency','total','items']
      const lines = rows.map(r => [
        r.id,
        r.boutiqueId,
        new Date(r.createdAt).toISOString(),
        r.paymentMethod,
        r.currency,
        String(r.total),
        (r.items || []).map((it:any) => `${it.productId}:${it.quantity}x${it.unitPrice - (it.discount||0)}`).join('|')
      ])
      const esc = (v:any) => '"'+String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ')+'"'
      const csv = [header.join(','), ...lines.map(r => r.map(esc).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ventes.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  const totalPages = total != null ? Math.max(1, Math.ceil(total / limit)) : undefined

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom>Ventes (liste paginée)</Typography>
      {message && (
        <ErrorBanner message={message} onRetry={() => load()} />
      )}

      <Paper sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <TextField size="small" placeholder="Rechercher (texte libre)" value={query} onChange={e => setQuery(e.target.value)} sx={{ flex: 1 }} />
          <TextField size="small" select label="Boutique" value={bqFilter} onChange={e => setBqFilter(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="all">Toutes boutiques</MenuItem>
            {boutiques.map(b => (
              <MenuItem key={b.id} value={b.id}>{b.code ? `${b.code} — ` : ''}{b.name}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" select label="Paiement" value={payment} onChange={e => setPayment(e.target.value as any)} sx={{ minWidth: 180 }}>
            <MenuItem value="all">Tous</MenuItem>
            <MenuItem value="cash">Espèces</MenuItem>
            <MenuItem value="mobile_money">Mobile Money</MenuItem>
            <MenuItem value="card">Carte</MenuItem>
          </TextField>
          <TextField size="small" label="Du" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" label="Au" type="date" value={toDate} onChange={e => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button size="small" onClick={() => {
            const today = new Date()
            const d = today.toISOString().slice(0,10)
            setFromDate(d); setToDate(d)
          }}>Aujourd’hui</Button>
          <Button size="small" onClick={() => {
            const now = new Date()
            const day = now.getDay() || 7 // 1..7 with Monday=1
            const monday = new Date(now); monday.setDate(now.getDate() - (day - 1))
            const d1 = monday.toISOString().slice(0,10)
            const d2 = now.toISOString().slice(0,10)
            setFromDate(d1); setToDate(d2)
          }}>Cette semaine</Button>
          <Button size="small" variant="outlined" onClick={() => exportCsv(filtered)} disabled={loading || filtered.length === 0}>Exporter CSV</Button>
        </Stack>

        {/* Info banner */}
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {filtered.length} élément(s) sur cette page • Page {page + 1}{totalPages != null ? ` / ${totalPages}` : ''}{total != null ? ` • Total ${total}` : ''}
          </Typography>
        </Box>

        <Stack spacing={1} sx={{ mt: 2 }}>
          {loading ? (
            <Typography color="text.secondary">Chargement…</Typography>
          ) : filtered.length === 0 ? (
            <Typography color="text.secondary">Aucune vente.</Typography>
          ) : (
            filtered.map((s:any) => (
              <Box key={s.id} sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                <Typography sx={{ minWidth: 120 }}>{new Date(s.createdAt).toLocaleString()}</Typography>
                <Typography sx={{ flex: 1 }}>{s.id}</Typography>
                <Typography color="text.secondary">{s.boutiqueId}</Typography>
                <Typography color="text.secondary">{s.paymentMethod}</Typography>
                <Typography fontWeight={600}>{Number(s.total || 0).toLocaleString('fr-FR')} {s.currency}</Typography>
              </Box>
            ))
          )}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mt: 2 }}>
          <Button size="small" disabled={loading || page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Précédent</Button>
          <Button size="small" disabled={loading || (totalPages != null ? page + 1 >= totalPages : items.length < limit)} onClick={() => setPage(p => p + 1)}>Suivant</Button>
          <TextField select size="small" label="Par page" value={limit} onChange={e => { setPage(0); setLimit(Number(e.target.value)) }} sx={{ width: 140 }}>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
            <MenuItem value={200}>200</MenuItem>
          </TextField>
          <Typography variant="caption" color="text.secondary">
            Page {page + 1}{totalPages != null ? ` / ${totalPages}` : ''}
          </Typography>
        </Stack>
      </Paper>
    </Container>
  )
}
