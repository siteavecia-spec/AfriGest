import { useEffect, useState } from 'react'
import { Box, Button, Container, Dialog, DialogContent, DialogTitle, Divider, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { adjustStock, createProduct, createStockEntry, getStockAudit, getStockSummary, listProductTemplates, listProducts } from '../api/client_clean'
import { loadCustomAttrs, mergeTemplates } from '../utils/customAttrs'

export default function StockPage() {
  const [boutiqueId, setBoutiqueId] = useState('bq-1')
  const [products, setProducts] = useState<Array<any>>([])
  const [summary, setSummary] = useState<Array<{ productId: string; sku: string; name: string; quantity: number }>>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [lowThreshold, setLowThreshold] = useState<number>(() => {
    const v = localStorage.getItem('afrigest_low_threshold')
    return v ? Number(v) : 5
  })
  // Per-product thresholds
  const [perThresholds, setPerThresholds] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('afrigest_low_threshold_per')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })
  // Adjust form state (per-row simple shared inputs)
  const [adjProductId, setAdjProductId] = useState<string>('')
  const [adjDelta, setAdjDelta] = useState<number>(0)
  const [adjReason, setAdjReason] = useState<string>('')
  // Audit modal
  const [auditOpen, setAuditOpen] = useState(false)
  const [auditProductId, setAuditProductId] = useState<string>('')
  const [auditRows, setAuditRows] = useState<Array<{ id: string; productId: string; boutiqueId: string; delta: number; reason: string; userId?: string; createdAt: string }>>([])

  // New product form
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState<number>(0)
  const [cost, setCost] = useState<number>(0)
  const [sector, setSector] = useState<string>('generic')
  const [templates, setTemplates] = useState<Array<{ key: string; name: string; attributes: Array<{ key: string; label: string; type: 'string' | 'number' | 'date' | 'text' }> }>>([])
  const [attrs, setAttrs] = useState<Record<string, any>>({})
  // Catalogue filters
  const [sectorFilter, setSectorFilter] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  const [customMap, setCustomMap] = useState<Record<string, any>>({})

  // Stock entry form
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState<number>(1)
  const [unitCost, setUnitCost] = useState<number>(0)

  const load = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const s = await getStockSummary(boutiqueId)
      setSummary(s.summary)
      // Load products to enrich summary (sector + attrs)
      try {
        const list = await listProducts()
        setProducts(list)
      } catch {}
    } catch (e: any) {
      setMessage(e?.message || 'Erreur chargement stock')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    ;(async () => {
      try {
        const t = await listProductTemplates()
        setTemplates(t)
      } catch {}
    })()
    // Load PDG custom attributes
    try {
      setCustomMap(loadCustomAttrs())
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist threshold
  useEffect(() => {
    localStorage.setItem('afrigest_low_threshold', String(lowThreshold))
  }, [lowThreshold])

  // Persist per-product thresholds
  useEffect(() => {
    localStorage.setItem('afrigest_low_threshold_per', JSON.stringify(perThresholds))
  }, [perThresholds])

  const onCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      await createProduct({ sku, name, price, cost, sector, attrs })
      setSku(''); setName(''); setPrice(0); setCost(0); setSector('generic'); setAttrs({})
      await load()
      setMessage('Produit créé')
    } catch (e: any) {
      setMessage(e?.message || 'Erreur création produit')
    } finally {
      setLoading(false)
    }
  }

  const onCreateStockEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      await createStockEntry({ boutiqueId, items: [{ productId, quantity, unitCost }] })
      setProductId(''); setQuantity(1); setUnitCost(0)
      await load()
      setMessage('Entrée de stock enregistrée')
    } catch (e: any) {
      setMessage(e?.message || 'Erreur entrée de stock')
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = (rows: Array<{ productId: string; sku: string; name: string; quantity: number }>, filename: string) => {
    const header = ['productId', 'sku', 'name', 'quantity']
    const lines = rows.map(r => [r.productId, r.sku, r.name, String(r.quantity)].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const getThresholdFor = (productId: string) => perThresholds[productId] ?? lowThreshold
  const lowStock = summary.filter(s => s.quantity <= getThresholdFor(s.productId))

  // Enriched rows with product details
  const enriched = summary.map(r => ({
    ...r,
    product: products.find((p: any) => p.id === r.productId) || null
  }))

  const mergedTemplates = mergeTemplates(templates, customMap)
  const currentTemplate = (sectorKey?: string) => mergedTemplates.find(t => t.key === sectorKey)

  const filteredRows = enriched.filter(row => {
    // Sector filter
    if (sectorFilter !== 'all' && (row.product?.sector || 'generic') !== sectorFilter) return false
    // Search across name, sku, barcode, and simple attrs
    const q = search.trim().toLowerCase()
    if (!q) return true
    const base = `${row.name} ${row.sku}`.toLowerCase()
    const barcode = (row.product?.barcode || '').toString().toLowerCase()
    const attrs = row.product?.attrs ? Object.values(row.product.attrs).join(' ').toLowerCase() : ''
    return base.includes(q) || barcode.includes(q) || attrs.includes(q)
  })

  const onAdjust = async (productId: string) => {
    if (!adjReason || !productId) return setMessage('Motif requis pour ajustement')
    try {
      setLoading(true)
      await adjustStock({ boutiqueId, productId, delta: adjDelta, reason: adjReason })
      setAdjProductId('')
      setAdjDelta(0)
      setAdjReason('')
      await load()
      setMessage('Ajustement enregistré')
    } catch (e: any) {
      setMessage(e?.message || 'Erreur ajustement stock')
    } finally {
      setLoading(false)
    }
  }

  const onOpenAudit = async (productId: string) => {
    setAuditProductId(productId)
    try {
      const rows = await getStockAudit(productId, 20)
      setAuditRows(rows)
    } catch (e) {
      setAuditRows([])
    }
    setAuditOpen(true)
  }

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom>Stock - Boutique {boutiqueId}</Typography>
      {message && <Typography color="text.secondary" sx={{ mb: 2 }}>{message}</Typography>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600}>Créer un produit</Typography>
            <Stack spacing={2} component="form" onSubmit={onCreateProduct} sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="SKU" value={sku} onChange={e => setSku(e.target.value)} required />
                <TextField label="Nom" value={name} onChange={e => setName(e.target.value)} required sx={{ flex: 1 }} />
                <TextField label="Prix de vente" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} inputProps={{ min: 0 }} />
                <TextField label="Prix d'achat" type="number" value={cost} onChange={e => setCost(Number(e.target.value))} inputProps={{ min: 0 }} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField select label="Secteur" value={sector} onChange={e => { setSector(e.target.value); setAttrs({}) }} sx={{ minWidth: 220 }}>
                  {mergedTemplates.map(t => (
                    <MenuItem key={t.key} value={t.key}>{t.name}</MenuItem>
                  ))}
                  {mergedTemplates.length === 0 && <MenuItem value="generic">Générique</MenuItem>}
                </TextField>
              </Stack>
              {/* Dynamic attributes based on selected template */}
              {mergedTemplates.find(t => t.key === sector)?.attributes?.length ? (
                <Stack spacing={1}>
                  {mergedTemplates.find(t => t.key === sector)!.attributes.map(a => (
                    <TextField key={a.key}
                      label={a.label}
                      type={a.type === 'number' ? 'number' : a.type === 'date' ? 'date' : 'text'}
                      value={attrs[a.key] ?? ''}
                      onChange={e => setAttrs(prev => ({ ...prev, [a.key]: a.type === 'number' ? Number(e.target.value) : e.target.value }))}
                      InputLabelProps={a.type === 'date' ? { shrink: true } : undefined}
                    />
                  ))}
                </Stack>
              ) : null}
              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" disabled={loading}>Créer</Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600}>Entrée de stock</Typography>
            <Stack spacing={2} component="form" onSubmit={onCreateStockEntry} sx={{ mt: 2 }}>
              <TextField label="Boutique" value={boutiqueId} onChange={e => setBoutiqueId(e.target.value)} />
              <TextField label="Produit ID" value={productId} onChange={e => setProductId(e.target.value)} required />
              <TextField label="Quantité" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} inputProps={{ min: 1 }} required />
              <TextField label="Coût unitaire" type="number" value={unitCost} onChange={e => setUnitCost(Number(e.target.value))} inputProps={{ min: 0 }} required />
              <Button type="submit" variant="contained" disabled={loading}>Enregistrer</Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField label="Seuil alerte stock" type="number" value={lowThreshold} onChange={e => setLowThreshold(Number(e.target.value))} inputProps={{ min: 0 }} />
          <Button variant="outlined" onClick={() => exportCsv(summary, `stock_${boutiqueId}.csv`)}>Exporter Stock (CSV)</Button>
          <Button variant="contained" color="warning" onClick={() => exportCsv(lowStock, `alertes_stock_${boutiqueId}.csv`)} disabled={lowStock.length === 0}>Exporter Alertes (CSV)</Button>
          <Typography color="text.secondary">Alertes: {lowStock.length}</Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600}>Résumé du stock</Typography>
        <Box sx={{ mt: 2 }}>
          {summary.length === 0 ? (
            <Typography color="text.secondary">Aucun stock. Créez un produit et enregistrez une entrée.</Typography>
          ) : (
            <Stack spacing={1}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 1 }}>
                <TextField label="Recherche" value={search} onChange={e => setSearch(e.target.value)} sx={{ flex: 1 }} placeholder="Nom, SKU, attributs…" />
                <TextField select label="Secteur" value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} sx={{ minWidth: 220 }}>
                  <MenuItem value="all">Tous</MenuItem>
                  {mergedTemplates.map(t => (
                    <MenuItem key={t.key} value={t.key}>{t.name}</MenuItem>
                  ))}
                </TextField>
              </Stack>
              {filteredRows.map((row) => {
                const th = getThresholdFor(row.productId)
                const isLow = row.quantity <= th
                const prod = row.product
                const tpl = currentTemplate(prod?.sector)
                const keys = tpl?.attributes?.slice(0, 2) || []
                return (
                  <Box key={row.productId} sx={{ display: 'flex', flexDirection: 'column', gap: 1, bgcolor: isLow ? 'rgba(255, 193, 7, 0.12)' : undefined, borderRadius: 1, px: 1, py: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ minWidth: 140, fontWeight: isLow ? 700 : 400 }}>{row.sku}</Typography>
                      <Typography sx={{ flex: 1 }}>{row.name}</Typography>
                      {prod?.sector && <Typography variant="caption" sx={{ bgcolor: '#EEF2FF', color: '#3730A3', px: 1, py: 0.25, borderRadius: 1 }}>{mergedTemplates.find(t => t.key === prod.sector)?.name || prod.sector}</Typography>}
                      {keys.length > 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 180 }}>
                          {keys.map(k => prod?.attrs?.[k.key] ? `${k.label}: ${prod.attrs[k.key]}` : null).filter(Boolean).join(' • ')}
                        </Typography>
                      )}
                      <Typography color={isLow ? 'warning.main' : undefined}>Qté: {row.quantity}</Typography>
                      <TextField size="small" label="Seuil" type="number" value={th}
                        onChange={e => {
                          const v = Number(e.target.value)
                          setPerThresholds(prev => ({ ...prev, [row.productId]: v }))
                        }}
                        sx={{ width: 120 }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField size="small" label="Δ quantité" type="number" value={adjProductId === row.productId ? adjDelta : 0} onChange={e => { setAdjProductId(row.productId); setAdjDelta(Number(e.target.value)); }} sx={{ width: 130 }} />
                      <TextField size="small" label="Motif" value={adjProductId === row.productId ? adjReason : ''} onChange={e => { setAdjProductId(row.productId); setAdjReason(e.target.value); }} sx={{ flex: 1 }} />
                      <Button variant="outlined" size="small" onClick={() => onAdjust(row.productId)} disabled={loading || !adjReason || adjProductId !== row.productId}>Ajuster</Button>
                      <Button variant="text" size="small" onClick={() => onOpenAudit(row.productId)}>Voir audit</Button>
                    </Box>
                  </Box>
                )
              })}
            </Stack>
          )}
        </Box>
      </Paper>

      <Dialog open={auditOpen} onClose={() => setAuditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Historique des ajustements — Produit {auditProductId}</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {auditRows.length === 0 ? (
              <Typography color="text.secondary">Aucun historique.</Typography>
            ) : (
              auditRows.map(r => (
                <Box key={r.id} sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                  <Typography sx={{ minWidth: 100 }}>{new Date(r.createdAt).toLocaleString()}</Typography>
                  <Typography sx={{ flex: 1 }}>{r.reason}</Typography>
                  <Typography color={r.delta >= 0 ? 'success.main' : 'error.main'}>{r.delta >= 0 ? '+' : ''}{r.delta}</Typography>
                </Box>
              ))
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  )
}
