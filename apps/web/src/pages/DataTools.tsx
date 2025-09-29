import { useState } from 'react'
import { Box, Button, Container, Paper, Stack, TextField, Typography, MenuItem, Snackbar, Alert } from '@mui/material'
import Page from '../components/Page'
import { loadCompanySettings } from '../utils/settings'
import { listProductsPaged, importProductsJson } from '../api/client_clean'

export default function DataToolsPage() {
  const [sector, setSector] = useState<string>('generic')
  const [message, setMessage] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<Array<Record<string, any>>>([])

  const onParseXlsx = async (file: File) => {
    try {
      const name = (file.name || '').toLowerCase()
      if (name.endsWith('.csv')) {
        const text = await file.text(); setImportText(text); return
      }
      if (name.endsWith('.xlsx')) {
        const XLSX = await loadXlsx()
        const data = await file.arrayBuffer()
        const wb = XLSX.read(data, { type: 'array' })
        const wsName = wb.SheetNames[0]
        const ws = wb.Sheets[wsName]
        const csv = XLSX.utils.sheet_to_csv(ws)
        setImportText(csv)
      }
    } catch (e: any) {
      setMessage(e?.message || 'Erreur lecture fichier')
    }
  }

  const onPreview = () => {
    try {
      const lines = importText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) { setPreview([]); return }
      const header = lines[0].split(',').map(h => h.trim())
      const rows = lines.slice(1).map(l => l.split(',')).map(cols => {
        const row: Record<string, string> = {}
        header.forEach((h, i) => { row[h] = (cols[i] || '').trim() })
        return row
      })
      setPreview(rows.slice(0, 20))
      setMessage(`Aperçu: ${Math.min(20, rows.length)} / ${rows.length} lignes`)
    } catch (e: any) {
      setMessage(e?.message || 'Erreur aperçu')
    }
  }

  const onImport = async () => {
    try {
      setLoading(true)
      const lines = importText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) throw new Error('Fichier vide (en-tête + données requis)')
      const header = lines[0].split(',').map(h => h.trim())
      const items = lines.slice(1).map(l => l.split(',')).map(cols => {
        const row: Record<string, string> = {}
        header.forEach((h, i) => { row[h] = (cols[i] || '').trim() })
        const base: any = {
          sku: row['sku'],
          name: row['name'],
          price: Number(row['price'] || 0),
          cost: Number(row['cost'] || 0),
          barcode: row['barcode'] || undefined,
          taxRate: row['taxRate'] != null && row['taxRate'] !== '' ? Number(row['taxRate']) : undefined,
          attrs: {}
        }
        const baseKeys = new Set(['sku','name','price','cost','barcode','taxRate'])
        Object.keys(row).forEach(k => { if (!baseKeys.has(k) && row[k] !== undefined && row[k] !== '') (base.attrs as any)[k] = row[k] })
        return base
      })
      const res = await importProductsJson(sector, items)
      setMessage(`Import terminé — Créés: ${res.createdCount} • Erreurs: ${res.errorCount}`)
    } catch (e: any) {
      setMessage(e?.message || 'Erreur import')
    } finally {
      setLoading(false)
    }
  }

  const onExportProducts = async () => {
    try {
      const items: any[] = []
      let limit = 500; let offset = 0
      while (true) {
        const page = await listProductsPaged(limit, offset)
        items.push(...(page.items || []))
        if (!page.items || page.items.length < limit) break
        offset += limit
      }
      const header = ['id','sku','name','price','cost','barcode','taxRate']
      const lines = items.map(p => [p.id, p.sku, p.name, p.price, p.cost, p.barcode || '', p.taxRate ?? ''])
      const csv = [header.join(','), ...lines.map(r => r.map(v => '"'+String(v ?? '').replace(/"/g,'""')+'"').join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `produits_${Date.now()}.csv`
      a.click(); URL.revokeObjectURL(url)
    } catch (e: any) {
      setMessage(e?.message || 'Erreur export')
    }
  }

  return (
    <Page title="Outils de données" subtitle="Import/Export catalogue produits avec validations">
      <Paper sx={{ p: 3 }}>
        {message && <Typography color="text.secondary" sx={{ mb: 2 }}>{message}</Typography>}
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField select label="Secteur" value={sector} onChange={e => setSector(e.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="generic">Générique</MenuItem>
              <MenuItem value="electronics">Électronique</MenuItem>
              <MenuItem value="fashion">Mode</MenuItem>
            </TextField>
            <Button variant="outlined" component="label">
              Charger CSV/XLSX
              <input hidden type="file" accept=".csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await onParseXlsx(f) }} />
            </Button>
            <Button variant="outlined" onClick={onPreview}>Aperçu</Button>
            <Button variant="contained" disabled={loading || !importText.trim()} onClick={onImport}>Importer</Button>
            <Box sx={{ flex: 1 }} />
            <Button variant="outlined" onClick={onExportProducts}>Exporter Produits (CSV)</Button>
          </Stack>
          <TextField multiline minRows={8} placeholder="sku,name,price,cost,barcode,taxRate,attr1,attr2,..." value={importText} onChange={e => setImportText(e.target.value)} />
          {preview.length > 0 && (
            <Box>
              <Typography variant="subtitle2">Aperçu (max 20):</Typography>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(preview, null, 2)}</pre>
            </Box>
          )}
        </Stack>
      </Paper>
      <Snackbar open={Boolean(message)} autoHideDuration={2500} onClose={() => setMessage(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {message && <Alert severity="info" onClose={() => setMessage(null)}>{message}</Alert>}
      </Snackbar>
    </Page>
  )
}

async function loadXlsx() {
  return new Promise<any>((resolve, reject) => {
    const id = 'sheetjs-cdn'
    if (document.getElementById(id)) return resolve((window as any).XLSX)
    const s = document.createElement('script')
    s.id = id
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js'
    s.onload = () => resolve((window as any).XLSX)
    s.onerror = reject
    document.body.appendChild(s)
  })
}
