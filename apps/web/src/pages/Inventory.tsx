import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Container, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useBoutique } from '../context/BoutiqueContext'
import { getInventorySummary, createInventorySession } from '../api/client_clean'
import ErrorBanner from '../components/ErrorBanner'
import { useI18n } from '../i18n/i18n'

interface RowInput { productId: string; sku?: string; name?: string; expected: number; counted: number; unitPrice?: number }

export default function InventoryPage() {
  const { boutiques, selectedBoutiqueId, setSelectedBoutiqueId } = useBoutique()
  const { t } = useI18n()
  const [rows, setRows] = useState<RowInput[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [result, setResult] = useState<null | { id: string; createdAt: string; items: Array<{ productId: string; expected: number; counted: number; delta: number; unitPrice?: number; valueDelta?: number }>; totalDelta: number; totalValueDelta: number }>(null)

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => (r.sku || '').toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q))
  }, [rows, filter])

  const loadSummary = async () => {
    if (!selectedBoutiqueId) return
    setLoading(true)
    setMessage(null)
    setResult(null)
    try {
      const s = await getInventorySummary(selectedBoutiqueId)
      const next: RowInput[] = (s.summary || []).map(it => ({ productId: it.productId, sku: (it as any).sku, name: (it as any).name, expected: Number(it.quantity || 0), counted: Number(it.quantity || 0), unitPrice: undefined }))
      next.sort((a, b) => (a.sku || '').localeCompare(b.sku || ''))
      setRows(next)
    } catch (e: any) {
      setMessage(e?.message || 'Erreur chargement inventaire')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (selectedBoutiqueId) loadSummary() }, [selectedBoutiqueId])

  const submit = async () => {
    if (!selectedBoutiqueId) return
    setLoading(true)
    setMessage(null)
    try {
      const payload = { boutiqueId: selectedBoutiqueId, items: rows.map(r => ({ productId: r.productId, counted: Number(r.counted || 0), unitPrice: (r.unitPrice != null && Number(r.unitPrice) >= 0) ? Number(r.unitPrice) : undefined })) }
      const res = await createInventorySession(payload)
      setResult({ id: res.id, createdAt: res.createdAt, items: res.items, totalDelta: res.totalDelta, totalValueDelta: res.totalValueDelta })
    } catch (e: any) {
      setMessage(e?.message || 'Erreur calcul variance')
    } finally { setLoading(false) }
  }

  const exportCsv = () => {
    if (!result) return
    const header = ['productId','expected','counted','delta','unitPrice','valueDelta']
    const lines = result.items.map(r => [r.productId, String(r.expected), String(r.counted), String(r.delta), r.unitPrice != null ? String(r.unitPrice) : '', r.valueDelta != null ? String(r.valueDelta) : ''])
    const esc = (v: any) => '"' + String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ') + '"'
    const csv = [header.join(','), ...lines.map(l => l.map(esc).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventaire_${selectedBoutiqueId}_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom>{t('inventory.title')}</Typography>
      {message && <ErrorBanner message={message} onRetry={loadSummary} />}
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField select label="Boutique" value={selectedBoutiqueId} onChange={e => setSelectedBoutiqueId(e.target.value)} sx={{ minWidth: 240 }}>
              {boutiques.map(b => (<MenuItem key={b.id} value={b.id}>{b.code ? `${b.code} — ` : ''}{b.name}</MenuItem>))}
            </TextField>
            <TextField label="Filtre (SKU/Nom)" value={filter} onChange={e => setFilter(e.target.value)} sx={{ flex: 1 }} />
            <Button variant="outlined" onClick={loadSummary} disabled={loading}>{t('inventory.load')}</Button>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Produit</TableCell>
                <TableCell align="right">Attendu</TableCell>
                <TableCell align="right">Compté</TableCell>
                <TableCell align="right">PU (opt.)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r, idx) => (
                <TableRow key={r.productId + '-' + idx}>
                  <TableCell>{r.sku || r.productId}</TableCell>
                  <TableCell>{r.name || ''}</TableCell>
                  <TableCell align="right">{r.expected}</TableCell>
                  <TableCell align="right">
                    <TextField size="small" type="number" value={r.counted} onChange={e => {
                      const v = Number(e.target.value)
                      setRows(prev => prev.map(x => x.productId === r.productId ? { ...x, counted: v } : x))
                    }} sx={{ width: 120 }} />
                  </TableCell>
                  <TableCell align="right">
                    <TextField size="small" type="number" value={r.unitPrice ?? ''} onChange={e => {
                      const v = e.target.value === '' ? undefined : Number(e.target.value)
                      setRows(prev => prev.map(x => x.productId === r.productId ? { ...x, unitPrice: v } : x))
                    }} sx={{ width: 140 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button variant="outlined" onClick={submit} disabled={loading || rows.length === 0}>{t('inventory.compute')}</Button>
            {result && <Button variant="contained" onClick={exportCsv}>{t('inventory.export')}</Button>}
          </Box>

          {result && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>Résultats</Typography>
              <Typography variant="body2" color="text.secondary">Session: {result.id} • {new Date(result.createdAt).toLocaleString()}</Typography>
              <Typography variant="body2">Somme des écarts (qté): {result.totalDelta}</Typography>
              {Number.isFinite(result.totalValueDelta) && <Typography variant="body2">Valeur totale des écarts: {result.totalValueDelta}</Typography>}
            </Box>
          )}
        </Stack>
      </Paper>
    </Container>
  )
}
