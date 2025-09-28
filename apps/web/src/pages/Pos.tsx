import { useEffect, useMemo, useState } from 'react'
import { Box, Button, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Alert, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Tooltip, Chip, CircularProgress } from '@mui/material'
import { createSale, listProducts, listSales, API_URL } from '../api/client_clean'
import { enqueueSale, getPendingSales, removePendingSale, trySyncSales } from '../offline/salesQueue'
import DeleteIcon from '@mui/icons-material/Delete'
import ReceiptModal, { type ReceiptData } from '../components/ReceiptModal'
import { loadCompanySettings, getNextReceiptNumber } from '../utils/settings'
import { formatGNF } from '../utils/currency'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { useBoutique } from '../context/BoutiqueContext'
import ErrorBanner from '../components/ErrorBanner'
import { useI18n } from '../i18n/i18n'
import Page from '../components/Page'

export default function PosPage() {
  const { selectedBoutiqueId: boutiqueId, setSelectedBoutiqueId, boutiques } = useBoutique()
  const { t } = useI18n()
  const [products, setProducts] = useState<Array<any>>([])
  const [query, setQuery] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState<number>(1)
  const [unitPrice, setUnitPrice] = useState<number>(0)
  const [cart, setCart] = useState<Array<{ productId: string; name: string; sku: string; quantity: number; unitPrice: number; discount?: number }>>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card'>('cash')
  const [paymentRef, setPaymentRef] = useState('')
  const [payments, setPayments] = useState<Array<{ method: 'cash'|'mobile_money'|'card'; amount: number; ref?: string }>>([])
  const [globalDiscount, setGlobalDiscount] = useState<number>(0)
  // Offline pending state
  const [pending, setPending] = useState<Array<any>>([])
  const [pendingOpen, setPendingOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  // Held carts
  const [heldName, setHeldName] = useState('')
  const [heldCarts, setHeldCarts] = useState<Array<{ id: string; name: string; createdAt: string; boutiqueId: string; items: Array<{ productId: string; name: string; sku: string; quantity: number; unitPrice: number; discount?: number }> }>>([])
  // Products pagination
  const [prodLimit, setProdLimit] = useState(100)
  const [prodPage, setProdPage] = useState(0)
  const [prodHasMore, setProdHasMore] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const list = await listProducts(prodLimit, prodPage * prodLimit)
        setProducts(list)
        setProdHasMore((list || []).length === prodLimit)
      } catch (e) {
        // ignore; no products yet
      }
    })()
    // Load pending queue on mount
    ;(async () => {
      try { setPending(await getPendingSales()) } catch {}
    })()
    // Load held carts from localStorage
    try {
      const raw = localStorage.getItem('afrigest_held_carts')
      if (raw) setHeldCarts(JSON.parse(raw))
    } catch {}
    // Keyboard shortcuts
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // Add currently selected product if any
        if (selectedProductId) {
          addToCart()
          e.preventDefault()
        }
      }
      if ((e.key === '+' || e.key === '=')) {
        if (cart.length > 0) {
          const last = cart[cart.length - 1]
          changeQty(cart.length - 1, last.quantity + 1)
          e.preventDefault()
        }
      }
      if (e.key === '-' || e.key === '_') {
        if (cart.length > 0) {
          const last = cart[cart.length - 1]
          changeQty(cart.length - 1, Math.max(1, last.quantity - 1))
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prodLimit, prodPage])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p: any) =>
      p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    )
  }, [products, query])

  const onSelectProduct = (id: string) => {
    const p = products.find((x: any) => x.id === id)
    setSelectedProductId(id)
    setUnitPrice(p ? Number(p.price ?? 0) : 0)
    setQuantity(1)
  }

  const addToCart = () => {
    const p = products.find((x: any) => x.id === selectedProductId)
    if (!p) return
    if (quantity <= 0 || unitPrice < 0) return
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === p.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity, unitPrice }
        return copy
      }
      return [...prev, { productId: p.id, name: p.name, sku: p.sku, quantity, unitPrice }]
    })
    setSelectedProductId('')
    setQuantity(1)
    setUnitPrice(0)
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId))
  }

  const changeQty = (idx: number, nextQty: number) => {
    setCart(prev => prev.map((x, j) => j === idx ? { ...x, quantity: Math.max(1, nextQty) } : x))
  }

  const total = useMemo(() => cart.reduce((sum, i) => sum + (i.quantity * i.unitPrice - (i.discount || 0)), 0), [cart])
  const totalAfterDiscount = useMemo(() => Math.max(0, total - (globalDiscount || 0)), [total, globalDiscount])
  const settings = loadCompanySettings()
  const currency = settings.currency || 'XOF'
  const vatRate = settings.vatRate ?? 18
  // Assume displayed prices are tax-inclusive (TTC)
  // Build a quick map to access product details (for per-product VAT)
  const mapById = useMemo(() => new Map<string, any>((products || []).map((p:any) => [p.id, p])), [products])
  // Compute VAT amount by summing item-level VAT (TTC assumed) with per-product taxRate if present, fallback to company vatRate
  const vatAmount = useMemo(() => {
    try {
      if ((cart || []).length === 0) return 0
      let remainingGlobal = Math.min(globalDiscount || 0, total)
      let sum = 0
      cart.forEach((i, idx) => {
        const prod = mapById.get(i.productId)
        const rate = Number(prod?.taxRate ?? vatRate) || 0
        // TTC line after item discount
        let lineTtc = i.quantity * i.unitPrice - (i.discount || 0)
        // Apply global discount entirely on first line (same rule as receipt)
        if (idx === 0 && remainingGlobal > 0) {
          const apply = Math.min(remainingGlobal, lineTtc)
          lineTtc -= apply
          remainingGlobal -= apply
        }
        if (rate > 0 && lineTtc > 0) {
          sum += lineTtc * (rate / (100 + rate))
        }
      })
      return sum
    } catch {
      return vatRate > 0 ? (totalAfterDiscount * vatRate) / (100 + vatRate) : 0
    }
  }, [cart, mapById, vatRate, globalDiscount, total, totalAfterDiscount])
  const totalExclVat = useMemo(() => totalAfterDiscount - vatAmount, [totalAfterDiscount, vatAmount])
  const totalInclVat = totalAfterDiscount

  function genOfflineId() {
    return 'offline-' + Date.now() + '-' + Math.floor(Math.random() * 1e6)
  }

  const submitSale = async () => {
    setMessage(null)
    setLoading(true)
    const items = cart.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount }))
    // Apply global discount to the first item for backend compatibility
    if (items.length > 0 && (globalDiscount || 0) > 0) {
      const d = Math.min(globalDiscount, items[0].quantity * items[0].unitPrice)
      ;(items as any)[0].discount = d
    }
    // Build payments payload: if user entered multi-payments, mark method as 'mixed'
    const hasMulti = (payments || []).length > 0
    const pmMethod = hasMulti ? 'mixed' : paymentMethod
    const validPayments = (payments || []).filter(p => Number(p.amount) > 0)
    const payload = { boutiqueId, items, paymentMethod: pmMethod as any, payments: hasMulti ? validPayments : undefined, currency }
    try {
      const sale = await createSale(payload)
      setMessage(`Vente créée: ${sale.id} | Total: ${totalAfterDiscount}`)
      // Build receipt
      const receiptItems = cart.map((i, idx) => ({
        sku: i.sku,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.quantity * i.unitPrice - (i.discount || 0) - (idx === 0 ? Math.min(globalDiscount || 0, i.quantity * i.unitPrice) : 0)
      }))
      const brand = settings
      const receiptNumber = getNextReceiptNumber(boutiqueId, brand.receiptPrefix)
      setReceiptData({ id: sale.id, boutiqueId, createdAt: new Date().toISOString(), currency, paymentMethod: pmMethod, paymentRef: paymentRef || undefined, payments: hasMulti ? validPayments : undefined, items: receiptItems, total: totalAfterDiscount, offlineId: undefined, brand: { name: brand.name, slogan: brand.slogan, address: brand.address, phone: brand.phone, logoDataUrl: brand.logoDataUrl }, receiptNumber, vatRate, vatAmount, totalExclVat, totalInclVat })
      setReceiptOpen(true)
      setCart([])
      setGlobalDiscount(0)
      setPaymentRef('')
      setPayments([])
    } catch (err: any) {
      // Offline fallback: enqueue
      const offlineId = genOfflineId()
      await enqueueSale({ ...payload, offlineId })
      setMessage(`Vente enregistrée hors-ligne (${offlineId}). Elle sera synchronisée dès connexion.`)
      try { setPending(await getPendingSales()) } catch {}
      const receiptItems = cart.map((i, idx) => ({
        sku: i.sku,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.quantity * i.unitPrice - (idx === 0 ? Math.min(globalDiscount || 0, i.quantity * i.unitPrice) : 0)
      }))
      const brand = settings
      const receiptNumber = getNextReceiptNumber(boutiqueId, brand.receiptPrefix)
      setReceiptData({ id: undefined, boutiqueId, createdAt: new Date().toISOString(), currency, paymentMethod: pmMethod, paymentRef: paymentRef || undefined, payments: hasMulti ? validPayments : undefined, items: receiptItems, total: totalAfterDiscount, offlineId, brand: { name: brand.name, slogan: brand.slogan, address: brand.address, phone: brand.phone, logoDataUrl: brand.logoDataUrl }, receiptNumber, vatRate, vatAmount, totalExclVat, totalInclVat })
      setReceiptOpen(true)
      setCart([])
      setGlobalDiscount(0)
      setPaymentRef('')
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  // Quick add by barcode or SKU: when Enter pressed on barcode field
  const onBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const code = barcode.trim().toLowerCase()
    if (!code) return
    const p = products.find((x: any) => x.barcode?.toLowerCase() === code || x.sku?.toLowerCase() === code)
    if (p) {
      setSelectedProductId(p.id)
      setUnitPrice(Number(p.price ?? 0))
      setQuantity(1)
      // Auto add one unit
      setCart(prev => {
        const idx = prev.findIndex(i => i.productId === p.id)
        if (idx >= 0) {
          const copy = [...prev]
          copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 }
          return copy
        }
        return [...prev, { productId: p.id, name: p.name, sku: p.sku, quantity: 1, unitPrice: Number(p.price ?? 0) }]
      })
      setBarcode('')
    } else {
      setMessage(`Code inconnu: ${barcode}`)
      setBarcode('')
    }
  }

  return (
    <Page title={t('nav.pos') || 'Point de Vente'} subtitle={t('pos.subtitle') || 'Enregistrer des ventes rapidement'}>
      {/* Banner for pending offline sales */}
      {pending.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}
          action={
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={async () => { setPendingOpen(true); try { setPending(await getPendingSales()) } catch {} }}>Voir</Button>
              <Button size="small" variant="contained" onClick={async () => { setSyncing(true); try { await trySyncSales() } finally { setSyncing(false); try { setPending(await getPendingSales()) } catch {} } }} disabled={syncing}>Sync</Button>
            </Stack>
          }
        >Des ventes en attente seront synchronisées dès que possible: {pending.length}</Alert>
      )}
      <Paper sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
          <Button size="small" variant="outlined" onClick={async () => {
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
              const header = ['id','boutiqueId','createdAt','paymentMethod','currency','total','lines']
              const lines = todays.map(r => [
                r.id,
                r.boutiqueId,
                new Date(r.createdAt).toISOString(),
                r.paymentMethod,
                r.currency,
                String(r.total),
                (r.items||[]).map((it:any) => `${it.productId}:${it.quantity}x${it.unitPrice - (it.discount||0)}`).join('|')
              ])
              const esc = (v:any) => '"'+String(v ?? '').replace(/"/g,'""').replace(/\n/g,' ')+'"'
              const csv = [header.join(','), ...lines.map(r => r.map(esc).join(','))].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'recus_du_jour.csv'
              a.click()
              URL.revokeObjectURL(url)
            } catch {}
          }}>{t('pos.export_receipts_csv') || 'Exporter reçus du jour (CSV)'}</Button>
          <Button size="small" variant="outlined" onClick={async () => {
            try {
              const today = new Date()
              const y = today.getFullYear(); const m = (today.getMonth()+1).toString().padStart(2,'0'); const d = today.getDate().toString().padStart(2,'0')
              const date = `${y}-${m}-${d}`
              const token = localStorage.getItem('afrigest_token')
              const company = localStorage.getItem('afrigest_company')
              const qs = new URLSearchParams({ date, boutiqueId: boutiqueId || 'all' })
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
            } catch {}
          }}>Exporter fin de journée (CSV)</Button>
          <Button size="small" variant="outlined" onClick={async () => {
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
            } catch {}
          }}>Exporter ventes du jour (CSV)</Button>
          <Button size="small" variant="outlined" onClick={async () => {
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
              if (todays.length === 0) return
              const jsPDFModule = await import('jspdf')
              const jsPDF = (jsPDFModule as any).jsPDF || jsPDFModule.default
              const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
              const pageWidth = pdf.internal.pageSize.getWidth()
              const margin = 36
              const lineH = 16
              const mapById = new Map<string, any>((products || []).map((p:any) => [p.id, p]))
              const brand = loadCompanySettings()
              todays.forEach((sale, idx) => {
                if (idx > 0) pdf.addPage()
                let yPos = margin
                // Brand header
                if (brand?.logoDataUrl) {
                  try { pdf.addImage(brand.logoDataUrl, 'PNG', margin, yPos - 8, 40, 40) } catch {}
                }
                pdf.setFontSize(14)
                pdf.text(brand?.name || 'AfriGest', brand?.logoDataUrl ? margin + 50 : margin, yPos)
                yPos += lineH
                pdf.setFontSize(10)
                const meta = [brand?.slogan, brand?.address, brand?.phone].filter(Boolean).join(' • ')
                if (meta) { pdf.text(meta, brand?.logoDataUrl ? margin + 50 : margin, yPos) ; yPos += lineH }
                // Receipt title
                pdf.setFontSize(12)
                pdf.text(`Reçu — ${new Date(sale.createdAt).toLocaleString()}`, margin, yPos)
                yPos += lineH
                pdf.setFontSize(10)
                pdf.text(`Boutique: ${sale.boutiqueId} • Paiement: ${sale.paymentMethod} • Total: ${sale.total} ${sale.currency}`, margin, yPos)
                yPos += lineH
                pdf.setDrawColor(200)
                pdf.line(margin, yPos, pageWidth - margin, yPos)
                yPos += lineH
                pdf.setFontSize(10)
                pdf.text('SKU', margin, yPos)
                pdf.text('Nom', margin + 120, yPos)
                pdf.text('Qté', pageWidth - margin - 140, yPos)
                pdf.text('PU', pageWidth - margin - 90, yPos)
                pdf.text('Total', pageWidth - margin - 30, yPos)
                yPos += lineH
                pdf.setDrawColor(230)
                sale.items.forEach(it => {
                  const p = mapById.get(it.productId)
                  const sku = p?.sku || it.productId
                  const name = p?.name || ''
                  const total = it.quantity * it.unitPrice - (it.discount || 0)
                  pdf.text(String(sku), margin, yPos)
                  pdf.text(String(name).substring(0, 40), margin + 120, yPos)
                  pdf.text(String(it.quantity), pageWidth - margin - 140, yPos)
                  pdf.text(String(it.unitPrice), pageWidth - margin - 90, yPos)
                  pdf.text(String(total), pageWidth - margin - 30, yPos)
                  yPos += lineH
                })
                yPos += 6
                pdf.setDrawColor(200)
                pdf.line(margin, yPos, pageWidth - margin, yPos)
                yPos += lineH
                pdf.setFontSize(12)
                pdf.text(`Total: ${sale.total} ${sale.currency}`, pageWidth - margin - 180, yPos)
              })
              pdf.save('recus_du_jour.pdf')
            } catch {}
          }}>{t('pos.export_receipts_pdf') || 'Exporter reçus du jour (PDF)'}</Button>
        </Stack>
        <Stack spacing={2}>
          <TextField select label="Boutique" value={boutiqueId} onChange={e => setSelectedBoutiqueId(e.target.value)}>
            {boutiques.map(b => (
              <MenuItem key={b.id} value={b.id}>{b.code ? `${b.code} — ` : ''}{b.name}</MenuItem>
            ))}
          </TextField>
          <TextField label="Scan code-barres / SKU" value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={onBarcodeKeyDown} placeholder="Scannez ici puis Entrée" />
          <TextField label="Recherche produit (Nom ou SKU)" value={query} onChange={e => setQuery(e.target.value)} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField select label="Produit" value={selectedProductId} onChange={e => onSelectProduct(e.target.value)} placeholder="Sélectionner un produit">
              {filtered.length === 0 ? (
                <MenuItem value="" disabled>Aucun produit</MenuItem>
              ) : (
                filtered.slice(0, 50).map((p:any) => (
                  <MenuItem key={p.id} value={p.id}>{p.sku} — {p.name}</MenuItem>
                ))
              )}
            </TextField>
            <TextField label="Quantité" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} inputProps={{ min: 1 }} />
            <TextField label="Prix Unitaire" type="number" value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))} inputProps={{ min: 0 }} />
            <Button variant="outlined" onClick={addToCart} disabled={!selectedProductId}>{t('pos.add_to_cart') || 'Ajouter au panier'}</Button>
          </Stack>

          {/* Liste filtrée des produits */}
          <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
            {filtered.length === 0 ? (
              <Typography color="text.secondary">Aucun produit</Typography>
            ) : (
              <Stack spacing={1}>
                {filtered.map((p: any) => (
                  <Box key={p.id} sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                    <Typography sx={{ minWidth: 120 }}>{p.sku}</Typography>
                    <Typography sx={{ flex: 1 }}>{p.name}</Typography>
                    <Typography color="text.secondary">{p.id}</Typography>
                    <Button size="small" onClick={() => onSelectProduct(p.id)}>Sélectionner</Button>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
          {/* Products pagination controls */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mt: 1 }}>
            <Button size="small" disabled={prodPage === 0} onClick={() => setProdPage(p => Math.max(0, p - 1))}>Précédent</Button>
            <Button size="small" disabled={!prodHasMore} onClick={() => setProdPage(p => p + 1)}>Suivant</Button>
            <TextField select size="small" label="Par page" value={prodLimit} onChange={e => { setProdPage(0); setProdLimit(Number(e.target.value)) }} sx={{ width: 140 }}>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
            </TextField>
            <Typography variant="caption" color="text.secondary">Page {prodPage + 1}</Typography>
          </Stack>

          {/* Panier */}
          <Typography variant="subtitle1" fontWeight={600}>Panier</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Produit</TableCell>
                <TableCell align="right">Qté</TableCell>
                <TableCell align="right">PU</TableCell>
                <TableCell align="right">Remise</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cart.map((i, idx) => (
                <TableRow key={i.productId}>
                  <TableCell>{i.sku}</TableCell>
                  <TableCell>
                    <Stack spacing={0}>
                      <Typography>{i.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(() => {
                          const prod = mapById.get(i.productId)
                          const pr = Number(prod?.taxRate)
                          const useProd = Number.isFinite(pr) && pr >= 0
                          const rateUsed = useProd ? pr : vatRate
                          return `TVA: ${rateUsed}% (${useProd ? 'produit' : 'société'})`
                        })()}
                      </Typography>
                      {(() => {
                        const prod = mapById.get(i.productId)
                        const pr = Number(prod?.taxRate)
                        const useProd = Number.isFinite(pr) && pr >= 0
                        if (!useProd) return null
                        return (
                          <Tooltip title={`Ce produit utilise un taux TVA spécifique (${pr}%). Le taux société est ${vatRate}%.`}>
                            <Chip size="small" label="TVA produit" color="primary" variant="outlined" sx={{ width: 'fit-content' }} />
                          </Tooltip>
                        )
                      })()}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                      <IconButton size="small" aria-label="Diminuer quantité" onClick={() => changeQty(idx, i.quantity - 1)}>
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <TextField size="small" type="number" value={i.quantity} onChange={e => changeQty(idx, Number(e.target.value))} inputProps={{ min: 1 }} sx={{ width: 80 }} />
                      <IconButton size="small" aria-label="Augmenter quantité" onClick={() => changeQty(idx, i.quantity + 1)}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{formatGNF(i.unitPrice)}</TableCell>
                  <TableCell align="right">
                    <TextField size="small" type="number" value={i.discount || 0} onChange={e => {
                      const v = Number(e.target.value)
                      setCart(prev => prev.map((x, j) => j === idx ? { ...x, discount: v } : x))
                    }} inputProps={{ min: 0 }} sx={{ width: 100 }} />
                  </TableCell>
                  <TableCell align="right">{formatGNF(i.quantity * i.unitPrice - (i.discount || 0))}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" aria-label="Supprimer ligne" onClick={() => removeFromCart(i.productId)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Cart summary */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Stack spacing={0.5} sx={{ minWidth: 280 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Sous‑total</Typography>
                <Typography color="text.secondary">{formatGNF(total)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Remise globale</Typography>
                <Typography color="text.secondary">{formatGNF(Math.min(globalDiscount || 0, total))}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontWeight={700}>Total</Typography>
                <Typography fontWeight={700}>{formatGNF(totalAfterDiscount)}</Typography>
              </Box>
            </Stack>
          </Box>

          {/* Paiement & remise globale */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField select label="Paiement" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} sx={{ minWidth: 180 }}>
              <MenuItem value="cash">Espèces</MenuItem>
              <MenuItem value="mobile_money">Mobile Money</MenuItem>
              <MenuItem value="card">Carte</MenuItem>
            </TextField>
            <TextField label="Référence paiement (optionnel)" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} />
            <TextField label="Remise globale" type="number" value={globalDiscount} onChange={e => setGlobalDiscount(Number(e.target.value))} inputProps={{ min: 0 }} />
            <Box sx={{ flex: 1 }} />
            <Stack sx={{ textAlign: 'right' }}>
              {vatRate > 0 && (
                <>
                  <Typography variant="body2" color="text.secondary">HT: {formatGNF(totalExclVat)}</Typography>
                  <Typography variant="body2" color="text.secondary">TVA ({vatRate}%): {formatGNF(vatAmount)}</Typography>
                  <Typography variant="h6">TTC: {formatGNF(totalInclVat)} {currency}</Typography>
                </>
              )}
              {vatRate <= 0 && <Typography variant="h6">Total: {formatGNF(totalAfterDiscount)} {currency}</Typography>}
            </Stack>
            <Button variant="contained" onClick={submitSale} disabled={loading || cart.length === 0} disableElevation>
              {loading ? (<><CircularProgress size={18} sx={{ mr: 1 }} /> En cours…</>) : (t('pos.submit_sale') || 'Valider la vente')}
            </Button>
          </Stack>

          {/* Multi-payments section */}
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Typography variant="subtitle2">Paiements multiples (optionnels)</Typography>
            {(payments || []).map((p, idx) => (
              <Stack key={idx} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <TextField select label="Mode" value={p.method} onChange={e => setPayments(prev => prev.map((x, j) => j === idx ? { ...x, method: e.target.value as any } : x))} sx={{ minWidth: 160 }}>
                  <MenuItem value="cash">Espèces</MenuItem>
                  <MenuItem value="mobile_money">Mobile Money</MenuItem>
                  <MenuItem value="card">Carte</MenuItem>
                </TextField>
                <TextField label="Montant" type="number" value={p.amount} onChange={e => setPayments(prev => prev.map((x, j) => j === idx ? { ...x, amount: Number(e.target.value) } : x))} sx={{ minWidth: 160 }} />
                <TextField label="Référence" value={p.ref || ''} onChange={e => setPayments(prev => prev.map((x, j) => j === idx ? { ...x, ref: e.target.value } : x))} sx={{ minWidth: 200 }} />
                <Button color="error" onClick={() => setPayments(prev => prev.filter((_, j) => j !== idx))}>Supprimer</Button>
              </Stack>
            ))}
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => setPayments(prev => [...prev, { method: 'cash', amount: 0 }])}>Ajouter un paiement</Button>
              <Typography color="text.secondary">Somme paiements: {formatGNF((payments || []).reduce((s, p) => s + (p.amount || 0), 0))} / TTC: {formatGNF(totalInclVat)}</Typography>
            </Stack>
          </Stack>

          {message && (<ErrorBanner message={message} />)}

          {/* Held carts */}
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>Paniers en attente</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <TextField label="Nom du panier" value={heldName} onChange={e => setHeldName(e.target.value)} />
              <Button variant="outlined" disabled={cart.length === 0 || !heldName} onClick={() => {
                const id = 'held-' + Date.now()
                const payload = { id, name: heldName, createdAt: new Date().toISOString(), boutiqueId, items: cart }
                const raw = localStorage.getItem('afrigest_held_carts')
                const list = raw ? JSON.parse(raw) : []
                list.push(payload)
                localStorage.setItem('afrigest_held_carts', JSON.stringify(list))
                setHeldCarts(list)
                setHeldName('')
                setCart([])
                setMessage('Panier mis en attente')
              }}>Mettre en attente</Button>
            </Stack>
            <Stack spacing={1}>
              {(heldCarts || []).length === 0 ? (
                <Typography color="text.secondary">Aucun panier en attente.</Typography>
              ) : (
                heldCarts.map(h => (
                  <Box key={h.id} sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ flex: 1 }}>{h.name} • {new Date(h.createdAt).toLocaleString()} • {h.items.length} article(s)</Typography>
                    <Button size="small" onClick={() => {
                      setCart(h.items)
                      const rest = heldCarts.filter(x => x.id !== h.id)
                      setHeldCarts(rest)
                      localStorage.setItem('afrigest_held_carts', JSON.stringify(rest))
                    }}>Charger</Button>
                    <Button size="small" color="error" onClick={() => {
                      const rest = heldCarts.filter(x => x.id !== h.id)
                      setHeldCarts(rest)
                      localStorage.setItem('afrigest_held_carts', JSON.stringify(rest))
                    }}>Supprimer</Button>
                  </Box>
                ))
              )}
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <ReceiptModal open={receiptOpen} onClose={() => setReceiptOpen(false)} data={receiptData} />
      {/* Pending Queue Viewer */}
      <Dialog open={pendingOpen} onClose={() => setPendingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ventes en attente ({pending.length})</DialogTitle>
        <DialogContent dividers>
          {pending.length === 0 ? (
            <Typography color="text.secondary">Aucune vente en file.</Typography>
          ) : (
            <List dense>
              {pending.map((p: any) => (
                <ListItem key={p.offlineId} secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={async () => { try { await removePendingSale(p.offlineId) } finally { try { setPending(await getPendingSales()) } catch {} } }}>Supprimer</Button>
                  </Stack>
                }>
                  <ListItemText
                    primary={`OfflineID: ${p.offlineId}`}
                    secondary={`Articles: ${(p.items || []).length} • Boutique: ${p.boutiqueId || ''} • Montant estimé: ${(p.items || []).reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0)}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={async () => { setSyncing(true); try { await trySyncSales() } finally { setSyncing(false); try { setPending(await getPendingSales()) } catch {} } }} disabled={syncing}>Synchroniser</Button>
          <Button variant="contained" onClick={() => setPendingOpen(false)}>Fermer</Button>
        </DialogActions>
    </Page>
  )
}
