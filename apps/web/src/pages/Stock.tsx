import { useEffect, useState } from 'react'
import { Box, Button, Container, Dialog, DialogContent, DialogTitle, Divider, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { adjustStock, createProduct, createStockEntry, getStockAudit, getStockSummary, listProductTemplates, listProducts, listProductsPaged, listAlerts, searchProducts, createRestockRequest, updateProduct } from '../api/client_clean'
import { loadCustomAttrs, mergeTemplates } from '../utils/customAttrs'
import { loadCompanySettings } from '../utils/settings'
import { useBoutique } from '../context/BoutiqueContext'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import { can } from '../utils/acl'
import ErrorBanner from '../components/ErrorBanner'

export default function StockPage() {
  const role = useSelector((s: RootState) => s.auth.role) as any
  const { selectedBoutiqueId: boutiqueId, setSelectedBoutiqueId, boutiques } = useBoutique()
  const [products, setProducts] = useState<Array<any>>([])
  const [summary, setSummary] = useState<Array<{ productId: string; sku: string; name: string; quantity: number }>>([])
  const [byBoutique, setByBoutique] = useState<Array<{ boutiqueId: string; summary: Array<{ productId: string; sku: string; name: string; quantity: number }> }>>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [allSearch, setAllSearch] = useState('')
  // Products pagination (for selects)
  const [prodLimit, setProdLimit] = useState(200)
  const [prodPage, setProdPage] = useState(0)
  const [prodHasMore, setProdHasMore] = useState(false)
  const [prodTotal, setProdTotal] = useState<number | undefined>(undefined)
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
  const onOpenEdit = (prod: any) => {
    setEditProduct(prod)
    setEName(prod?.name || '')
    setEPrice(prod?.price != null ? Number(prod.price) : '')
    setECost(prod?.cost != null ? Number(prod.cost) : '')
    setEBarcode(prod?.barcode || '')
    setETaxRate(prod?.taxRate != null ? Number(prod.taxRate) : '')
    setESector(prod?.sector || '')
    try { setEAttrs(prod?.attrs ? JSON.stringify(prod.attrs, null, 2) : '') } catch { setEAttrs('') }
    setEditOpen(true)
  }

  const onSaveEdit = async () => {
    if (!editProduct?.id) { setEditOpen(false); return }
    try {
      setLoading(true)
      const payload: any = {}
      if (eName !== '') payload.name = eName
      if (ePrice !== '') payload.price = Number(ePrice)
      if (eCost !== '') payload.cost = Number(eCost)
      if (eBarcode !== '') payload.barcode = eBarcode
      if (eTaxRate !== '') payload.taxRate = Number(eTaxRate)
      if (eSector) payload.sector = eSector
      if (eAttrs && eAttrs.trim()) {
        try { payload.attrs = JSON.parse(eAttrs) } catch (err) { throw new Error('Attrs JSON invalide') }
      }
      await updateProduct(editProduct.id, payload)
      setEditOpen(false)
      setEditProduct(null)
      await load()
      setMessage('Produit mis à jour')
    } catch (e: any) {
      setMessage(e?.message || 'Erreur mise à jour produit')
    } finally {
      setLoading(false)
    }
  }
  // Adjust form state (per-row simple shared inputs)
  const [adjProductId, setAdjProductId] = useState<string>('')
  const [adjDelta, setAdjDelta] = useState<number>(0)
  const [adjReason, setAdjReason] = useState<string>('')
  // Audit modal
  const [auditOpen, setAuditOpen] = useState(false)
  const [auditProductId, setAuditProductId] = useState<string>('')
  const [auditRows, setAuditRows] = useState<Array<{ id: string; productId: string; boutiqueId: string; delta: number; reason: string; userId?: string; createdAt: string }>>([])
  // Edit product modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<any | null>(null)
  const [eName, setEName] = useState('')
  const [ePrice, setEPrice] = useState<number | ''>('')
  const [eCost, setECost] = useState<number | ''>('')
  const [eBarcode, setEBarcode] = useState('')
  const [eTaxRate, setETaxRate] = useState<number | ''>('')
  const [eSector, setESector] = useState('')
  const [eAttrs, setEAttrs] = useState('') // JSON string

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
  // Fast multi-line entry
  const [fastRows, setFastRows] = useState<Array<{ id: string; productId: string; quantity: number; unitCost: number }>>([
    { id: 'row-1', productId: '', quantity: 1, unitCost: 0 }
  ])
  const [csvPaste, setCsvPaste] = useState('')
  const [importReport, setImportReport] = useState<{ accepted: number; ignored: number; errors: string[] } | null>(null)
  // Alerts panel state
  const [alertsDays, setAlertsDays] = useState<number>(30)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alerts, setAlerts] = useState<{ expired: any[]; expiringSoon: any[]; warrantyExpiring: any[] }>({ expired: [], expiringSoon: [], warrantyExpiring: [] })
  // Advanced search state
  const [advQ, setAdvQ] = useState('')
  const [advExpiryBefore, setAdvExpiryBefore] = useState('')
  const [advWarrantyLtDays, setAdvWarrantyLtDays] = useState<number | ''>('')
  const [advAttrVals, setAdvAttrVals] = useState<Record<string, string | number>>({})
  const [advLoading, setAdvLoading] = useState(false)
  const [advCount, setAdvCount] = useState<number | null>(null)
  const [advIds, setAdvIds] = useState<Set<string> | null>(null)
  const [advOpen, setAdvOpen] = useState(false)
  const [advResults, setAdvResults] = useState<Array<{ id: string; sku: string; name: string; sector?: string; attrs?: Record<string, any> }>>([])

  const load = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const s = await getStockSummary(boutiqueId)
      setSummary(s.summary)
      // If "Toutes boutiques", also fetch per-boutique breakdown for PDG view
      if (boutiqueId === 'all') {
        try {
          const per = await Promise.all(
            (boutiques || []).map(async (b) => {
              const one = await getStockSummary(b.id)
              return { boutiqueId: b.id, summary: one.summary }
            })
          )
          setByBoutique(per)
        } catch {
          setByBoutique([])
        }
      } else {
        setByBoutique([])
      }
      // Load products to enrich summary (sector + attrs)
      try {
        const { items, total } = await listProductsPaged(prodLimit, prodPage * prodLimit)
        setProducts(items)
        setProdTotal(total)
        setProdHasMore(total != null ? ((prodPage + 1) * prodLimit) < total : (items || []).length === prodLimit)
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
  }, [boutiqueId, prodLimit, prodPage])

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
      // Validate required attributes per sector template
      const tpl = mergedTemplates.find(t => t.key === sector)
      if (tpl && Array.isArray(tpl.attributes)) {
        const missing: string[] = []
        tpl.attributes.forEach(a => {
          const isReq = (a as any).required === true
          if (isReq) {
            const v = (attrs as any)[a.key]
            const present = v !== undefined && v !== null && String(v) !== ''
            if (!present) missing.push(a.label || a.key)
          }
        })
        if (missing.length > 0) {
          throw new Error(`Champs requis manquants: ${missing.join(', ')}`)
        }
      }
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
      if (boutiqueId === 'all') throw new Error('Sélectionnez une boutique précise pour enregistrer une entrée.')
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
    const currency = (loadCompanySettings().currency || 'XOF')
    const header = ['productId', 'sku', 'name', 'quantity', 'currency']
    const lines = rows.map(r => [r.productId, r.sku, r.name, String(r.quantity), currency].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
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
  // Apply advanced search restriction if present
  const filteredRows2 = advIds ? filteredRows.filter(r => advIds.has(r.productId)) : filteredRows

  // Permissions
  const canStockRead = can(role, 'stock', 'read')
  const canStockCreate = can(role, 'stock', 'create')
  const canStockUpdate = can(role, 'stock', 'update')

  const onAdjust = async (productId: string) => {
    if (!adjReason || !productId) return setMessage('Motif requis pour ajustement')
    try {
      setLoading(true)
      if (boutiqueId === 'all') throw new Error('Sélectionnez une boutique précise pour ajuster le stock.')
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
      <Typography variant="h5" gutterBottom>Stock — {boutiqueId === 'all' ? 'Toutes boutiques' : `Boutique ${boutiqueId}`}</Typography>
      {message && <ErrorBanner message={message} onRetry={() => load()} />}

      <Grid container spacing={3}>
        {canStockCreate && (
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
              {/* Products pagination controls */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Button size="small" disabled={loading || prodPage === 0} onClick={() => setProdPage(p => Math.max(0, p - 1))}>Précédent</Button>
                <Button size="small" disabled={loading || !prodHasMore} onClick={() => setProdPage(p => p + 1)}>Suivant</Button>
                <TextField size="small" select label="Par page" value={prodLimit} onChange={e => { setProdPage(0); setProdLimit(Number(e.target.value)) }} sx={{ width: 140 }}>
                  <MenuItem value={100}>100</MenuItem>
                  <MenuItem value={200}>200</MenuItem>
                  <MenuItem value={500}>500</MenuItem>
                </TextField>
                <Typography variant="caption" color="text.secondary">
                  Page {prodPage + 1}{prodTotal != null ? ` / ${Math.max(1, Math.ceil(prodTotal / prodLimit))}` : ''}
                </Typography>
              </Stack>
              </Stack>
              {/* Dynamic attributes based on selected template */}
              {mergedTemplates.find(t => t.key === sector)?.attributes?.length ? (
                <Stack spacing={1}>
                  {mergedTemplates.find(t => t.key === sector)!.attributes.map(a => (
                    <TextField key={a.key}
                      label={`${a.label}${(a as any).required ? ' *' : ''}`}
                      type={a.type === 'number' ? 'number' : a.type === 'date' ? 'date' : 'text'}
                      value={attrs[a.key] ?? ''}
                      onChange={e => setAttrs(prev => ({ ...prev, [a.key]: a.type === 'number' ? Number(e.target.value) : e.target.value }))}
                      InputLabelProps={a.type === 'date' ? { shrink: true } : undefined}
                      helperText={(a as any).required ? 'Requis' : ''}
                    />
                  ))}
                </Stack>
              ) : null}
              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" disabled={loading}>Créer</Button>
              </Stack>
            </Stack>
          </Paper>

      {/* Advanced Search */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>Recherche avancée produits</Typography>
            <Button size="small" onClick={() => setAdvOpen(v => !v)}>{advOpen ? 'Masquer' : 'Afficher'}</Button>
          </Stack>
          {advOpen && (
          <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField label="Texte" value={advQ} onChange={e => setAdvQ(e.target.value)} placeholder="Nom, SKU, attributs" sx={{ flex: 1 }} />
            <TextField select label="Secteur" value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="all">Tous</MenuItem>
              {mergedTemplates.map(t => (
                <MenuItem key={t.key} value={t.key}>{t.name}</MenuItem>
              ))}
            </TextField>
            <TextField label="Expiration avant" type="date" value={advExpiryBefore} onChange={e => setAdvExpiryBefore(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 200 }} />
            <TextField label="Garantie < (jours)" type="number" value={advWarrantyLtDays} onChange={e => setAdvWarrantyLtDays(e.target.value === '' ? '' : Number(e.target.value))} InputLabelProps={{ shrink: true }} sx={{ minWidth: 200 }} />
          </Stack>
          {/* Dynamic attribute filters: include all attributes of current sector template */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }}>
            {(currentTemplate(sectorFilter === 'all' ? undefined : sectorFilter)?.attributes || []).map(a => (
              <TextField key={a.key}
                label={`Attr: ${a.label}`}
                type={a.type === 'number' ? 'number' : a.type === 'date' ? 'date' : 'text'}
                value={advAttrVals[a.key] ?? ''}
                onChange={e => setAdvAttrVals(prev => ({ ...prev, [a.key]: a.type === 'number' ? Number(e.target.value) : e.target.value }))}
                InputLabelProps={a.type === 'date' ? { shrink: true } : undefined}
                sx={{ minWidth: 220 }}
              />
            ))}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Button variant="outlined" disabled={advLoading} onClick={async () => {
              try {
                setAdvLoading(true)
                const params: any = {
                  q: advQ || undefined,
                  sector: sectorFilter !== 'all' ? sectorFilter : undefined,
                  expiryBefore: advExpiryBefore || undefined,
                  warrantyLtDays: advWarrantyLtDays === '' ? undefined : Number(advWarrantyLtDays),
                  attrs: {}
                }
                Object.entries(advAttrVals).forEach(([k, v]) => {
                  if (v != null && String(v).trim() !== '') (params.attrs as any)[k] = v
                })
                const res = await searchProducts(params)
                const ids = new Set<string>((res.items || []).map(x => x.id))
                setAdvIds(ids)
                setAdvCount(ids.size)
                setAdvResults(res.items || [])
              } catch (e) {
                setAdvIds(null); setAdvCount(null); setAdvResults([])
              } finally {
                setAdvLoading(false)
              }
            }}>Rechercher</Button>
            <Button onClick={() => { setAdvIds(null); setAdvCount(null); setAdvAttrVals({}); setAdvQ(''); setAdvExpiryBefore(''); setAdvWarrantyLtDays('') }}>Réinitialiser</Button>
            {advCount != null && <Typography color="text.secondary">Résultats: {advCount}</Typography>}
            <Button variant="text" disabled={!advResults.length} onClick={() => {
              // Build CSV with dynamic columns
              let attrKeys: string[] = []
              if (sectorFilter !== 'all') {
                attrKeys = (currentTemplate(sectorFilter)?.attributes || []).map(a => a.key)
              } else {
                const set = new Set<string>()
                advResults.forEach(r => Object.keys(r.attrs || {}).forEach(k => set.add(k)))
                attrKeys = Array.from(set)
              }
              const header = ['id','sku','name','sector', ...attrKeys]
              const lines = advResults.map(r => {
                const row: any[] = [r.id, r.sku, r.name, r.sector || '']
                for (const k of attrKeys) row.push((r.attrs || {})[k] ?? '')
                return row.map(v => `"${String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ')}"`).join(',')
              })
              const csv = [header.join(','), ...lines].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `recherche_produits_${sectorFilter}_${Date.now()}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}>Exporter résultats (CSV)</Button>
          </Stack>
          </>
          )}
        </Stack>
      </Paper>
        </Grid>
        )}
        {canStockUpdate && (
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600}>Entrée de stock</Typography>
            <Stack spacing={2} component="form" onSubmit={onCreateStockEntry} sx={{ mt: 2 }}>
              <TextField select label="Boutique" value={boutiqueId} onChange={e => setSelectedBoutiqueId(e.target.value)}>
                {boutiques.map(b => (
                  <MenuItem key={b.id} value={b.id}>{b.code ? `${b.code} — ` : ''}{b.name}</MenuItem>
                ))}
                <MenuItem value="all">Toutes boutiques</MenuItem>
              </TextField>
              <TextField select label="Produit" value={productId} onChange={e => setProductId(e.target.value)} required disabled={boutiqueId === 'all'}>
                {products.length === 0 ? (
                  <MenuItem value="" disabled>Aucun produit</MenuItem>
                ) : (
                  products.map((p: any) => (
                    <MenuItem key={p.id} value={p.id}>{p.sku} — {p.name}</MenuItem>
                  ))
                )}
              </TextField>
              <TextField label="Quantité" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} inputProps={{ min: 1 }} required disabled={boutiqueId === 'all'} />
              <TextField label="Coût unitaire" type="number" value={unitCost} onChange={e => setUnitCost(Number(e.target.value))} inputProps={{ min: 0 }} required disabled={boutiqueId === 'all'} />
              <Button type="submit" variant="contained" disabled={loading || boutiqueId === 'all'}>Enregistrer</Button>
            </Stack>
          </Paper>
        </Grid>
        )}
        {canStockUpdate && (
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600}>Entrée rapide (multi‑lignes)</Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">Coller CSV (colonnes: sku,quantity,unitCost). Exemple: SKU-TSHIRT,2,40000</Typography>
                <TextField multiline minRows={3} placeholder="SKU-TSHIRT,2,40000\nSKU-SHOES,1,150000" value={csvPaste} onChange={e => setCsvPaste(e.target.value)} />
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => setCsvPaste('')}>Effacer</Button>
                  <Button size="small" variant="outlined" onClick={() => {
                    try {
                      const lines = csvPaste.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
                      if (lines.length === 0) return
                      const mapBySku = new Map<string, any>((products || []).map((p:any) => [String(p.sku||'').trim().toLowerCase(), p]))
                      const agg = new Map<string, { productId: string; quantity: number; unitCost: number }>()
                      for (const l of lines) {
                        const parts = l.split(/[\t,]/).map(s => s.trim())
                        const sku = (parts[0] || '').toLowerCase()
                        const qty = Number(parts[1] || '0')
                        const cost = Number(parts[2] || '0')
                        const prod = mapBySku.get(sku)
                        if (!prod || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost) || cost < 0) continue
                        const prev = agg.get(prod.id)
                        if (!prev) agg.set(prod.id, { productId: prod.id, quantity: qty, unitCost: cost })
                        else agg.set(prod.id, { productId: prod.id, quantity: prev.quantity + qty, unitCost: cost })
                      }
                      const rows: Array<{ id: string; productId: string; quantity: number; unitCost: number }> = Array.from(agg.values()).map((r, i) => ({ id: `row-${Date.now()}-${i}`, ...r }))
                      if (rows.length > 0) setFastRows(rows)
                    } catch {}
                  }}>Importer</Button>
                </Stack>
              </Stack>
              {fastRows.map((r, idx) => (
                <Stack key={r.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                  <TextField select label={`Produit #${idx+1}`} value={r.productId} onChange={e => setFastRows(prev => prev.map(x => x.id === r.id ? { ...x, productId: e.target.value } : x))} sx={{ minWidth: 260 }}>
                    {products.length === 0 ? (
                      <MenuItem value="" disabled>Aucun produit</MenuItem>
                    ) : (
                      products.map((p: any) => (
                        <MenuItem key={p.id} value={p.id}>{p.sku} — {p.name}</MenuItem>
                      ))
                    )}
                  </TextField>
                  <TextField label="Quantité" type="number" value={r.quantity} onChange={e => setFastRows(prev => prev.map(x => x.id === r.id ? { ...x, quantity: Number(e.target.value) } : x))} inputProps={{ min: 1 }} sx={{ width: 140 }} />
                  <TextField label="Coût unitaire" type="number" value={r.unitCost} onChange={e => setFastRows(prev => prev.map(x => x.id === r.id ? { ...x, unitCost: Number(e.target.value) } : x))} inputProps={{ min: 0 }} sx={{ width: 180 }} />
                  <Button size="small" color="error" onClick={() => setFastRows(prev => prev.length > 1 ? prev.filter(x => x.id !== r.id) : prev)}>Supprimer</Button>
                </Stack>
              ))}
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" size="small" onClick={() => setFastRows(prev => [...prev, { id: `row-${Date.now()}`, productId: '', quantity: 1, unitCost: 0 }])}>Ajouter une ligne</Button>
                <Button variant="contained" size="small" disabled={loading} onClick={async () => {
                  setLoading(true)
                  setMessage(null)
                  try {
                    const items = fastRows
                      .filter(r => r.productId && (r.quantity || 0) > 0)
                      .map(r => ({ productId: r.productId, quantity: r.quantity, unitCost: r.unitCost }))
                    if (items.length === 0) throw new Error('Aucune ligne valide')
                    await createStockEntry({ boutiqueId, items })
                    setFastRows([{ id: 'row-1', productId: '', quantity: 1, unitCost: 0 }])
                    await load()
                    setMessage('Entrée rapide enregistrée')
                  } catch (e: any) {
                    setMessage(e?.message || 'Erreur entrée rapide')
                  } finally {
                    setLoading(false)
                  }
                }}>Enregistrer toutes les lignes</Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
        )}
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

      {/* Métier-specific Alerts (expiry, warranty, etc.) */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={600}>Alertes métier (péremption, garantie)</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField select label="Secteur" value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="all">Tous</MenuItem>
              {mergedTemplates.map(t => (
                <MenuItem key={t.key} value={t.key}>{t.name}</MenuItem>
              ))}
            </TextField>
            <TextField label="Fenêtre (jours)" type="number" value={alertsDays} onChange={e => setAlertsDays(Number(e.target.value))} inputProps={{ min: 1, max: 365 }} sx={{ width: 180 }} />
            <Button variant="outlined" disabled={alertsLoading} onClick={async () => {
              try {
                setAlertsLoading(true)
                const data = await listAlerts({ days: alertsDays, sector: sectorFilter })
                setAlerts(data)
              } catch (e) {
                // noop UI banner already exists above for stock; keep alerts silent
              } finally {
                setAlertsLoading(false)
              }
            }}>Charger les alertes</Button>
            <Button variant="contained" color="warning" disabled={alerts.expired.length + alerts.expiringSoon.length + alerts.warrantyExpiring.length === 0} onClick={() => {
              const rows: Array<{ id: string; sku: string; name: string; reason: string; date?: string }> = []
              alerts.expired.forEach((a: any) => rows.push({ id: a.id, sku: a.sku, name: a.name, reason: a.reason, date: a.date }))
              alerts.expiringSoon.forEach((a: any) => rows.push({ id: a.id, sku: a.sku, name: a.name, reason: a.reason, date: a.date }))
              alerts.warrantyExpiring.forEach((a: any) => rows.push({ id: a.id, sku: a.sku, name: a.name, reason: a.reason, date: a.date }))
              const header = ['id','sku','name','reason','date']
              const lines = rows.map(r => [r.id, r.sku, r.name, r.reason, r.date || ''].map(v => `"${String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ')}"`).join(','))
              const csv = [header.join(','), ...lines].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `alertes_metier_${sectorFilter}_${alertsDays}j.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}>Exporter alertes (CSV)</Button>
          </Stack>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">Expirés: {alerts.expired.length} • Bientôt expirés: {alerts.expiringSoon.length} • Garantie bientôt expirée: {alerts.warrantyExpiring.length}</Typography>
            {[{ title: 'Produits expirés', list: alerts.expired }, { title: 'Expirent bientôt', list: alerts.expiringSoon }, { title: 'Garanties bientôt expirées', list: alerts.warrantyExpiring }].map((grp, idx) => (
              <Box key={idx} sx={{ border: '1px dashed #e0e0e0', borderRadius: 1, p: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>{grp.title}</Typography>
                {(grp.list || []).slice(0, 5).map((a: any) => (
                  <Box key={`${a.id}-${a.reason}`} sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                    <Typography sx={{ minWidth: 140 }}>{a.sku}</Typography>
                    <Typography sx={{ flex: 1 }}>{a.name}</Typography>
                    <Typography color="text.secondary">{a.reason}</Typography>
                    {a.date && <Typography color="text.secondary">{new Date(a.date).toLocaleDateString()}</Typography>}
                  </Box>
                ))}
                {(grp.list || []).length > 5 && (
                  <Typography variant="caption" color="text.secondary">… {(grp.list || []).length - 5} autres</Typography>
                )}
              </Box>
            ))}
          </Stack>
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
              {filteredRows2.map((row) => {
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
                      {prod && <Button variant="text" size="small" onClick={() => onOpenEdit(prod)}>Éditer</Button>}
                      {isLow && (
                        <Button size="small" color="warning" variant="outlined" disabled={boutiqueId === 'all' || loading} onClick={async () => {
                          try {
                            setLoading(true)
                            const suggest = Math.max(1, (th - row.quantity) + Math.ceil(th * 0.5))
                            await createRestockRequest({ boutiqueId, productId: row.productId, quantity: suggest })
                            setMessage('Demande de réapprovisionnement envoyée')
                          } catch (e: any) {
                            setMessage(e?.message || 'Erreur demande réapprovisionnement')
                          } finally {
                            setLoading(false)
                          }
                        }}>Demande réappro</Button>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Stack>
          )}
        </Box>
      </Paper>

      {/* Per-boutique breakdown when viewing all */}
      {boutiqueId === 'all' && byBoutique.length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={600}>Vue par boutique (aperçu)</Typography>
          {/* Controls: search + CSV exports */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mt: 1 }}>
            <TextField size="small" placeholder="Rechercher (nom, SKU)" value={allSearch} onChange={e => setAllSearch(e.target.value)} sx={{ maxWidth: 360 }} />
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="outlined" onClick={() => {
              try {
                // Aggregated export uses the already aggregated 'summary' state
                const currency = (loadCompanySettings().currency || 'XOF')
                const header = ['productId','sku','name','quantity','currency']
                const rows = summary
                  .filter(r => {
                    const q = allSearch.trim().toLowerCase()
                    if (!q) return true
                    return r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)
                  })
                  .map(r => [r.productId, r.sku, r.name, String(r.quantity), currency])
                const esc = (v:any) => '"'+String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ')+'"'
                const csv = [header.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'stock_toutes_boutiques_agrege.csv'
                a.click()
                URL.revokeObjectURL(url)
              } catch {}
            }}>Exporter agrégé (CSV)</Button>
            <Button size="small" variant="outlined" onClick={() => {
              try {
                // Ventilated export: one line per boutique per produit
                const currency = (loadCompanySettings().currency || 'XOF')
                const header = ['boutiqueId','productId','sku','name','quantity','currency']
                const q = allSearch.trim().toLowerCase()
                const lines: string[][] = []
                byBoutique.forEach(b => {
                  b.summary.forEach(r => {
                    const ok = !q || r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)
                    if (ok) lines.push([b.boutiqueId, r.productId, r.sku, r.name, String(r.quantity), currency])
                  })
                })
                const esc = (v:any) => '"'+String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ')+'"'
                const csv = [header.join(','), ...lines.map(r => r.map(esc).join(','))].join('\n')
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'stock_toutes_boutiques_ventile.csv'
                a.click()
                URL.revokeObjectURL(url)
              } catch {}
            }}>Exporter ventilé (CSV)</Button>
          </Stack>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {byBoutique.map((b) => (
              <Box key={b.boutiqueId} sx={{ border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Boutique {b.boutiqueId} — {b.summary.length} produits</Typography>
                {(b.summary
                  .filter(r => {
                    const q = allSearch.trim().toLowerCase()
                    if (!q) return true
                    return r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)
                  })
                  .slice(0, 10)
                ).map(r => (
                  <Box key={r.productId} sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                    <Typography sx={{ minWidth: 140 }}>{r.sku}</Typography>
                    <Typography sx={{ flex: 1 }}>{r.name}</Typography>
                    <Typography>Qté: {r.quantity}</Typography>
                  </Box>
                ))}
                {b.summary.filter(r => {
                  const q = allSearch.trim().toLowerCase()
                  if (!q) return true
                  return r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)
                }).length > 10 && (
                  <Typography variant="caption" color="text.secondary">… {b.summary.length - 10} autres produits</Typography>
                )}
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

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

      {/* Edit product modal */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Éditer produit — {editProduct?.sku || ''}</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <TextField label="Nom" value={eName} onChange={e => setEName(e.target.value)} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField label="Prix de vente" type="number" value={ePrice} onChange={e => setEPrice(e.target.value === '' ? '' : Number(e.target.value))} />
              <TextField label="Prix d'achat" type="number" value={eCost} onChange={e => setECost(e.target.value === '' ? '' : Number(e.target.value))} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField label="Code-barres" value={eBarcode} onChange={e => setEBarcode(e.target.value)} />
              <TextField label="TVA (%)" type="number" value={eTaxRate} onChange={e => setETaxRate(e.target.value === '' ? '' : Number(e.target.value))} />
            </Stack>
            <TextField label="Secteur" value={eSector} onChange={e => setESector(e.target.value)} placeholder="ex: electronics, pharmacy..." />
            <TextField label="Attributs (JSON)" value={eAttrs} onChange={e => setEAttrs(e.target.value)} multiline minRows={3} placeholder='{"brand":"...","warranty":12}' />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={onSaveEdit} disabled={loading}>Enregistrer</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
